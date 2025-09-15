from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Dict, Any, List, Optional
from enum import Enum
from .base import Base

class MessageType(str, Enum):
    """消息类型枚举"""
    SPEECH = "speech"                    # 正常发言
    QUESTION = "question"                # 提问
    ANSWER = "answer"                    # 回答
    SUGGESTION = "suggestion"            # 建议
    OBJECTION = "objection"              # 反对意见
    SUPPORT = "support"                  # 支持意见
    SUMMARY = "summary"                  # 总结
    SYSTEM = "system"                    # 系统消息
    MODERATOR = "moderator"              # 主持人消息

class MessageStatus(str, Enum):
    """消息状态枚举"""
    PENDING = "pending"                  # 待发送
    SENT = "sent"                        # 已发送
    DELIVERED = "delivered"              # 已送达
    INTERRUPTED = "interrupted"          # 被打断
    FAILED = "failed"                    # 发送失败

class MeetingMessage(Base):
    """
    会议消息数据模型
    存储会议中的所有消息和对话内容
    """
    __tablename__ = "meeting_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, comment="会议 ID")
    agent_id = Column(Integer, ForeignKey("agents_config.id"), nullable=False, comment="发言 Agent ID")
    
    # 消息内容
    message_content = Column(Text, nullable=False, comment="消息内容")
    message_type = Column(String(20), default=MessageType.SPEECH, comment="消息类型")
    status = Column(String(20), default=MessageStatus.PENDING, comment="消息状态")
    
    # 消息上下文
    reply_to_message_id = Column(Integer, ForeignKey("meeting_messages.id"), nullable=True, comment="回复的消息 ID")
    topic_relevance_score = Column(Float, nullable=True, comment="话题相关性分数")
    
    # 消息元数据
    message_metadata = Column(JSON, nullable=True, comment="消息元数据")
    # 示例: {
    #   "sentiment": "positive",           // positive, negative, neutral
    #   "confidence": 0.85,
    #   "key_points": ["point1", "point2"],
    #   "mentioned_agents": [2, 3],
    #   "speaking_duration": 45,           // 发言时长(秒)
    #   "interruption_count": 0,
    #   "emotion": "confident",
    #   "urgency_level": "medium"
    # }
    
    # 时间信息
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    sent_at = Column(DateTime, nullable=True, comment="发送时间")
    speaking_started_at = Column(DateTime, nullable=True, comment="开始发言时间")
    speaking_ended_at = Column(DateTime, nullable=True, comment="结束发言时间")
    
    # 发言排队和优先级
    queue_position = Column(Integer, nullable=True, comment="排队位置")
    priority_score = Column(Float, default=1.0, comment="优先级分数")
    
    # 消息质量评估
    relevance_score = Column(Float, nullable=True, comment="相关性分数")
    contribution_score = Column(Float, nullable=True, comment="贡献度分数")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "agent_id": self.agent_id,
            "message_content": self.message_content,
            "message_type": self.message_type,
            "status": self.status,
            "reply_to_message_id": self.reply_to_message_id,
            "topic_relevance_score": self.topic_relevance_score,
            "metadata": self.message_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "speaking_started_at": self.speaking_started_at.isoformat() if self.speaking_started_at else None,
            "speaking_ended_at": self.speaking_ended_at.isoformat() if self.speaking_ended_at else None,
            "queue_position": self.queue_position,
            "priority_score": self.priority_score,
            "relevance_score": self.relevance_score,
            "contribution_score": self.contribution_score
        }
    
    @property
    def speaking_duration(self) -> Optional[int]:
        """计算发言时长(秒)"""
        if self.speaking_started_at and self.speaking_ended_at:
            delta = self.speaking_ended_at - self.speaking_started_at
            return int(delta.total_seconds())
        return None
    
    def update_metadata(self, key: str, value: Any):
        """更新消息元数据"""
        if self.message_metadata is None:
            self.message_metadata = {}
        self.message_metadata[key] = value


class MessageReaction(Base):
    """
    消息反应数据模型
    记录 Agent 对其他消息的反应和评价
    """
    __tablename__ = "message_reactions"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("meeting_messages.id"), nullable=False, comment="被反应的消息 ID")
    agent_id = Column(Integer, ForeignKey("agents_config.id"), nullable=False, comment="反应者 Agent ID")
    
    # 反应类型和内容
    reaction_type = Column(String(50), nullable=False, comment="反应类型")
    # 如: "agree", "disagree", "question", "clarification", "support", "concern"
    
    reaction_content = Column(Text, nullable=True, comment="反应内容")
    intensity = Column(Float, default=1.0, comment="反应强度 (0-1)")
    
    # 时间
    created_at = Column(DateTime, default=datetime.utcnow, comment="反应时间")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "message_id": self.message_id,
            "agent_id": self.agent_id,
            "reaction_type": self.reaction_type,
            "reaction_content": self.reaction_content,
            "intensity": self.intensity,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class MeetingAnalytics(Base):
    """
    会议分析数据模型
    存储会议的统计分析数据
    """
    __tablename__ = "meeting_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, comment="会议 ID")
    
    # 参与度统计
    participation_stats = Column(JSON, nullable=False, comment="参与度统计")
    # 示例: {
    #   "total_messages": 45,
    #   "unique_speakers": 5,
    #   "average_message_length": 150,
    #   "speaking_time_distribution": {...},
    #   "interaction_matrix": {...}
    # }
    
    # 话题分析
    topic_analysis = Column(JSON, nullable=True, comment="话题分析")
    # 示例: {
    #   "main_topics": ["topic1", "topic2"],
    #   "topic_shifts": 3,
    #   "consensus_level": 0.75,
    #   "controversy_areas": ["area1"]
    # }
    
    # 情感分析
    sentiment_analysis = Column(JSON, nullable=True, comment="情感分析")
    # 示例: {
    #   "overall_sentiment": "positive",
    #   "sentiment_trend": [...],
    #   "emotion_distribution": {...},
    #   "conflict_incidents": 2
    # }
    
    # 效率指标
    efficiency_metrics = Column(JSON, nullable=True, comment="效率指标")
    # 示例: {
    #   "time_to_consensus": 1800,      // 秒
    #   "decision_count": 3,
    #   "action_items_count": 5,
    #   "off_topic_percentage": 0.15
    # }
    
    # 生成时间
    generated_at = Column(DateTime, default=datetime.utcnow, comment="分析生成时间")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "participation_stats": self.participation_stats,
            "topic_analysis": self.topic_analysis,
            "sentiment_analysis": self.sentiment_analysis,
            "efficiency_metrics": self.efficiency_metrics,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None
        }