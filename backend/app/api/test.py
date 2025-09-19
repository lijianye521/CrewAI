from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
import json
from datetime import datetime

from ..models import get_database_session, AgentConfig, Meeting, MeetingParticipant

router = APIRouter()

@router.get("/test/data-overview")
def get_data_overview(db: Session = Depends(get_database_session)):
    """
    获取数据概览 - 用于检查系统是否正常工作
    """
    try:
        # 统计各表数据
        agents_count = db.query(AgentConfig).count()
        meetings_count = db.query(Meeting).count()
        participants_count = db.query(MeetingParticipant).count()

        # 获取最新的几条数据
        latest_agents = db.query(AgentConfig).order_by(AgentConfig.id.desc()).limit(3).all()
        latest_meetings = db.query(Meeting).order_by(Meeting.id.desc()).limit(3).all()

        return {
            "system_status": "running",
            "timestamp": datetime.utcnow().isoformat(),
            "data_counts": {
                "agents": agents_count,
                "meetings": meetings_count,
                "participants": participants_count
            },
            "latest_data": {
                "agents": [
                    {
                        "id": agent.id,
                        "name": agent.name,
                        "role": agent.role,
                        "is_active": agent.is_active,
                        "created_at": agent.created_at.isoformat() if agent.created_at else None
                    } for agent in latest_agents
                ],
                "meetings": [
                    {
                        "id": meeting.id,
                        "title": meeting.title,
                        "status": meeting.status,
                        "topic": meeting.topic,
                        "created_at": meeting.created_at.isoformat() if meeting.created_at else None
                    } for meeting in latest_meetings
                ]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get data overview: {str(e)}")

@router.get("/test/api-status")
def get_api_status():
    """
    获取API接口状态概览
    """
    api_endpoints = {
        "agent_management": {
            "GET /api/v1/agents": "获取智能体列表",
            "POST /api/v1/agents": "创建智能体",
            "GET /api/v1/agents/{id}": "获取智能体详情",
            "PUT /api/v1/agents/{id}": "更新智能体",
            "DELETE /api/v1/agents/{id}": "删除智能体"
        },
        "meeting_management": {
            "GET /api/v1/meetings": "获取会议列表",
            "POST /api/v1/meetings": "创建会议",
            "GET /api/v1/meetings/{id}": "获取会议详情",
            "PUT /api/v1/meetings/{id}": "更新会议",
            "DELETE /api/v1/meetings/{id}": "删除会议",
            "PUT /api/v1/meetings/{id}/status": "更新会议状态",
            "GET /api/v1/meetings/{id}/messages": "获取会议消息",
            "GET /api/v1/meetings/{id}/replay": "获取会议回放"
        },
        "configuration": {
            "GET /api/v1/config/models": "获取模型配置",
            "POST /api/v1/config/models": "更新模型配置",
            "POST /api/v1/config/test-connection": "测试模型连接"
        },
        "system": {
            "GET /health": "健康检查",
            "GET /api/v1/system/status": "系统状态",
            "WS /api/v1/ws": "WebSocket连接"
        }
    }

    return {
        "api_version": "v1",
        "status": "ready",
        "documentation": "/docs",
        "endpoints": api_endpoints,
        "frontend_urls": {
            "local": "http://localhost:3000",
            "api_docs": "http://localhost:8001/docs"
        }
    }

@router.post("/test/create-sample-meeting")
async def create_sample_meeting(db: Session = Depends(get_database_session)):
    """
    创建示例会议数据用于测试
    """
    try:
        from ..services.meeting_service import MeetingService
        meeting_service = MeetingService(db)

        # 检查是否有智能体可用
        agents = db.query(AgentConfig).filter(AgentConfig.is_active == True).limit(3).all()
        if not agents:
            raise HTTPException(status_code=400, detail="No active agents found. Please create agents first.")

        # 创建示例会议
        sample_meeting_data = {
            "title": "产品策略讨论会",
            "description": "讨论下季度产品发展策略和市场定位",
            "topic": "产品策略",
            "meeting_rules": {
                "max_participants": 5,
                "max_duration_minutes": 90,
                "speaking_time_limit": 180,
                "discussion_rounds": 4
            },
            "discussion_config": {
                "discussion_topic": "下季度产品发展策略",
                "context_description": "基于当前市场趋势和竞争环境",
                "expected_outcomes": ["确定产品方向", "制定营销策略", "资源分配计划"],
                "discussion_style": "结构化讨论"
            },
            "participant_agents": [agent.id for agent in agents[:3]]
        }

        meeting = await meeting_service.create_meeting(
            meeting_data=sample_meeting_data,
            created_by="test_user"
        )

        return {
            "message": "Sample meeting created successfully",
            "meeting": meeting.to_dict()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create sample meeting: {str(e)}")