from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from ..models.agent_config import AgentConfig
from .deepseek_service import deepseek_service

logger = logging.getLogger(__name__)

class AgentService:
    """
    Agent管理服务
    处理Agent的创建、配置、管理等业务逻辑
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_agent(
        self,
        agent_data: Dict[str, Any],
        created_by: str = "system"
    ) -> AgentConfig:
        """
        创建新的Agent配置
        
        Args:
            agent_data: Agent配置数据
            created_by: 创建者标识
            
        Returns:
            创建的Agent配置对象
        """
        try:
            # 验证必填字段
            required_fields = ["name", "role", "backstory", "goal"]
            for field in required_fields:
                if not agent_data.get(field):
                    raise ValueError(f"Missing required field: {field}")
            
            # 设置默认值
            agent_data.setdefault("personality_traits", AgentConfig.get_default_personality_traits())
            agent_data.setdefault("speaking_style", AgentConfig.get_default_speaking_style())
            agent_data.setdefault("behavior_settings", AgentConfig.get_default_behavior_settings())
            agent_data.setdefault("expertise_areas", [])
            agent_data.setdefault("is_active", True)
            
            # 创建Agent对象
            agent = AgentConfig(
                name=agent_data["name"],
                role=agent_data["role"],
                avatar_url=agent_data.get("avatar_url"),
                personality_traits=agent_data["personality_traits"],
                speaking_style=agent_data["speaking_style"],
                behavior_settings=agent_data["behavior_settings"],
                backstory=agent_data["backstory"],
                goal=agent_data["goal"],
                expertise_areas=agent_data["expertise_areas"],
                is_active=agent_data["is_active"],
                created_by=created_by
            )
            
            self.db.add(agent)
            self.db.commit()
            self.db.refresh(agent)
            
            logger.info(f"Created agent: {agent.name} (ID: {agent.id})")
            return agent
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create agent: {str(e)}")
            raise
    
    def get_agent_by_id(self, agent_id: int) -> Optional[AgentConfig]:
        """根据ID获取Agent配置"""
        return self.db.query(AgentConfig).filter(AgentConfig.id == agent_id).first()
    
    def get_agents(
        self, 
        skip: int = 0, 
        limit: int = 100,
        active_only: bool = True
    ) -> List[AgentConfig]:
        """获取Agent列表"""
        query = self.db.query(AgentConfig)
        
        if active_only:
            query = query.filter(AgentConfig.is_active == True)
        
        return query.offset(skip).limit(limit).all()
    
    def search_agents(
        self,
        keyword: str,
        roles: Optional[List[str]] = None,
        expertise_areas: Optional[List[str]] = None
    ) -> List[AgentConfig]:
        """搜索Agent"""
        query = self.db.query(AgentConfig).filter(AgentConfig.is_active == True)
        
        # 按关键词搜索
        if keyword:
            query = query.filter(
                AgentConfig.name.contains(keyword) |
                AgentConfig.role.contains(keyword) |
                AgentConfig.backstory.contains(keyword)
            )
        
        # 按角色过滤
        if roles:
            query = query.filter(AgentConfig.role.in_(roles))
        
        # 按专业领域过滤 (JSON字段搜索)
        if expertise_areas:
            for area in expertise_areas:
                query = query.filter(AgentConfig.expertise_areas.contains(area))
        
        return query.all()
    
    async def update_agent(
        self,
        agent_id: int,
        update_data: Dict[str, Any]
    ) -> Optional[AgentConfig]:
        """更新Agent配置"""
        try:
            agent = self.get_agent_by_id(agent_id)
            if not agent:
                return None
            
            # 更新允许的字段
            updatable_fields = [
                "name", "role", "avatar_url", "personality_traits", 
                "speaking_style", "behavior_settings", "backstory", 
                "goal", "expertise_areas", "is_active"
            ]
            
            for field in updatable_fields:
                if field in update_data:
                    setattr(agent, field, update_data[field])
            
            agent.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(agent)
            
            logger.info(f"Updated agent: {agent.name} (ID: {agent.id})")
            return agent
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update agent {agent_id}: {str(e)}")
            raise
    
    def delete_agent(self, agent_id: int) -> bool:
        """软删除Agent (设置为非活跃)"""
        try:
            agent = self.get_agent_by_id(agent_id)
            if not agent:
                return False
            
            agent.is_active = False
            agent.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"Deactivated agent: {agent.name} (ID: {agent.id})")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete agent {agent_id}: {str(e)}")
            raise
    
    def hard_delete_agent(self, agent_id: int) -> bool:
        """硬删除Agent (物理删除)"""
        try:
            agent = self.get_agent_by_id(agent_id)
            if not agent:
                return False
            
            self.db.delete(agent)
            self.db.commit()
            
            logger.info(f"Hard deleted agent: {agent_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to hard delete agent {agent_id}: {str(e)}")
            raise
    
    async def test_agent_response(
        self,
        agent_id: int,
        test_context: str,
        meeting_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        测试Agent响应
        用于在配置阶段测试Agent的表现
        """
        try:
            agent = self.get_agent_by_id(agent_id)
            if not agent:
                raise ValueError(f"Agent {agent_id} not found")
            
            # 构建Agent配置
            agent_config = agent.to_dict()
            
            # 调用DeepSeek服务生成响应
            response = await deepseek_service.generate_agent_response(
                context=test_context,
                agent_config=agent_config,
                meeting_context=meeting_context
            )
            
            return {
                "agent_id": agent_id,
                "agent_name": agent.name,
                "test_context": test_context,
                "response": response,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Agent response test failed for agent {agent_id}: {str(e)}")
            raise
    
    def clone_agent(
        self,
        agent_id: int,
        new_name: str,
        created_by: str = "system"
    ) -> Optional[AgentConfig]:
        """克隆Agent配置"""
        try:
            original_agent = self.get_agent_by_id(agent_id)
            if not original_agent:
                return None
            
            # 创建克隆的Agent数据
            clone_data = original_agent.to_dict()
            clone_data.pop("id", None)
            clone_data.pop("created_at", None)
            clone_data.pop("updated_at", None)
            clone_data["name"] = new_name
            
            # 创建新的Agent
            clone_agent = AgentConfig(**clone_data, created_by=created_by)
            
            self.db.add(clone_agent)
            self.db.commit()
            self.db.refresh(clone_agent)
            
            logger.info(f"Cloned agent: {original_agent.name} -> {new_name} (ID: {clone_agent.id})")
            return clone_agent
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to clone agent {agent_id}: {str(e)}")
            raise
    
    def get_agent_statistics(self) -> Dict[str, Any]:
        """获取Agent统计信息"""
        try:
            total_agents = self.db.query(AgentConfig).count()
            active_agents = self.db.query(AgentConfig).filter(AgentConfig.is_active == True).count()
            
            # 按角色分组统计
            role_stats = self.db.query(
                AgentConfig.role,
                self.db.func.count(AgentConfig.id)
            ).filter(AgentConfig.is_active == True).group_by(AgentConfig.role).all()
            
            # 最近创建的Agent
            recent_agents = self.db.query(AgentConfig).filter(
                AgentConfig.is_active == True
            ).order_by(AgentConfig.created_at.desc()).limit(5).all()
            
            return {
                "total_agents": total_agents,
                "active_agents": active_agents,
                "inactive_agents": total_agents - active_agents,
                "role_distribution": {role: count for role, count in role_stats},
                "recent_agents": [
                    {
                        "id": agent.id,
                        "name": agent.name,
                        "role": agent.role,
                        "created_at": agent.created_at.isoformat() if agent.created_at else None
                    }
                    for agent in recent_agents
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to get agent statistics: {str(e)}")
            raise
    
    def validate_agent_config(self, agent_data: Dict[str, Any]) -> Dict[str, List[str]]:
        """验证Agent配置数据"""
        errors = {}
        
        # 验证必填字段
        required_fields = ["name", "role", "backstory", "goal"]
        for field in required_fields:
            if not agent_data.get(field):
                errors.setdefault("required", []).append(f"Missing field: {field}")
        
        # 验证名称长度
        if agent_data.get("name") and len(agent_data["name"]) > 100:
            errors.setdefault("validation", []).append("Name too long (max 100 characters)")
        
        # 验证角色长度
        if agent_data.get("role") and len(agent_data["role"]) > 100:
            errors.setdefault("validation", []).append("Role too long (max 100 characters)")
        
        # 验证个性特征格式
        if agent_data.get("personality_traits"):
            if not isinstance(agent_data["personality_traits"], dict):
                errors.setdefault("format", []).append("Personality traits must be a dictionary")
        
        # 验证说话风格格式
        if agent_data.get("speaking_style"):
            if not isinstance(agent_data["speaking_style"], dict):
                errors.setdefault("format", []).append("Speaking style must be a dictionary")
        
        # 验证行为设置格式
        if agent_data.get("behavior_settings"):
            if not isinstance(agent_data["behavior_settings"], dict):
                errors.setdefault("format", []).append("Behavior settings must be a dictionary")
        
        # 验证专业领域格式
        if agent_data.get("expertise_areas"):
            if not isinstance(agent_data["expertise_areas"], list):
                errors.setdefault("format", []).append("Expertise areas must be a list")
        
        return errors
    
    def get_agent_templates(self) -> List[Dict[str, Any]]:
        """获取Agent模板列表"""
        templates = [
            {
                "id": "ceo",
                "name": "CEO模板",
                "role": "首席执行官",
                "description": "企业高级管理者，专注战略决策和团队领导",
                "personality_traits": {
                    "personality_type": "领导型",
                    "communication_style": "权威明确",
                    "decision_making": "战略导向",
                    "collaboration_style": "决策主导",
                    "stress_response": "果断应对"
                },
                "speaking_style": {
                    "tone": "权威、激励",
                    "vocabulary_level": "高级管理词汇",
                    "sentence_length": "简洁有力",
                    "use_examples": True,
                    "emotional_expression": "控制但有感染力"
                }
            },
            {
                "id": "product_manager",
                "name": "产品经理模板",
                "role": "产品经理",
                "description": "产品设计和策略专家，注重用户体验和数据分析",
                "personality_traits": {
                    "personality_type": "分析型",
                    "communication_style": "逻辑清晰",
                    "decision_making": "数据驱动",
                    "collaboration_style": "协调合作",
                    "stress_response": "系统分析"
                },
                "speaking_style": {
                    "tone": "专业、客观",
                    "vocabulary_level": "产品专业词汇",
                    "sentence_length": "中等长度",
                    "use_examples": True,
                    "emotional_expression": "适度理性"
                }
            },
            {
                "id": "tech_lead",
                "name": "技术总监模板",
                "role": "技术总监", 
                "description": "技术架构和开发专家，专注技术方案和系统稳定性",
                "personality_traits": {
                    "personality_type": "理性务实",
                    "communication_style": "精确严谨",
                    "decision_making": "技术导向",
                    "collaboration_style": "专业支持",
                    "stress_response": "逻辑分析"
                },
                "speaking_style": {
                    "tone": "专业、严谨",
                    "vocabulary_level": "技术专业词汇",
                    "sentence_length": "详细准确",
                    "use_examples": True,
                    "emotional_expression": "控制理性"
                }
            }
        ]
        
        return templates