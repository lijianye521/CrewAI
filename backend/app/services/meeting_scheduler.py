from typing import Dict, Any, List, Optional, Tuple
import logging
from datetime import datetime, timedelta
import asyncio
import json
from sqlalchemy.orm import Session

from ..models.meeting import Meeting, MeetingParticipant
from ..models.message import MeetingMessage
from ..models.agent_config import AgentConfig
from ..agents.configurable_agent import ConfigurableAgent, MeetingAgentManager
from .deepseek_service import deepseek_service

logger = logging.getLogger(__name__)

class MeetingSpeakingScheduler:
    """
    会议发言调度器
    负责管理会议中Agent的发言顺序和时机
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.agent_manager = MeetingAgentManager()
        self.active_meetings: Dict[int, Dict[str, Any]] = {}
    
    async def initialize_meeting(self, meeting_id: int) -> bool:
        """
        初始化会议调度
        
        Args:
            meeting_id: 会议ID
            
        Returns:
            是否初始化成功
        """
        try:
            # 获取会议信息
            meeting = self.db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if not meeting:
                logger.error(f"Meeting {meeting_id} not found")
                return False
            
            # 获取参与者信息
            participants = self.db.query(MeetingParticipant).filter(
                MeetingParticipant.meeting_id == meeting_id
            ).all()
            
            if not participants:
                logger.error(f"No participants found for meeting {meeting_id}")
                return False
            
            # 初始化Agent管理器
            self.agent_manager.meeting_id = meeting_id
            
            for participant in participants:
                # 获取Agent配置
                agent_config = self.db.query(AgentConfig).filter(
                    AgentConfig.id == participant.agent_id
                ).first()
                
                if agent_config:
                    self.agent_manager.add_agent(agent_config, participant)
            
            # 初始化会议状态
            self.active_meetings[meeting_id] = {
                "meeting": meeting,
                "participants": participants,
                "current_round": 0,
                "current_speaker": None,
                "last_speakers": [],
                "discussion_context": meeting.discussion_config.get("discussion_topic", ""),
                "message_count": 0,
                "start_time": datetime.utcnow(),
                "is_active": True,
                "pause_requested": False
            }
            
            logger.info(f"Meeting {meeting_id} scheduler initialized with {len(participants)} participants")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize meeting {meeting_id}: {str(e)}")
            return False
    
    def get_next_speaker(self, meeting_id: int) -> Optional[Tuple[ConfigurableAgent, float]]:
        """
        获取下一个发言者
        
        Args:
            meeting_id: 会议ID
            
        Returns:
            (下一个发言的Agent, 发言权重分数) 或 None
        """
        if meeting_id not in self.active_meetings:
            logger.error(f"Meeting {meeting_id} not found in active meetings")
            return None
        
        meeting_state = self.active_meetings[meeting_id]
        meeting = meeting_state["meeting"]
        
        # 检查会议规则
        if not self._should_continue_meeting(meeting_id):
            return None
        
        # 获取当前讨论上下文
        current_context = self._build_current_context(meeting_id)
        
        # 获取最近发言者列表
        recent_speakers = meeting_state["last_speakers"][-5:]  # 最近5个发言者
        
        # 使用Agent管理器计算下一个发言者
        next_agent = self.agent_manager.calculate_next_speaker(
            current_context=current_context,
            recent_speakers=recent_speakers,
            meeting_rules=meeting.meeting_rules
        )
        
        if next_agent:
            # 计算发言权重分数
            score = next_agent.should_speak_now(
                current_context=current_context,
                recent_speakers=recent_speakers,
                meeting_rules=meeting.meeting_rules
            )
            
            logger.info(f"Next speaker for meeting {meeting_id}: {next_agent.config.name} (score: {score:.2f})")
            return next_agent, score
        
        return None
    
    async def process_speaking_turn(
        self, 
        meeting_id: int, 
        agent: ConfigurableAgent,
        force_speak: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        处理Agent发言轮次
        
        Args:
            meeting_id: 会议ID
            agent: 发言的Agent
            force_speak: 是否强制发言（忽略调度规则）
            
        Returns:
            发言结果字典或None
        """
        if meeting_id not in self.active_meetings:
            logger.error(f"Meeting {meeting_id} not found")
            return None
        
        meeting_state = self.active_meetings[meeting_id]
        
        # 检查是否暂停
        if meeting_state.get("pause_requested") and not force_speak:
            return None
        
        try:
            # 构建对话上下文
            context = self._build_current_context(meeting_id)
            meeting_context = self._build_meeting_context(meeting_id)
            conversation_history = self._get_recent_messages(meeting_id, limit=100)
            
            # 更新当前发言者
            meeting_state["current_speaker"] = agent.config.id
            
            # 生成Agent响应
            response = await agent.generate_response(
                context=context,
                meeting_context=meeting_context,
                conversation_history=conversation_history
            )
            
            # 保存消息到数据库
            message = MeetingMessage(
                meeting_id=meeting_id,
                agent_id=agent.config.id,
                message_content=response["content"],
                message_type="response",
                message_metadata=response.get("metadata", {})
            )
            
            self.db.add(message)
            self.db.commit()
            
            # 更新会议状态
            meeting_state["last_speakers"].append(agent.config.id)
            meeting_state["message_count"] += 1
            meeting_state["current_speaker"] = None
            
            # 限制最近发言者列表长度
            if len(meeting_state["last_speakers"]) > 10:
                meeting_state["last_speakers"] = meeting_state["last_speakers"][-10:]
            
            # 检查是否需要进行轮次总结
            if self._should_summarize_round(meeting_id):
                await self._generate_round_summary(meeting_id)
                meeting_state["current_round"] += 1
            
            logger.info(f"Agent {agent.config.name} spoke in meeting {meeting_id}")
            
            return {
                "agent_id": agent.config.id,
                "agent_name": agent.config.name,
                "content": response["content"],
                "metadata": response.get("metadata", {}),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to process speaking turn for agent {agent.config.name}: {str(e)}")
            meeting_state["current_speaker"] = None
            return None
    
    async def run_meeting_cycle(self, meeting_id: int, max_iterations: int = 50) -> bool:
        """
        运行会议循环
        
        Args:
            meeting_id: 会议ID
            max_iterations: 最大迭代次数
            
        Returns:
            是否成功完成
        """
        if meeting_id not in self.active_meetings:
            logger.error(f"Meeting {meeting_id} not initialized")
            return False
        
        meeting_state = self.active_meetings[meeting_id]
        iteration_count = 0
        
        logger.info(f"Starting meeting cycle for meeting {meeting_id}")
        
        try:
            while iteration_count < max_iterations and meeting_state.get("is_active"):
                # 检查是否暂停
                if meeting_state.get("pause_requested"):
                    logger.info(f"Meeting {meeting_id} paused")
                    break
                
                # 检查会议是否应该继续
                if not self._should_continue_meeting(meeting_id):
                    logger.info(f"Meeting {meeting_id} should end based on rules")
                    break
                
                # 获取下一个发言者
                next_speaker_info = self.get_next_speaker(meeting_id)
                if not next_speaker_info:
                    logger.info(f"No next speaker available for meeting {meeting_id}")
                    break
                
                next_agent, score = next_speaker_info
                
                # 如果得分太低，可能需要等待或结束会议
                if score < 0.1:
                    logger.info(f"Speaker score too low ({score:.2f}), ending meeting")
                    break
                
                # 处理发言
                speaking_result = await self.process_speaking_turn(meeting_id, next_agent)
                if not speaking_result:
                    logger.warning(f"Failed to process speaking turn for {next_agent.config.name}")
                    continue
                
                iteration_count += 1
                
                # 添加短暂延迟以避免过于频繁的消息
                await asyncio.sleep(1)
            
            # 生成会议总结
            if meeting_state["message_count"] > 0:
                await self._generate_meeting_summary(meeting_id)
            
            logger.info(f"Meeting {meeting_id} cycle completed after {iteration_count} iterations")
            return True
            
        except Exception as e:
            logger.error(f"Error in meeting cycle for meeting {meeting_id}: {str(e)}")
            return False
    
    def pause_meeting(self, meeting_id: int) -> bool:
        """暂停会议"""
        if meeting_id in self.active_meetings:
            self.active_meetings[meeting_id]["pause_requested"] = True
            logger.info(f"Meeting {meeting_id} pause requested")
            return True
        return False
    
    def resume_meeting(self, meeting_id: int) -> bool:
        """恢复会议"""
        if meeting_id in self.active_meetings:
            self.active_meetings[meeting_id]["pause_requested"] = False
            logger.info(f"Meeting {meeting_id} resumed")
            return True
        return False
    
    def stop_meeting(self, meeting_id: int) -> bool:
        """停止会议"""
        if meeting_id in self.active_meetings:
            self.active_meetings[meeting_id]["is_active"] = False
            logger.info(f"Meeting {meeting_id} stopped")
            return True
        return False
    
    def get_meeting_statistics(self, meeting_id: int) -> Dict[str, Any]:
        """获取会议统计信息"""
        if meeting_id not in self.active_meetings:
            return {}
        
        meeting_state = self.active_meetings[meeting_id]
        stats = self.agent_manager.get_meeting_statistics()
        
        # 添加调度器统计信息
        stats.update({
            "current_round": meeting_state.get("current_round", 0),
            "total_messages": meeting_state.get("message_count", 0),
            "duration_minutes": (datetime.utcnow() - meeting_state["start_time"]).total_seconds() / 60,
            "is_active": meeting_state.get("is_active", False),
            "is_paused": meeting_state.get("pause_requested", False)
        })
        
        return stats
    
    def _should_continue_meeting(self, meeting_id: int) -> bool:
        """检查会议是否应该继续"""
        if meeting_id not in self.active_meetings:
            return False
        
        meeting_state = self.active_meetings[meeting_id]
        meeting = meeting_state["meeting"]
        
        # 检查时间限制
        if meeting.duration_limit:
            elapsed = (datetime.utcnow() - meeting_state["start_time"]).total_seconds() / 60
            if elapsed >= meeting.duration_limit:
                return False
        
        # 检查轮次限制
        max_rounds = meeting.meeting_rules.get("discussion_rounds")
        if max_rounds and meeting_state["current_round"] >= max_rounds:
            return False
        
        # 检查消息数量限制
        max_messages = meeting.meeting_rules.get("max_messages", 1000)
        if meeting_state["message_count"] >= max_messages:
            return False
        
        return True
    
    def _build_current_context(self, meeting_id: int) -> str:
        """构建当前讨论上下文"""
        if meeting_id not in self.active_meetings:
            return ""
        
        meeting_state = self.active_meetings[meeting_id]
        meeting = meeting_state["meeting"]
        
        # 获取最近的消息
        recent_messages = self._get_recent_messages(meeting_id, limit=5)
        
        context_parts = [
            f"会议主题: {meeting.topic}",
            f"讨论话题: {meeting.discussion_config.get('discussion_topic', '')}",
        ]
        
        if meeting.discussion_config.get("context_description"):
            context_parts.append(f"背景信息: {meeting.discussion_config['context_description']}")
        
        if recent_messages:
            context_parts.append("最近的讨论:")
            for msg in recent_messages[-3:]:  # 最近3条消息
                context_parts.append(f"{msg['agent_name']}: {msg['content'][:100]}...")
        
        return "\n".join(context_parts)
    
    def _build_meeting_context(self, meeting_id: int) -> Dict[str, Any]:
        """构建会议上下文信息"""
        if meeting_id not in self.active_meetings:
            return {}
        
        meeting_state = self.active_meetings[meeting_id]
        meeting = meeting_state["meeting"]
        
        return {
            "meeting_id": meeting_id,
            "meeting_title": meeting.title,
            "meeting_topic": meeting.topic,
            "current_round": meeting_state["current_round"],
            "message_count": meeting_state["message_count"],
            "participants_count": len(meeting_state["participants"]),
            "discussion_style": meeting.discussion_config.get("discussion_style", "open"),
            "expected_outcomes": meeting.discussion_config.get("expected_outcomes", [])
        }
    
    def _get_recent_messages(self, meeting_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        """获取最近的消息"""
        messages = self.db.query(MeetingMessage).filter(
            MeetingMessage.meeting_id == meeting_id
        ).order_by(MeetingMessage.created_at.desc()).limit(limit).all()
        
        return [
            {
                "agent_name": msg.agent_name,
                "content": msg.content,
                "message_type": msg.message_type,
                "created_at": msg.created_at.isoformat()
            }
            for msg in reversed(messages)
        ]
    
    def _should_summarize_round(self, meeting_id: int) -> bool:
        """检查是否应该进行轮次总结"""
        if meeting_id not in self.active_meetings:
            return False
        
        meeting_state = self.active_meetings[meeting_id]
        
        # 每5条消息或每个Agent都发言一次后总结
        messages_per_round = len(meeting_state["participants"])
        return meeting_state["message_count"] % max(messages_per_round, 5) == 0
    
    async def _generate_round_summary(self, meeting_id: int):
        """生成轮次总结"""
        try:
            recent_messages = self._get_recent_messages(meeting_id, limit=100)
            if not recent_messages:
                return
            
            # 构建总结请求
            context = f"请总结以下会议讨论的要点:\n\n"
            for msg in recent_messages:
                context += f"{msg['agent_name']}: {msg['content']}\n"
            
            # 使用DeepSeek生成总结
            response = await deepseek_service.chat_completion(
                messages=[{"role": "user", "content": context}],
                max_tokens=300,
                temperature=0.5
            )
            
            if response and response.get("choices"):
                summary_content = response["choices"][0]["message"]["content"]
                
                # 保存总结消息
                summary_message = MeetingMessage(
                    meeting_id=meeting_id,
                    agent_id=None,
                    message_content=f"轮次总结: {summary_content}",
                    message_type="summary",
                    message_metadata={"round": self.active_meetings[meeting_id]["current_round"]}
                )
                
                self.db.add(summary_message)
                self.db.commit()
                
                logger.info(f"Generated round summary for meeting {meeting_id}")
        
        except Exception as e:
            logger.error(f"Failed to generate round summary: {str(e)}")
    
    async def _generate_meeting_summary(self, meeting_id: int):
        """生成会议总结"""
        try:
            all_messages = self._get_recent_messages(meeting_id, limit=100)
            if not all_messages:
                return
            
            meeting_state = self.active_meetings[meeting_id]
            meeting = meeting_state["meeting"]
            
            # 构建总结请求
            context = f"请为以下会议生成总结报告:\n\n"
            context += f"会议主题: {meeting.topic}\n"
            context += f"讨论内容:\n\n"
            
            for msg in all_messages:
                if msg["message_type"] != "system":
                    context += f"{msg['agent_name']}: {msg['content']}\n"
            
            context += "\n请总结讨论的主要观点、达成的共识和待解决的问题。"
            
            # 使用DeepSeek生成总结
            response = await deepseek_service.chat_completion(
                messages=[{"role": "user", "content": context}],
                max_tokens=800,
                temperature=0.3
            )
            
            if response and response.get("choices"):
                summary_content = response["choices"][0]["message"]["content"]
                
                # 保存会议总结
                summary_message = MeetingMessage(
                    meeting_id=meeting_id,
                    agent_id=None,
                    message_content=f"会议总结: {summary_content}",
                    message_type="meeting_summary",
                    message_metadata={
                        "total_messages": meeting_state["message_count"],
                        "duration_minutes": (datetime.utcnow() - meeting_state["start_time"]).total_seconds() / 60,
                        "participants": len(meeting_state["participants"])
                    }
                )
                
                self.db.add(summary_message)
                self.db.commit()
                
                logger.info(f"Generated meeting summary for meeting {meeting_id}")
        
        except Exception as e:
            logger.error(f"Failed to generate meeting summary: {str(e)}")

# 全局调度器实例
_meeting_scheduler: Optional[MeetingSpeakingScheduler] = None

def get_meeting_scheduler(db: Session) -> MeetingSpeakingScheduler:
    """获取会议调度器实例"""
    global _meeting_scheduler
    if _meeting_scheduler is None:
        _meeting_scheduler = MeetingSpeakingScheduler(db)
    else:
        _meeting_scheduler.db = db  # 更新数据库会话
    return _meeting_scheduler