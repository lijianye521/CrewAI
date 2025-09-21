from sqlalchemy.orm import Session, joinedload
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import asyncio

from ..models.meeting import Meeting, MeetingParticipant, MeetingStatus
from ..models.message import MeetingMessage, MessageType, MessageStatus, MeetingAnalytics
from ..models.agent_config import AgentConfig
from .deepseek_service import deepseek_service
from .agent_service import AgentService

logger = logging.getLogger(__name__)

class MeetingService:
    """
    会议管理服务
    处理会议的创建、管理和运行逻辑
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.agent_service = AgentService(db)
    
    async def create_meeting(
        self,
        meeting_data: Dict[str, Any],
        created_by: str = "system"
    ) -> Meeting:
        """
        创建新会议
        
        Args:
            meeting_data: 会议配置数据
            created_by: 创建者标识
            
        Returns:
            创建的会议对象
        """
        try:
            # 验证必填字段
            required_fields = ["title", "topic"]
            for field in required_fields:
                if not meeting_data.get(field):
                    raise ValueError(f"Missing required field: {field}")
            
            # 设置默认值
            meeting_data.setdefault("meeting_rules", Meeting.get_default_meeting_rules())
            meeting_data.setdefault("discussion_config", Meeting.get_default_discussion_config())
            meeting_data.setdefault("status", MeetingStatus.DRAFT)
            
            # 处理字段名称兼容
            scheduled_start = meeting_data.get("scheduled_start_time") or meeting_data.get("scheduled_start")
            
            # 创建会议对象
            meeting = Meeting(
                title=meeting_data["title"],
                description=meeting_data.get("description"),
                topic=meeting_data["topic"],
                status=meeting_data["status"],
                scheduled_start=scheduled_start,
                duration_limit=meeting_data.get("duration_limit"),
                meeting_rules=meeting_data["meeting_rules"],
                discussion_config=meeting_data["discussion_config"],
                created_by=created_by
            )
            
            self.db.add(meeting)
            self.db.commit()
            self.db.refresh(meeting)
            
            # 如果提供了参与者列表，添加参与者
            participant_agents = meeting_data.get("participant_agents", [])
            if participant_agents:
                for agent_id in participant_agents:
                    participant_data = {
                        "agent_id": agent_id,
                        "role_in_meeting": "participant",
                        "speaking_priority": 1.0
                    }
                    await self.add_participant(meeting.id, participant_data)
            
            logger.info(f"Created meeting: {meeting.title} (ID: {meeting.id})")
            return meeting
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create meeting: {str(e)}")
            raise
    
    def get_meeting_by_id(self, meeting_id: int) -> Optional[Meeting]:
        """根据ID获取会议"""
        return self.db.query(Meeting).filter(Meeting.id == meeting_id).first()
    
    def get_meetings(
        self, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[Meeting]:
        """获取会议列表"""
        query = self.db.query(Meeting)
        
        if status:
            query = query.filter(Meeting.status == status)
        
        return query.order_by(Meeting.created_at.desc()).offset(skip).limit(limit).all()
    
    async def update_meeting(
        self,
        meeting_id: int,
        update_data: Dict[str, Any]
    ) -> Optional[Meeting]:
        """更新会议信息"""
        try:
            meeting = self.get_meeting_by_id(meeting_id)
            if not meeting:
                return None
            
            # 更新允许的字段
            updatable_fields = [
                "title", "description", "topic", "scheduled_start",
                "duration_limit", "meeting_rules", "discussion_config",
                "summary", "conclusions", "action_items"
            ]
            
            for field in updatable_fields:
                if field in update_data:
                    setattr(meeting, field, update_data[field])
            
            meeting.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(meeting)
            
            logger.info(f"Updated meeting: {meeting.title} (ID: {meeting.id})")
            return meeting
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update meeting {meeting_id}: {str(e)}")
            raise
    
    def delete_meeting(self, meeting_id: int) -> bool:
        """删除会议"""
        try:
            meeting = self.get_meeting_by_id(meeting_id)
            if not meeting:
                return False
            
            # 删除相关数据
            self.db.query(MeetingMessage).filter(MeetingMessage.meeting_id == meeting_id).delete()
            self.db.query(MeetingParticipant).filter(MeetingParticipant.meeting_id == meeting_id).delete()
            self.db.query(MeetingAnalytics).filter(MeetingAnalytics.meeting_id == meeting_id).delete()
            
            # 删除会议
            self.db.delete(meeting)
            self.db.commit()
            
            logger.info(f"Deleted meeting: {meeting_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete meeting {meeting_id}: {str(e)}")
            raise
    
    def count_meetings(self, status: Optional[str] = None) -> int:
        """统计会议数量"""
        query = self.db.query(Meeting)
        if status:
            query = query.filter(Meeting.status == status)
        return query.count()
    
    def count_participants(self, meeting_id: int) -> int:
        """统计会议参与者数量"""
        return self.db.query(MeetingParticipant).filter(
            MeetingParticipant.meeting_id == meeting_id
        ).count()
    
    def count_messages(self, meeting_id: int) -> int:
        """统计会议消息数量"""
        return self.db.query(MeetingMessage).filter(
            MeetingMessage.meeting_id == meeting_id
        ).count()
    
    async def update_meeting_status(self, meeting_id: int, new_status: str) -> Optional[Meeting]:
        """更新会议状态"""
        try:
            meeting = self.get_meeting_by_id(meeting_id)
            if not meeting:
                return None
            
            meeting.status = new_status
            meeting.updated_at = datetime.utcnow()
            
            # 如果状态变为active，记录实际开始时间
            if new_status == MeetingStatus.ACTIVE and not meeting.actual_start:
                meeting.actual_start = datetime.utcnow()
            
            # 如果状态变为completed，记录结束时间
            if new_status == MeetingStatus.COMPLETED and not meeting.actual_end:
                meeting.actual_end = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(meeting)
            
            logger.info(f"Updated meeting status: {meeting.title} (ID: {meeting.id}) -> {new_status}")
            return meeting
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update meeting status {meeting_id}: {str(e)}")
            raise
    
    async def add_participant(
        self,
        meeting_id: int,
        participant_data: Dict[str, Any]
    ) -> MeetingParticipant:
        """添加会议参与者"""
        try:
            # 验证会议存在
            meeting = self.get_meeting_by_id(meeting_id)
            if not meeting:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            # 验证Agent存在
            agent_id = participant_data["agent_id"]
            agent = self.agent_service.get_agent_by_id(agent_id)
            if not agent:
                raise ValueError(f"Agent {agent_id} not found")
            
            # 检查是否已经参与
            existing = self.db.query(MeetingParticipant).filter(
                MeetingParticipant.meeting_id == meeting_id,
                MeetingParticipant.agent_id == agent_id
            ).first()
            
            if existing:
                raise ValueError(f"Agent {agent_id} already participating in meeting {meeting_id}")
            
            # 设置默认值
            participant_data.setdefault("participant_settings", MeetingParticipant.get_default_participant_settings())
            
            # 创建参与者记录
            participant = MeetingParticipant(
                meeting_id=meeting_id,
                agent_id=agent_id,
                role_in_meeting=participant_data["role_in_meeting"],
                speaking_priority=participant_data.get("speaking_priority", 1.0),
                participant_settings=participant_data["participant_settings"]
            )
            
            self.db.add(participant)
            self.db.commit()
            self.db.refresh(participant)
            
            logger.info(f"Added participant {agent_id} to meeting {meeting_id}")
            return participant
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to add participant: {str(e)}")
            raise
    
    def get_meeting_participants(self, meeting_id: int) -> List[MeetingParticipant]:
        """获取会议参与者列表"""
        return self.db.query(MeetingParticipant).filter(
            MeetingParticipant.meeting_id == meeting_id,
            MeetingParticipant.is_active == True
        ).all()
    
    def remove_participant(self, meeting_id: int, participant_id: int) -> bool:
        """移除会议参与者"""
        try:
            participant = self.db.query(MeetingParticipant).filter(
                MeetingParticipant.meeting_id == meeting_id,
                MeetingParticipant.id == participant_id
            ).first()
            
            if not participant:
                return False
            
            participant.is_active = False
            self.db.commit()
            
            logger.info(f"Removed participant {participant_id} from meeting {meeting_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to remove participant: {str(e)}")
            raise
    
    async def start_meeting(self, meeting_id: int) -> Optional[Meeting]:
        """启动会议"""
        try:
            meeting = self.get_meeting_by_id(meeting_id)
            if not meeting:
                return None
            
            if meeting.status != MeetingStatus.DRAFT and meeting.status != MeetingStatus.SCHEDULED:
                raise ValueError(f"Meeting {meeting_id} cannot be started (status: {meeting.status})")
            
            # 检查是否有参与者
            participants = self.get_meeting_participants(meeting_id)
            if not participants:
                raise ValueError(f"Meeting {meeting_id} has no participants")
            
            # 更新会议状态
            meeting.status = MeetingStatus.ACTIVE
            meeting.actual_start = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(meeting)
            
            logger.info(f"Started meeting: {meeting.title} (ID: {meeting.id})")
            return meeting
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to start meeting {meeting_id}: {str(e)}")
            raise
    
    async def stop_meeting(self, meeting_id: int) -> Optional[Meeting]:
        """结束会议"""
        try:
            meeting = self.get_meeting_by_id(meeting_id)
            if not meeting:
                return None
            
            if meeting.status not in [MeetingStatus.ACTIVE, MeetingStatus.PAUSED]:
                raise ValueError(f"Meeting {meeting_id} is not in progress")
            
            # 更新会议状态
            meeting.status = MeetingStatus.COMPLETED
            meeting.actual_end = datetime.utcnow()
            
            # 生成会议总结 (异步任务)
            asyncio.create_task(self._generate_meeting_summary(meeting_id))
            
            self.db.commit()
            self.db.refresh(meeting)
            
            logger.info(f"Stopped meeting: {meeting.title} (ID: {meeting.id})")
            return meeting
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to stop meeting {meeting_id}: {str(e)}")
            raise
    
    async def generate_agent_message(
        self,
        meeting_id: int,
        agent_id: int,
        context: str,
        message_type: MessageType = MessageType.SPEECH
    ) -> Dict[str, Any]:
        """生成Agent消息"""
        try:
            # 获取Agent配置
            agent = self.agent_service.get_agent_by_id(agent_id)
            if not agent:
                raise ValueError(f"Agent {agent_id} not found")
            
            # 获取会议上下文
            meeting = self.get_meeting_by_id(meeting_id)
            if not meeting:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            # 获取对话历史
            recent_messages = self.get_meeting_messages(meeting_id, limit=10)
            conversation_history = []
            for msg in recent_messages:
                msg_agent = self.agent_service.get_agent_by_id(msg.agent_id)
                role = "assistant" if msg.agent_id == agent_id else "user"
                conversation_history.append({
                    "role": role,
                    "content": f"{msg_agent.name if msg_agent else 'Unknown'}: {msg.message_content}"
                })
            
            # 构建会议上下文
            meeting_context = {
                "topic": meeting.topic,
                "meeting_rules": meeting.meeting_rules,
                "discussion_config": meeting.discussion_config,
                "participants_count": len(self.get_meeting_participants(meeting_id))
            }
            
            # 生成Agent响应
            response = await deepseek_service.generate_agent_response(
                context=context,
                agent_config=agent.to_dict(),
                conversation_history=conversation_history,
                meeting_context=meeting_context
            )
            
            # 保存消息到数据库
            message = MeetingMessage(
                meeting_id=meeting_id,
                agent_id=agent_id,
                message_content=response["content"],
                message_type=message_type,
                status=MessageStatus.SENT,
                metadata=response["metadata"],
                sent_at=datetime.utcnow(),
                speaking_started_at=datetime.utcnow()
            )
            
            self.db.add(message)
            self.db.commit()
            self.db.refresh(message)
            
            # 更新参与者统计
            self._update_participant_stats(meeting_id, agent_id, message)
            
            return {
                "message_id": message.id,
                "agent_id": agent_id,
                "agent_name": agent.name,
                "content": response["content"],
                "message_type": message_type,
                "metadata": response["metadata"],
                "timestamp": message.sent_at.isoformat() if message.sent_at else None
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to generate agent message: {str(e)}")
            raise
    
    def get_meeting_messages(
        self,
        meeting_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[MeetingMessage]:
        """获取会议消息列表"""
        return self.db.query(MeetingMessage).filter(
            MeetingMessage.meeting_id == meeting_id
        ).order_by(MeetingMessage.created_at.desc()).offset(skip).limit(limit).all()
    
    async def get_next_speaker(self, meeting_id: int) -> Optional[Dict[str, Any]]:
        """获取下一个发言者 (智能调度)"""
        try:
            # 获取会议参与者
            participants = self.get_meeting_participants(meeting_id)
            if not participants:
                return None
            
            # 获取最近的消息统计
            recent_messages = self.get_meeting_messages(meeting_id, limit=20)
            
            # 计算发言优先级
            speaker_scores = {}
            for participant in participants:
                agent = self.agent_service.get_agent_by_id(participant.agent_id)
                if not agent:
                    continue
                
                # 基础优先级
                score = participant.speaking_priority
                
                # 根据最近发言频率调整
                recent_count = sum(1 for msg in recent_messages if msg.agent_id == participant.agent_id)
                score *= (1.0 - recent_count * 0.1)  # 最近发言多的降低优先级
                
                # 根据Agent行为设置调整
                behavior = agent.behavior_settings
                if behavior.get("speaking_frequency") == "high":
                    score *= 1.2
                elif behavior.get("speaking_frequency") == "low":
                    score *= 0.8
                
                speaker_scores[participant.agent_id] = {
                    "score": score,
                    "agent": agent,
                    "participant": participant
                }
            
            # 选择得分最高的发言者
            if speaker_scores:
                best_speaker = max(speaker_scores.values(), key=lambda x: x["score"])
                return {
                    "agent_id": best_speaker["agent"].id,
                    "agent_name": best_speaker["agent"].name,
                    "role": best_speaker["participant"].role_in_meeting,
                    "priority_score": best_speaker["score"]
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get next speaker for meeting {meeting_id}: {str(e)}")
            return None
    
    def get_meeting_replay(self, meeting_id: int) -> Optional[Dict[str, Any]]:
        """获取会议回放数据"""
        try:
            meeting = self.get_meeting_by_id(meeting_id)
            if not meeting:
                return None
            
            # 获取所有消息
            messages = self.db.query(MeetingMessage).filter(
                MeetingMessage.meeting_id == meeting_id
            ).order_by(MeetingMessage.created_at.asc()).all()
            
            # 获取参与者信息
            participants = self.get_meeting_participants(meeting_id)
            participant_map = {}
            for p in participants:
                agent = self.agent_service.get_agent_by_id(p.agent_id)
                if agent:
                    participant_map[p.agent_id] = {
                        "name": agent.name,
                        "role": p.role_in_meeting,
                        "avatar_url": agent.avatar_url
                    }
            
            # 构建回放数据
            replay_events = []
            for msg in messages:
                event = {
                    "type": "message",
                    "timestamp": msg.created_at.isoformat() if msg.created_at else None,
                    "agent_id": msg.agent_id,
                    "agent_info": participant_map.get(msg.agent_id, {}),
                    "content": msg.message_content,
                    "message_type": msg.message_type,
                    "metadata": msg.message_metadata or {}
                }
                replay_events.append(event)
            
            # Safe meeting serialization to avoid circular references
            safe_meeting = {
                "id": meeting.id,
                "title": meeting.title,
                "description": meeting.description,
                "status": meeting.status,
                "topic": meeting.topic,
                "meeting_rules": meeting.meeting_rules,
                "discussion_config": meeting.discussion_config,
                "scheduled_start": meeting.scheduled_start.isoformat() if hasattr(meeting, 'scheduled_start') and meeting.scheduled_start else None,
                "actual_start": meeting.actual_start.isoformat() if hasattr(meeting, 'actual_start') and meeting.actual_start else None,
                "actual_end": meeting.actual_end.isoformat() if hasattr(meeting, 'actual_end') and meeting.actual_end else None,
                "created_at": meeting.created_at.isoformat() if meeting.created_at else None,
                "updated_at": meeting.updated_at.isoformat() if meeting.updated_at else None
            }

            return {
                "meeting": safe_meeting,
                "participants": participant_map,
                "timeline": replay_events,  # For test compatibility
                "events": replay_events,    # Original structure
                "messages": replay_events,  # Also for test compatibility
                "duration": self._calculate_meeting_duration(meeting),
                "statistics": {
                    "total_messages": len(messages),
                    "unique_speakers": len(set(msg.agent_id for msg in messages))
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get meeting replay for {meeting_id}: {str(e)}")
            return None
    
    def get_meeting_analytics(self, meeting_id: int) -> Dict[str, Any]:
        """获取会议分析数据"""
        try:
            # 检查是否已有缓存的分析数据
            analytics = self.db.query(MeetingAnalytics).filter(
                MeetingAnalytics.meeting_id == meeting_id
            ).first()
            
            if analytics:
                return analytics.to_dict()
            
            # 实时计算基础分析
            messages = self.get_meeting_messages(meeting_id)
            participants = self.get_meeting_participants(meeting_id)
            
            # 参与度统计
            participation_stats = self._calculate_participation_stats(messages, participants)
            
            # 基础分析数据
            basic_analytics = {
                "meeting_id": meeting_id,
                "participation_stats": participation_stats,
                "topic_analysis": None,  # TODO: 实现话题分析
                "sentiment_analysis": None,  # TODO: 实现情感分析
                "efficiency_metrics": None,  # TODO: 实现效率指标
                "generated_at": datetime.utcnow().isoformat()
            }
            
            return basic_analytics
            
        except Exception as e:
            logger.error(f"Failed to get meeting analytics for {meeting_id}: {str(e)}")
            return {}
    
    def _update_participant_stats(self, meeting_id: int, agent_id: int, message: MeetingMessage):
        """更新参与者统计信息"""
        try:
            participant = self.db.query(MeetingParticipant).filter(
                MeetingParticipant.meeting_id == meeting_id,
                MeetingParticipant.agent_id == agent_id
            ).first()
            
            if participant:
                participant.total_messages += 1
                participant.last_spoke_at = message.sent_at
                
                # 如果有发言时长信息，更新总时长
                if message.speaking_duration:
                    participant.total_speaking_time += message.speaking_duration
                
                self.db.commit()
                
        except Exception as e:
            logger.error(f"Failed to update participant stats: {str(e)}")
    
    async def _generate_meeting_summary(self, meeting_id: int):
        """生成会议总结 (后台异步任务)"""
        try:
            meeting = self.get_meeting_by_id(meeting_id)
            if not meeting:
                return
            
            messages = self.get_meeting_messages(meeting_id)
            if not messages:
                return
            
            # 构建总结上下文
            discussion_content = "\n".join([
                f"{msg.agent_id}: {msg.message_content}" 
                for msg in reversed(messages)  # 时间顺序
            ])
            
            # 使用AI生成总结
            summary_context = f"""
            请基于以下会议讨论内容生成总结:
            
            会议主题: {meeting.topic}
            讨论内容:
            {discussion_content}
            
            请提供:
            1. 会议总结
            2. 主要结论
            3. 行动项
            """
            
            # 这里可以调用AI服务生成总结
            # summary_response = await deepseek_service.generate_agent_response(...)
            
            # 暂时使用简单总结
            meeting.summary = f"会议讨论了{meeting.topic}，共有{len(messages)}条发言。"
            meeting.conclusions = ["需要进一步讨论", "待确定具体方案"]
            meeting.action_items = ["跟进相关事项", "准备下次会议"]
            
            self.db.commit()
            logger.info(f"Generated summary for meeting {meeting_id}")
            
        except Exception as e:
            logger.error(f"Failed to generate meeting summary for {meeting_id}: {str(e)}")
    
    def _calculate_meeting_duration(self, meeting: Meeting) -> Optional[int]:
        """计算会议时长 (秒)"""
        if meeting.actual_start and meeting.actual_end:
            delta = meeting.actual_end - meeting.actual_start
            return int(delta.total_seconds())
        return None
    
    def _calculate_participation_stats(
        self, 
        messages: List[MeetingMessage], 
        participants: List[MeetingParticipant]
    ) -> Dict[str, Any]:
        """计算参与度统计"""
        total_messages = len(messages)
        if total_messages == 0:
            return {}
        
        # 按Agent统计发言次数
        agent_message_counts = {}
        for msg in messages:
            agent_message_counts[msg.agent_id] = agent_message_counts.get(msg.agent_id, 0) + 1
        
        # 计算平均发言长度
        total_length = sum(len(msg.message_content) for msg in messages)
        avg_message_length = total_length // total_messages if total_messages > 0 else 0
        
        return {
            "total_messages": total_messages,
            "unique_speakers": len(agent_message_counts),
            "average_message_length": avg_message_length,
            "speaker_distribution": agent_message_counts,
            "most_active_speaker": max(agent_message_counts, key=agent_message_counts.get) if agent_message_counts else None
        }