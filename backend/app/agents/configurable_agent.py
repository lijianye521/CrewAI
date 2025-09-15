from crewai import Agent, Task, Crew
from typing import Dict, Any, List, Optional, Callable
import logging
from datetime import datetime

from ..models.agent_config import AgentConfig
from ..models.meeting import Meeting, MeetingParticipant
from ..services.deepseek_service import deepseek_service

logger = logging.getLogger(__name__)

class ConfigurableAgent:
    """
    可配置智能体
    基于数据库配置动态创建个性化的CrewAI Agent
    """
    
    def __init__(self, agent_config: AgentConfig, participant_config: Optional[MeetingParticipant] = None):
        self.config = agent_config
        self.participant_config = participant_config
        self.agent = self._create_crewai_agent()
        self.conversation_history = []
        self.response_count = 0
        self.last_response_time = None
        
    def _create_crewai_agent(self) -> Agent:
        """基于配置创建CrewAI Agent"""
        
        # 构建个性化的backstory
        enhanced_backstory = self._build_enhanced_backstory()
        
        # 创建Agent
        agent = Agent(
            role=self.config.role,
            goal=self.config.goal,
            backstory=enhanced_backstory,
            verbose=True,
            allow_delegation=self._should_allow_delegation(),
            max_iter=self._get_max_iterations(),
            memory=True,  # 启用记忆功能
            tools=self._get_agent_tools()
        )
        
        return agent
    
    def _build_enhanced_backstory(self) -> str:
        """构建增强的背景故事"""
        backstory_parts = [
            self.config.backstory,
            "",
            "个性特征:",
        ]
        
        # 添加个性特征
        for trait, value in self.config.personality_traits.items():
            backstory_parts.append(f"- {trait}: {value}")
        
        backstory_parts.append("")
        backstory_parts.append("说话风格:")
        
        # 添加说话风格
        for style, value in self.config.speaking_style.items():
            backstory_parts.append(f"- {style}: {value}")
        
        backstory_parts.append("")
        backstory_parts.append("行为倾向:")
        
        # 添加行为设置
        for behavior, value in self.config.behavior_settings.items():
            backstory_parts.append(f"- {behavior}: {value}")
        
        # 如果有专业领域，添加专业领域信息
        if self.config.expertise_areas:
            backstory_parts.append("")
            backstory_parts.append(f"专业领域: {', '.join(self.config.expertise_areas)}")
        
        # 如果有会议中的角色配置，添加角色信息
        if self.participant_config:
            backstory_parts.append("")
            backstory_parts.append(f"在本次会议中担任: {self.participant_config.role_in_meeting}")
            backstory_parts.append(f"发言优先级: {self.participant_config.speaking_priority}")
        
        return "\n".join(backstory_parts)
    
    def _should_allow_delegation(self) -> bool:
        """根据配置决定是否允许委派"""
        behavior = self.config.behavior_settings
        collaboration_style = self.config.personality_traits.get("collaboration_style", "")
        
        # 如果是协调合作型，允许委派
        if "协调" in collaboration_style or "合作" in collaboration_style:
            return True
        
        # 如果主动性很高，允许委派
        if behavior.get("initiative_level") == "high":
            return True
            
        return False
    
    def _get_max_iterations(self) -> int:
        """根据配置获取最大迭代次数"""
        behavior = self.config.behavior_settings
        detail_preference = behavior.get("detail_preference", "balanced")
        
        if detail_preference == "comprehensive":
            return 3  # 更多迭代，更详细的分析
        elif detail_preference == "concise":
            return 1  # 简洁回答
        else:
            return 2  # 平衡
    
    def _get_agent_tools(self) -> List:
        """根据Agent配置获取工具列表"""
        # 这里可以根据Agent的专业领域配置不同的工具
        tools = []
        
        # 基于专业领域添加工具
        if self.config.expertise_areas:
            for area in self.config.expertise_areas:
                if area in ["财务分析", "数据分析"]:
                    # 可以添加财务分析工具
                    pass
                elif area in ["技术架构", "系统设计"]:
                    # 可以添加技术工具
                    pass
        
        return tools
    
    async def generate_response(
        self,
        context: str,
        meeting_context: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        生成个性化响应
        
        Args:
            context: 当前讨论上下文
            meeting_context: 会议上下文信息
            conversation_history: 对话历史
            
        Returns:
            生成的响应和元数据
        """
        try:
            # 更新内部对话历史
            if conversation_history:
                self.conversation_history = conversation_history[-10:]  # 保留最近10条
            
            # 使用DeepSeek服务生成响应
            response = await deepseek_service.generate_agent_response(
                context=context,
                agent_config=self.config.to_dict(),
                conversation_history=self.conversation_history,
                meeting_context=meeting_context
            )
            
            # 更新统计信息
            self.response_count += 1
            self.last_response_time = datetime.utcnow()
            
            # 添加Agent特定的元数据
            response["metadata"].update({
                "agent_id": self.config.id,
                "agent_name": self.config.name,
                "response_count": self.response_count,
                "personality_type": self.config.personality_traits.get("personality_type"),
                "speaking_style": self.config.speaking_style.get("tone"),
                "expertise_areas": self.config.expertise_areas
            })
            
            # 保存到对话历史
            self.conversation_history.append({
                "role": "assistant",
                "content": response["content"]
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Agent {self.config.name} response generation failed: {str(e)}")
            
            # 返回失败回退响应
            return {
                "content": f"[{self.config.name}] 抱歉，我暂时无法回应这个问题。",
                "metadata": {
                    "error": str(e),
                    "agent_id": self.config.id,
                    "agent_name": self.config.name,
                    "fallback": True
                }
            }
    
    async def generate_stream_response(
        self,
        context: str,
        meeting_context: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ):
        """
        生成流式响应 (用于实时显示)
        
        Yields:
            生成的文本块
        """
        try:
            # 更新对话历史
            if conversation_history:
                self.conversation_history = conversation_history[-10:]
            
            # 使用DeepSeek服务的流式生成
            async for chunk in deepseek_service.stream_agent_response(
                context=context,
                agent_config=self.config.to_dict(),
                conversation_history=self.conversation_history,
                meeting_context=meeting_context
            ):
                yield chunk
            
            # 更新统计
            self.response_count += 1
            self.last_response_time = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Agent {self.config.name} stream response failed: {str(e)}")
            yield f"[{self.config.name}] 响应生成失败: {str(e)}"
    
    def should_speak_now(
        self,
        current_context: str,
        recent_speakers: List[int],
        meeting_rules: Dict[str, Any]
    ) -> float:
        """
        计算当前是否应该发言的权重分数
        
        Args:
            current_context: 当前讨论内容
            recent_speakers: 最近发言的Agent ID列表
            meeting_rules: 会议规则
            
        Returns:
            发言权重分数 (0-1之间，越高越应该发言)
        """
        base_score = 0.5  # 基础分数
        
        # 1. 基于参与者优先级
        if self.participant_config:
            base_score *= self.participant_config.speaking_priority
        
        # 2. 基于个性设置
        behavior = self.config.behavior_settings
        
        # 发言频率偏好
        frequency = behavior.get("speaking_frequency", "medium")
        if frequency == "high":
            base_score *= 1.3
        elif frequency == "low":
            base_score *= 0.7
        
        # 主动性水平
        initiative = behavior.get("initiative_level", "medium")
        if initiative == "high":
            base_score *= 1.2
        elif initiative == "low":
            base_score *= 0.8
        
        # 3. 基于最近发言情况
        if self.config.id in recent_speakers[-3:]:  # 如果最近3次发言中包含自己
            base_score *= 0.6  # 降低权重，给其他人机会
        
        # 4. 基于专业领域相关性
        if self.config.expertise_areas and current_context:
            context_lower = current_context.lower()
            relevant_areas = 0
            for area in self.config.expertise_areas:
                if area.lower() in context_lower:
                    relevant_areas += 1
            
            if relevant_areas > 0:
                base_score *= (1.0 + relevant_areas * 0.2)  # 相关专业领域加分
        
        # 5. 基于会议规则
        max_consecutive = meeting_rules.get("max_consecutive_turns", 2)
        if self.response_count > max_consecutive:
            base_score *= 0.5  # 连续发言过多，降低权重
        
        return min(1.0, max(0.0, base_score))  # 限制在0-1范围内
    
    def get_speaking_style_prompt(self) -> str:
        """获取说话风格提示词"""
        style = self.config.speaking_style
        personality = self.config.personality_traits
        
        style_elements = []
        
        # 语调
        tone = style.get("tone", "专业、客观")
        style_elements.append(f"语调: {tone}")
        
        # 句子长度
        length = style.get("sentence_length", "中等长度")
        if length == "简洁有力":
            style_elements.append("请保持回答简洁明了")
        elif length == "详细准确":
            style_elements.append("请提供详细和准确的回答")
        
        # 词汇水平
        vocab = style.get("vocabulary_level", "商业专业词汇")
        style_elements.append(f"词汇风格: {vocab}")
        
        # 情感表达
        emotion = style.get("emotional_expression", "适度表达")
        style_elements.append(f"情感表达程度: {emotion}")
        
        # 个性特征影响
        comm_style = personality.get("communication_style", "")
        if comm_style:
            style_elements.append(f"沟通风格: {comm_style}")
        
        return "请按照以下风格要求回答: " + "; ".join(style_elements)
    
    def get_response_constraints(self) -> Dict[str, Any]:
        """获取响应约束条件"""
        constraints = {}
        
        # 基于说话风格设置token限制
        style = self.config.speaking_style
        length = style.get("sentence_length", "中等长度")
        
        if length == "简洁有力":
            constraints["max_tokens"] = 300
        elif length == "详细准确":
            constraints["max_tokens"] = 1200
        else:
            constraints["max_tokens"] = 800
        
        # 基于个性特征设置温度
        personality = self.config.personality_traits
        decision_making = personality.get("decision_making", "")
        
        if "数据驱动" in decision_making or "逻辑" in decision_making:
            constraints["temperature"] = 0.5  # 更保守
        elif "创造性" in decision_making or "创新" in decision_making:
            constraints["temperature"] = 0.9  # 更创新
        else:
            constraints["temperature"] = 0.7  # 平衡
        
        return constraints
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "agent_id": self.config.id,
            "name": self.config.name,
            "role": self.config.role,
            "avatar_url": self.config.avatar_url,
            "personality_traits": self.config.personality_traits,
            "speaking_style": self.config.speaking_style,
            "behavior_settings": self.config.behavior_settings,
            "backstory": self.config.backstory,
            "goal": self.config.goal,
            "expertise_areas": self.config.expertise_areas,
            "response_count": self.response_count,
            "last_response_time": self.last_response_time.isoformat() if self.last_response_time else None,
            "participant_config": self.participant_config.to_dict() if self.participant_config else None
        }


class MeetingAgentManager:
    """
    会议Agent管理器
    管理会议中的所有ConfigurableAgent实例
    """
    
    def __init__(self):
        self.agents: Dict[int, ConfigurableAgent] = {}  # agent_id -> ConfigurableAgent
        self.meeting_id: Optional[int] = None
        self.speaking_queue: List[int] = []  # agent_id 队列
    
    def add_agent(self, agent_config: AgentConfig, participant_config: MeetingParticipant):
        """添加Agent到会议"""
        configurable_agent = ConfigurableAgent(agent_config, participant_config)
        self.agents[agent_config.id] = configurable_agent
        logger.info(f"Added agent {agent_config.name} to meeting")
    
    def remove_agent(self, agent_id: int):
        """从会议中移除Agent"""
        if agent_id in self.agents:
            agent_name = self.agents[agent_id].config.name
            del self.agents[agent_id]
            # 从发言队列中移除
            if agent_id in self.speaking_queue:
                self.speaking_queue.remove(agent_id)
            logger.info(f"Removed agent {agent_name} from meeting")
    
    def get_agent(self, agent_id: int) -> Optional[ConfigurableAgent]:
        """获取指定Agent"""
        return self.agents.get(agent_id)
    
    def get_all_agents(self) -> List[ConfigurableAgent]:
        """获取所有Agent"""
        return list(self.agents.values())
    
    def calculate_next_speaker(
        self,
        current_context: str,
        recent_speakers: List[int],
        meeting_rules: Dict[str, Any]
    ) -> Optional[ConfigurableAgent]:
        """计算下一个发言者"""
        if not self.agents:
            return None
        
        # 计算每个Agent的发言权重
        speaker_scores = {}
        for agent_id, agent in self.agents.items():
            score = agent.should_speak_now(current_context, recent_speakers, meeting_rules)
            speaker_scores[agent_id] = score
        
        # 选择得分最高的Agent
        if speaker_scores:
            best_agent_id = max(speaker_scores.keys(), key=lambda k: speaker_scores[k])
            return self.agents[best_agent_id]
        
        return None
    
    def get_meeting_statistics(self) -> Dict[str, Any]:
        """获取会议统计信息"""
        if not self.agents:
            return {}
        
        total_responses = sum(agent.response_count for agent in self.agents.values())
        active_agents = len([agent for agent in self.agents.values() if agent.response_count > 0])
        
        # 按发言次数排序
        agent_stats = []
        for agent in self.agents.values():
            agent_stats.append({
                "agent_id": agent.config.id,
                "name": agent.config.name,
                "role": agent.config.role,
                "response_count": agent.response_count,
                "last_response_time": agent.last_response_time.isoformat() if agent.last_response_time else None
            })
        
        agent_stats.sort(key=lambda x: x["response_count"], reverse=True)
        
        return {
            "total_agents": len(self.agents),
            "active_agents": active_agents,
            "total_responses": total_responses,
            "average_responses_per_agent": total_responses / len(self.agents) if self.agents else 0,
            "agent_statistics": agent_stats,
            "most_active_agent": agent_stats[0] if agent_stats else None
        }