from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from ..models import get_database_session, AgentConfig
from ..services.agent_service import AgentService

router = APIRouter()

# Pydantic 模型定义
class AgentCreate(BaseModel):
    name: str
    role: str
    avatar_url: Optional[str] = None
    personality_traits: Dict[str, Any]
    speaking_style: Dict[str, Any]
    behavior_settings: Dict[str, Any]
    backstory: str
    goal: str
    expertise_areas: Optional[List[str]] = []
    is_active: bool = True

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    personality_traits: Optional[Dict[str, Any]] = None
    speaking_style: Optional[Dict[str, Any]] = None
    behavior_settings: Optional[Dict[str, Any]] = None
    backstory: Optional[str] = None
    goal: Optional[str] = None
    expertise_areas: Optional[List[str]] = None
    is_active: Optional[bool] = None

class AgentResponse(BaseModel):
    id: int
    name: str
    role: str
    avatar_url: Optional[str]
    personality_traits: Dict[str, Any]
    speaking_style: Dict[str, Any]
    behavior_settings: Dict[str, Any]
    backstory: str
    goal: str
    expertise_areas: List[str]
    is_active: bool
    created_at: Optional[str]
    updated_at: Optional[str]
    created_by: Optional[str]

class TestAgentRequest(BaseModel):
    test_context: str
    meeting_context: Optional[Dict[str, Any]] = None

class CloneAgentRequest(BaseModel):
    new_name: str

def get_agent_service(db: Session = Depends(get_database_session)):
    """获取Agent服务实例"""
    return AgentService(db)

@router.post("/agents", response_model=AgentResponse)
async def create_agent(
    agent_data: AgentCreate,
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    创建新的Agent配置
    """
    try:
        agent = await agent_service.create_agent(
            agent_data=agent_data.dict(),
            created_by="api_user"  # TODO: 从认证信息获取用户ID
        )
        return AgentResponse(**agent.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/agents", response_model=List[AgentResponse])
def get_agents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(True),
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    获取Agent列表
    """
    try:
        agents = agent_service.get_agents(skip=skip, limit=limit, active_only=active_only)
        return [AgentResponse(**agent.to_dict()) for agent in agents]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/agents/{agent_id}", response_model=AgentResponse)
def get_agent(
    agent_id: int,
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    根据ID获取Agent配置
    """
    try:
        agent = agent_service.get_agent_by_id(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return AgentResponse(**agent.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    agent_data: AgentUpdate,
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    更新Agent配置
    """
    try:
        # 过滤None值
        update_data = {k: v for k, v in agent_data.dict().items() if v is not None}
        
        agent = await agent_service.update_agent(agent_id, update_data)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return AgentResponse(**agent.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/agents/{agent_id}")
def delete_agent(
    agent_id: int,
    hard_delete: bool = Query(False),
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    删除Agent配置 (支持软删除和硬删除)
    """
    try:
        if hard_delete:
            success = agent_service.hard_delete_agent(agent_id)
        else:
            success = agent_service.delete_agent(agent_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return {"message": "Agent deleted successfully", "hard_delete": hard_delete}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/agents/search")
def search_agents(
    keyword: str = Query(None),
    roles: Optional[List[str]] = Query(None),
    expertise_areas: Optional[List[str]] = Query(None),
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    搜索Agent
    """
    try:
        agents = agent_service.search_agents(
            keyword=keyword,
            roles=roles,
            expertise_areas=expertise_areas
        )
        return [AgentResponse(**agent.to_dict()) for agent in agents]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/agents/{agent_id}/test")
async def test_agent_response(
    agent_id: int,
    test_request: TestAgentRequest,
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    测试Agent响应
    """
    try:
        result = await agent_service.test_agent_response(
            agent_id=agent_id,
            test_context=test_request.test_context,
            meeting_context=test_request.meeting_context
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/agents/{agent_id}/clone", response_model=AgentResponse)
def clone_agent(
    agent_id: int,
    clone_request: CloneAgentRequest,
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    克隆Agent配置
    """
    try:
        agent = agent_service.clone_agent(
            agent_id=agent_id,
            new_name=clone_request.new_name,
            created_by="api_user"  # TODO: 从认证信息获取用户ID
        )
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return AgentResponse(**agent.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/agents/statistics")
def get_agent_statistics(
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    获取Agent统计信息
    """
    try:
        stats = agent_service.get_agent_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/agents/validate")
def validate_agent_config(
    agent_data: AgentCreate,
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    验证Agent配置数据
    """
    try:
        errors = agent_service.validate_agent_config(agent_data.dict())
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/agents/templates")
def get_agent_templates(
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    获取Agent模板列表
    """
    try:
        templates = agent_service.get_agent_templates()
        return {"templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")