from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Dict, Any, List, Optional
from enum import Enum
from .base import Base

class MeetingStatus(str, Enum):
    """会议状态枚举"""
    DRAFT = "draft"           # 草稿
    SCHEDULED = "scheduled"   # 已安排
    IN_PROGRESS = "in_progress"  # 进行中
    COMPLETED = "completed"   # 已完成
    CANCELLED = "cancelled"   # 已取消

class Meeting(Base):
    """
    会议数据模型
    存储会议的基本信息和配置
    """
    __tablename__ = "meetings"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, comment="会议标题")
    description = Column(Text, nullable=True, comment="会议描述")
    topic = Column(Text, nullable=False, comment="会议主题和议程")
    
    # 会议状态和时间
    status = Column(String(20), default=MeetingStatus.DRAFT, comment="会议状态")
    scheduled_start = Column(DateTime, nullable=True, comment="计划开始时间")
    actual_start = Column(DateTime, nullable=True, comment="实际开始时间")
    actual_end = Column(DateTime, nullable=True, comment="实际结束时间")
    duration_limit = Column(Integer, nullable=True, comment="会议时长限制(分钟)")
    
    # 会议规则配置
    meeting_rules = Column(JSON, nullable=False, comment="会议规则配置")
    # 示例: {
    #   "max_participants": 8,
    #   "speaking_time_limit": 120,  // 单次发言时长限制(秒)
    #   "max_rounds": 5,             // 最大发言轮次
    #   "allow_interruption": false,
    #   "require_conclusion": true,
    #   "auto_summarize": true
    # }
    
    # 讨论配置
    discussion_config = Column(JSON, nullable=False, comment="讨论配置")
    # 示例: {
    #   "discussion_mode": "structured", // structured, free_flow, mixed
    #   "speaking_order": "priority",    // sequential, priority, random
    #   "priority_algorithm": "role_based", // role_based, topic_relevance, mixed
    #   "enable_debate": true,
    #   "consensus_threshold": 0.7
    # }
    
    # 会议结果
    summary = Column(Text, nullable=True, comment="会议总结")
    conclusions = Column(JSON, nullable=True, comment="会议结论列表")
    action_items = Column(JSON, nullable=True, comment="行动项列表")
    
    # 系统信息
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
    created_by = Column(String(100), nullable=False, comment="创建者")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "topic": self.topic,
            "status": self.status,
            "scheduled_start": self.scheduled_start.isoformat() if self.scheduled_start else None,
            "actual_start": self.actual_start.isoformat() if self.actual_start else None,
            "actual_end": self.actual_end.isoformat() if self.actual_end else None,
            "duration_limit": self.duration_limit,
            "meeting_rules": self.meeting_rules,
            "discussion_config": self.discussion_config,
            "summary": self.summary,
            "conclusions": self.conclusions,
            "action_items": self.action_items,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by
        }
    
    @staticmethod
    def get_default_meeting_rules() -> Dict[str, Any]:
        """获取默认会议规则"""
        return {
            "max_participants": 8,
            "speaking_time_limit": 120,
            "max_rounds": 5,
            "allow_interruption": False,
            "require_conclusion": True,
            "auto_summarize": True
        }
    
    @staticmethod
    def get_default_discussion_config() -> Dict[str, str]:
        """获取默认讨论配置"""
        return {
            "discussion_mode": "structured",
            "speaking_order": "priority",
            "priority_algorithm": "role_based",
            "enable_debate": True,
            "consensus_threshold": 0.7
        }


class MeetingParticipant(Base):
    """
    会议参与者数据模型
    关联会议和 Agent，存储参与配置
    """
    __tablename__ = "meeting_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, comment="会议 ID")
    agent_id = Column(Integer, ForeignKey("agents_config.id"), nullable=False, comment="Agent ID")
    
    # 在会议中的角色配置
    role_in_meeting = Column(String(100), nullable=False, comment="会议中的角色")
    speaking_priority = Column(Float, default=1.0, comment="发言优先级权重")
    
    # 参与设置
    participant_settings = Column(JSON, nullable=False, comment="参与者设置")
    # 示例: {
    #   "can_initiate_topic": true,
    #   "can_moderate": false,
    #   "response_style": "analytical", // analytical, supportive, challenging
    #   "engagement_level": "high",     // low, medium, high
    #   "expertise_weight": 0.8
    # }
    
    # 会议统计
    total_messages = Column(Integer, default=0, comment="总发言次数")
    total_speaking_time = Column(Integer, default=0, comment="总发言时长(秒)")
    last_spoke_at = Column(DateTime, nullable=True, comment="最后发言时间")
    
    # 状态
    is_active = Column(Boolean, default=True, comment="是否激活参与")
    joined_at = Column(DateTime, default=datetime.utcnow, comment="加入时间")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "agent_id": self.agent_id,
            "role_in_meeting": self.role_in_meeting,
            "speaking_priority": self.speaking_priority,
            "participant_settings": self.participant_settings,
            "total_messages": self.total_messages,
            "total_speaking_time": self.total_speaking_time,
            "last_spoke_at": self.last_spoke_at.isoformat() if self.last_spoke_at else None,
            "is_active": self.is_active,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None
        }
    
    @staticmethod
    def get_default_participant_settings() -> Dict[str, Any]:
        """获取默认参与者设置"""
        return {
            "can_initiate_topic": True,
            "can_moderate": False,
            "response_style": "analytical",
            "engagement_level": "high",
            "expertise_weight": 0.8
        }