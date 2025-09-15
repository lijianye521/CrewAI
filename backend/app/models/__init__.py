"""
数据库模型包
包含所有数据库表的模型定义
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import os

# 导入统一的 Base
from .base import Base

# 导入所有模型
from .agent_config import AgentConfig
from .meeting import Meeting, MeetingParticipant, MeetingStatus
from .message import (
    MeetingMessage, 
    MessageReaction, 
    MeetingAnalytics, 
    MessageType, 
    MessageStatus
)

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crewai_meeting.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_database():
    """创建所有数据库表"""
    # 使用统一的 Base 创建所有表
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")

def get_database_session() -> Generator[Session, None, None]:
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_sample_data(db: Session):
    """初始化示例数据"""
    # 检查是否已有数据
    if db.query(AgentConfig).first():
        print("数据库已有数据，跳过初始化")
        return
    
    # 创建示例 Agent 配置
    sample_agents = [
        AgentConfig(
            name="张总(CEO)",
            role="首席执行官",
            personality_traits={
                "personality_type": "领导型",
                "communication_style": "直接有力",
                "decision_making": "战略思维",
                "collaboration_style": "决策导向",
                "stress_response": "果断应对"
            },
            speaking_style={
                "tone": "权威、激励",
                "vocabulary_level": "高级管理词汇",
                "sentence_length": "简洁有力",
                "use_examples": True,
                "emotional_expression": "控制但有感染力"
            },
            behavior_settings={
                "speaking_frequency": "medium",
                "interruption_tendency": "medium",
                "agreement_tendency": "neutral",
                "initiative_level": "high",
                "detail_preference": "strategic"
            },
            backstory="拥有15年企业管理经验，擅长战略规划和团队领导，注重结果导向和执行力。",
            goal="推动公司战略目标达成，确保团队高效协作，做出最佳商业决策。",
            expertise_areas=["战略管理", "团队领导", "商业决策", "资源配置"],
            created_by="system"
        ),
        AgentConfig(
            name="李经理(产品)",
            role="产品经理",
            personality_traits={
                "personality_type": "分析型",
                "communication_style": "逻辑清晰",
                "decision_making": "数据驱动",
                "collaboration_style": "协调合作",
                "stress_response": "系统分析"
            },
            speaking_style={
                "tone": "专业、客观",
                "vocabulary_level": "产品专业词汇",
                "sentence_length": "中等长度",
                "use_examples": True,
                "emotional_expression": "适度理性"
            },
            behavior_settings={
                "speaking_frequency": "high",
                "interruption_tendency": "low",
                "agreement_tendency": "analytical",
                "initiative_level": "high",
                "detail_preference": "comprehensive"
            },
            backstory="资深产品经理，擅长用户研究和产品设计，注重用户体验和数据分析。",
            goal="设计出用户喜爱的产品功能，通过数据洞察驱动产品优化决策。",
            expertise_areas=["产品设计", "用户研究", "数据分析", "需求管理"],
            created_by="system"
        ),
        AgentConfig(
            name="王工(技术)",
            role="技术总监",
            personality_traits={
                "personality_type": "理性务实",
                "communication_style": "精确严谨",
                "decision_making": "技术导向",
                "collaboration_style": "专业支持",
                "stress_response": "逻辑分析"
            },
            speaking_style={
                "tone": "专业、严谨",
                "vocabulary_level": "技术专业词汇",
                "sentence_length": "详细准确",
                "use_examples": True,
                "emotional_expression": "控制理性"
            },
            behavior_settings={
                "speaking_frequency": "medium",
                "interruption_tendency": "low",
                "agreement_tendency": "technical",
                "initiative_level": "medium",
                "detail_preference": "technical_detail"
            },
            backstory="10年软件开发和架构经验，专注于技术创新和系统稳定性。",
            goal="确保技术方案的可行性和稳定性，推动技术创新和最佳实践。",
            expertise_areas=["系统架构", "技术选型", "性能优化", "开发管理"],
            created_by="system"
        ),
        AgentConfig(
            name="陈主管(运营)",
            role="运营主管",
            personality_traits={
                "personality_type": "活跃热情",
                "communication_style": "生动形象",
                "decision_making": "市场导向",
                "collaboration_style": "积极推动",
                "stress_response": "快速应变"
            },
            speaking_style={
                "tone": "热情、生动",
                "vocabulary_level": "市场营销词汇",
                "sentence_length": "富有感染力",
                "use_examples": True,
                "emotional_expression": "积极表达"
            },
            behavior_settings={
                "speaking_frequency": "high",
                "interruption_tendency": "medium",
                "agreement_tendency": "supportive",
                "initiative_level": "high",
                "detail_preference": "market_focused"
            },
            backstory="营销运营专家，擅长市场推广和用户增长，关注市场趋势和用户反馈。",
            goal="提升品牌影响力和用户增长，通过创新营销策略扩大市场份额。",
            expertise_areas=["市场营销", "用户运营", "品牌推广", "增长策略"],
            created_by="system"
        )
    ]
    
    for agent in sample_agents:
        db.add(agent)
    
    db.commit()
    print(f"Created {len(sample_agents)} sample agents successfully")

# 导出所有模型和工具函数
__all__ = [
    # 基类
    "Base",
    # 模型类
    "AgentConfig",
    "Meeting", 
    "MeetingParticipant",
    "MeetingMessage",
    "MessageReaction", 
    "MeetingAnalytics",
    # 枚举类
    "MessageType",
    "MessageStatus",
    "MeetingStatus",
    # 数据库工具
    "engine",
    "SessionLocal", 
    "create_database",
    "get_database_session",
    "init_sample_data"
]