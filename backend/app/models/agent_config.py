from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean
from datetime import datetime
from typing import Dict, Any, Optional
from .base import Base

class AgentConfig(Base):
    """
    Agent 配置数据模型
    存储每个 Agent 的个性化配置信息
    """
    __tablename__ = "agents_config"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, comment="Agent 名称")
    role = Column(String(100), nullable=False, comment="Agent 角色")
    avatar_url = Column(String(255), nullable=True, comment="头像 URL")
    
    # 个性特征配置
    personality_traits = Column(JSON, nullable=False, comment="个性特征 JSON 配置")
    # 示例: {
    #   "personality_type": "专业严谨",
    #   "communication_style": "正式",
    #   "decision_making": "数据驱动", 
    #   "collaboration_style": "团队合作",
    #   "stress_response": "冷静分析"
    # }
    
    # 说话风格配置
    speaking_style = Column(JSON, nullable=False, comment="说话风格 JSON 配置")
    # 示例: {
    #   "tone": "专业、客观",
    #   "vocabulary_level": "高级商业词汇",
    #   "sentence_length": "中等长度",
    #   "use_examples": true,
    #   "emotional_expression": "控制适度"
    # }
    
    # 行为设置
    behavior_settings = Column(JSON, nullable=False, comment="行为设置 JSON 配置")
    # 示例: {
    #   "speaking_frequency": "medium", // low, medium, high
    #   "interruption_tendency": "low",
    #   "agreement_tendency": "neutral", // supportive, neutral, critical
    #   "initiative_level": "high",
    #   "detail_preference": "comprehensive"
    # }
    
    # Agent 背景故事和目标
    backstory = Column(Text, nullable=False, comment="背景故事")
    goal = Column(Text, nullable=False, comment="主要目标")
    
    # 专业领域和技能
    expertise_areas = Column(JSON, nullable=True, comment="专业领域列表")
    # 示例: ["财务分析", "市场研究", "战略规划"]
    
    # 系统配置
    is_active = Column(Boolean, default=True, comment="是否激活")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
    created_by = Column(String(100), nullable=True, comment="创建者")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "avatar_url": self.avatar_url,
            "personality_traits": self.personality_traits,
            "speaking_style": self.speaking_style,
            "behavior_settings": self.behavior_settings,
            "backstory": self.backstory,
            "goal": self.goal,
            "expertise_areas": self.expertise_areas,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by
        }
    
    @staticmethod
    def get_default_personality_traits() -> Dict[str, str]:
        """获取默认个性特征模板"""
        return {
            "personality_type": "专业务实",
            "communication_style": "直接明确", 
            "decision_making": "逻辑分析",
            "collaboration_style": "积极参与",
            "stress_response": "保持冷静"
        }
    
    @staticmethod
    def get_default_speaking_style() -> Dict[str, Any]:
        """获取默认说话风格模板"""
        return {
            "tone": "专业、友善",
            "vocabulary_level": "商业专业词汇",
            "sentence_length": "中等长度",
            "use_examples": True,
            "emotional_expression": "适度表达"
        }
    
    @staticmethod
    def get_default_behavior_settings() -> Dict[str, str]:
        """获取默认行为设置模板"""
        return {
            "speaking_frequency": "medium",
            "interruption_tendency": "low", 
            "agreement_tendency": "neutral",
            "initiative_level": "medium",
            "detail_preference": "balanced"
        }