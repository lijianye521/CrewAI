from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import json
import logging
import asyncio
from datetime import datetime

from ..models import get_database_session, Meeting, MeetingParticipant, MeetingMessage
from ..services.meeting_service import MeetingService
from ..services.meeting_scheduler import get_meeting_scheduler
from ..services.deepseek_service import deepseek_service

router = APIRouter()
logger = logging.getLogger(__name__)

# WebSocket连接管理器
class MeetingConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}  # meeting_id -> [websockets]
    
    async def connect(self, websocket: WebSocket, meeting_id: int):
        await websocket.accept()
        if meeting_id not in self.active_connections:
            self.active_connections[meeting_id] = []
        self.active_connections[meeting_id].append(websocket)
        
    def disconnect(self, websocket: WebSocket, meeting_id: int):
        if meeting_id in self.active_connections:
            if websocket in self.active_connections[meeting_id]:
                self.active_connections[meeting_id].remove(websocket)
    
    async def broadcast_to_meeting(self, meeting_id: int, message: Dict[str, Any]):
        if meeting_id in self.active_connections:
            message_text = json.dumps(message, ensure_ascii=False)
            disconnected = []
            for websocket in self.active_connections[meeting_id]:
                try:
                    await websocket.send_text(message_text)
                except:
                    disconnected.append(websocket)
            
            # 清理断开的连接
            for ws in disconnected:
                self.active_connections[meeting_id].remove(ws)

meeting_manager = MeetingConnectionManager()

# Pydantic 模型定义
class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    topic: str
    scheduled_start_time: Optional[datetime] = None
    meeting_rules: Optional[Dict[str, Any]] = None
    discussion_config: Optional[Dict[str, Any]] = None
    participant_agents: Optional[List[int]] = None

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    topic: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    duration_limit: Optional[int] = None
    meeting_rules: Optional[Dict[str, Any]] = None
    discussion_config: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None
    conclusions: Optional[List[str]] = None
    action_items: Optional[List[str]] = None

class MeetingParticipantCreate(BaseModel):
    agent_id: int
    role_in_meeting: str
    speaking_priority: float = 1.0
    participant_settings: Optional[Dict[str, Any]] = None

class MeetingResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    topic: str
    status: str
    scheduled_start: Optional[datetime]
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    duration_limit: Optional[int]
    meeting_rules: Dict[str, Any]
    discussion_config: Dict[str, Any]
    summary: Optional[str]
    conclusions: Optional[List[str]]
    action_items: Optional[List[str]]
    created_at: datetime
    updated_at: datetime
    created_by: str
    participants: Optional[List[Dict[str, Any]]] = None

class MessageResponse(BaseModel):
    id: int
    meeting_id: int
    agent_id: int
    agent_name: Optional[str] = None
    message_content: str
    message_type: str
    status: str
    created_at: datetime
    sent_at: Optional[datetime]
    metadata: Optional[Dict[str, Any]]

def get_meeting_service(db: Session = Depends(get_database_session)):
    """获取Meeting服务实例"""
    return MeetingService(db)

@router.post("/meetings", response_model=MeetingResponse)
async def create_meeting(
    meeting_data: MeetingCreate,
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    创建新会议
    """
    try:
        meeting = await meeting_service.create_meeting(
            meeting_data=meeting_data.dict(),
            created_by="api_user"  # TODO: 从认证信息获取用户ID
        )
        return MeetingResponse(**meeting.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/meetings")
def get_meetings(
    status: Optional[str] = Query(None, description="会议状态筛选 (draft|scheduled|active|paused|completed|cancelled)"),
    page: int = Query(1, ge=1, description="分页页码，默认1"),
    limit: int = Query(10, ge=1, le=100, description="每页数量，默认10"),
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    获取会议列表
    
    Query Parameters:
    - status: string (可选) - 会议状态筛选 (draft|scheduled|active|paused|completed|cancelled)
    - page: int (可选) - 分页页码，默认1
    - limit: int (可选) - 每页数量，默认10
    """
    try:
        skip = (page - 1) * limit
        meetings = meeting_service.get_meetings(skip=skip, limit=limit, status=status)
        total = meeting_service.count_meetings(status=status)
        
        meeting_list = []
        for meeting in meetings:
            meeting_dict = meeting.to_dict()
            # 计算参与者数量和消息数量
            meeting_dict['participants_count'] = meeting_service.count_participants(meeting.id)
            meeting_dict['messages_count'] = meeting_service.count_messages(meeting.id)
            meeting_list.append(meeting_dict)
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": meeting_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/meetings/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: int,
    include_participants: bool = Query(True),
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    获取会议详情
    """
    try:
        meeting = meeting_service.get_meeting_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        response_data = meeting.to_dict()
        
        if include_participants:
            participants = meeting_service.get_meeting_participants(meeting_id)
            response_data["participants"] = [p.to_dict() for p in participants]
        
        return MeetingResponse(**response_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/meetings/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: int,
    meeting_data: MeetingUpdate,
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    更新会议信息
    """
    try:
        # 过滤None值
        update_data = {k: v for k, v in meeting_data.dict().items() if v is not None}
        
        meeting = await meeting_service.update_meeting(meeting_id, update_data)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        return MeetingResponse(**meeting.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/meetings/{meeting_id}")
def delete_meeting(
    meeting_id: int,
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    删除会议
    """
    try:
        success = meeting_service.delete_meeting(meeting_id)
        if not success:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        return {"message": "会议删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/meetings/{meeting_id}/participants")
async def add_meeting_participant(
    meeting_id: int,
    participant_data: MeetingParticipantCreate,
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    添加会议参与者
    """
    try:
        participant = await meeting_service.add_participant(
            meeting_id=meeting_id,
            participant_data=participant_data.dict()
        )
        return participant.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/meetings/{meeting_id}/participants")
def get_meeting_participants(
    meeting_id: int,
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    获取会议参与者列表
    """
    try:
        participants = meeting_service.get_meeting_participants(meeting_id)
        return [p.to_dict() for p in participants]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/meetings/{meeting_id}/status")
async def update_meeting_status(
    meeting_id: int,
    status_update: Dict[str, str],
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    更新会议状态
    
    Request Body:
    {
      "status": "active" // draft|scheduled|active|paused|completed|cancelled
    }
    """
    try:
        new_status = status_update.get("status")
        if not new_status:
            raise HTTPException(status_code=400, detail="Status is required")
        
        valid_statuses = ["draft", "scheduled", "active", "paused", "completed", "cancelled"]
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        meeting = await meeting_service.update_meeting_status(meeting_id, new_status)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        return {
            "id": meeting.id,
            "status": meeting.status,
            "updated_at": meeting.updated_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/meetings/{meeting_id}/participants/{participant_id}")
def remove_meeting_participant(
    meeting_id: int,
    participant_id: int,
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    移除会议参与者
    """
    try:
        success = meeting_service.remove_participant(meeting_id, participant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        return {"message": "Participant removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/meetings/{meeting_id}/start")
async def start_meeting(
    meeting_id: int,
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    启动会议
    """
    try:
        meeting = await meeting_service.start_meeting(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # 广播会议开始事件
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "meeting_started",
            "meeting_id": meeting_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {"message": "Meeting started", "meeting": meeting.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/meetings/{meeting_id}/stop")
async def stop_meeting(
    meeting_id: int,
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    结束会议
    """
    try:
        meeting = await meeting_service.stop_meeting(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # 广播会议结束事件
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "meeting_ended",
            "meeting_id": meeting_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {"message": "Meeting stopped", "meeting": meeting.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/meetings/{meeting_id}/messages", response_model=List[MessageResponse])
def get_meeting_messages(
    meeting_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    获取会议消息列表
    """
    try:
        messages = meeting_service.get_meeting_messages(meeting_id, skip=skip, limit=limit)
        return [MessageResponse(**msg.to_dict()) for msg in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/meetings/{meeting_id}/replay")
def get_meeting_replay(
    meeting_id: int,
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    获取会议回放数据
    """
    try:
        replay_data = meeting_service.get_meeting_replay(meeting_id)
        if not replay_data:
            raise HTTPException(status_code=404, detail="Meeting not found or no replay data")
        
        return replay_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/meetings/{meeting_id}/analytics")
def get_meeting_analytics(
    meeting_id: int,
    meeting_service: MeetingService = Depends(get_meeting_service)
):
    """
    获取会议分析数据
    """
    try:
        analytics = meeting_service.get_meeting_analytics(meeting_id)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.websocket("/meetings/{meeting_id}/ws")
async def websocket_meeting_endpoint(
    websocket: WebSocket,
    meeting_id: int,
    db: Session = Depends(get_database_session)
):
    """
    会议实时WebSocket连接
    """
    meeting_service = MeetingService(db)
    
    # 验证会议是否存在
    meeting = meeting_service.get_meeting_by_id(meeting_id)
    if not meeting:
        await websocket.close(code=4004, reason="Meeting not found")
        return
    
    await meeting_manager.connect(websocket, meeting_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理不同类型的消息
            message_type = message.get("type")
            
            if message_type == "agent_speak":
                # Agent发言请求
                await handle_agent_speak(meeting_id, message, meeting_service)
            
            elif message_type == "get_next_speaker":
                # 获取下一个发言者
                next_speaker = await meeting_service.get_next_speaker(meeting_id)
                await meeting_manager.broadcast_to_meeting(meeting_id, {
                    "type": "next_speaker",
                    "speaker": next_speaker,
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            elif message_type == "ping":
                # 心跳检测
                await websocket.send_text(json.dumps({"type": "pong"}))
            
    except WebSocketDisconnect:
        meeting_manager.disconnect(websocket, meeting_id)
        logger.info(f"WebSocket disconnected from meeting {meeting_id}")
    except Exception as e:
        logger.error(f"WebSocket error in meeting {meeting_id}: {str(e)}")
        meeting_manager.disconnect(websocket, meeting_id)

async def handle_agent_speak(meeting_id: int, message: Dict[str, Any], meeting_service: MeetingService):
    """处理Agent发言"""
    try:
        agent_id = message.get("agent_id")
        context = message.get("context", "")
        
        if not agent_id:
            return
        
        # 生成Agent响应
        response = await meeting_service.generate_agent_message(
            meeting_id=meeting_id,
            agent_id=agent_id,
            context=context
        )
        
        # 广播Agent发言
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "agent_message",
            "message": response,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error handling agent speak: {str(e)}")
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "error",
            "message": f"Agent speak failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        })

# 智能调度相关API端点

@router.post("/meetings/{meeting_id}/schedule/start")
async def start_intelligent_scheduling(
    meeting_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_database_session)
):
    """
    启动智能调度系统
    """
    try:
        scheduler = get_meeting_scheduler(db)
        
        # 初始化会议调度
        success = await scheduler.initialize_meeting(meeting_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to initialize meeting scheduler")
        
        # 在后台启动会议循环
        background_tasks.add_task(run_meeting_with_broadcasting, meeting_id, db)
        
        # 广播调度启动事件
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "scheduling_started",
            "meeting_id": meeting_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {"message": "Intelligent scheduling started", "meeting_id": meeting_id}
        
    except Exception as e:
        logger.error(f"Failed to start scheduling for meeting {meeting_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start scheduling: {str(e)}")

@router.post("/meetings/{meeting_id}/schedule/pause")
async def pause_meeting_scheduling(
    meeting_id: int,
    db: Session = Depends(get_database_session)
):
    """
    暂停会议调度
    """
    try:
        scheduler = get_meeting_scheduler(db)
        success = scheduler.pause_meeting(meeting_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Meeting not found in active scheduling")
        
        # 广播暂停事件
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "meeting_paused",
            "meeting_id": meeting_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {"message": "Meeting scheduling paused", "meeting_id": meeting_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to pause meeting {meeting_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to pause meeting: {str(e)}")

@router.post("/meetings/{meeting_id}/schedule/resume")
async def resume_meeting_scheduling(
    meeting_id: int,
    db: Session = Depends(get_database_session)
):
    """
    恢复会议调度
    """
    try:
        scheduler = get_meeting_scheduler(db)
        success = scheduler.resume_meeting(meeting_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Meeting not found in active scheduling")
        
        # 广播恢复事件
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "meeting_resumed",
            "meeting_id": meeting_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {"message": "Meeting scheduling resumed", "meeting_id": meeting_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resume meeting {meeting_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to resume meeting: {str(e)}")

@router.post("/meetings/{meeting_id}/schedule/stop")
async def stop_meeting_scheduling(
    meeting_id: int,
    db: Session = Depends(get_database_session)
):
    """
    停止会议调度
    """
    try:
        scheduler = get_meeting_scheduler(db)
        success = scheduler.stop_meeting(meeting_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Meeting not found in active scheduling")
        
        # 广播停止事件
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "meeting_stopped",
            "meeting_id": meeting_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {"message": "Meeting scheduling stopped", "meeting_id": meeting_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to stop meeting {meeting_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to stop meeting: {str(e)}")

@router.get("/meetings/{meeting_id}/schedule/status")
def get_meeting_scheduling_status(
    meeting_id: int,
    db: Session = Depends(get_database_session)
):
    """
    获取会议调度状态
    """
    try:
        scheduler = get_meeting_scheduler(db)
        stats = scheduler.get_meeting_statistics(meeting_id)
        
        return {
            "meeting_id": meeting_id,
            "statistics": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get scheduling status for meeting {meeting_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get scheduling status: {str(e)}")

@router.get("/meetings/{meeting_id}/schedule/next-speaker")
async def get_next_speaker(
    meeting_id: int,
    db: Session = Depends(get_database_session)
):
    """
    获取下一个发言者
    """
    try:
        scheduler = get_meeting_scheduler(db)
        next_speaker_info = scheduler.get_next_speaker(meeting_id)
        
        if not next_speaker_info:
            return {
                "meeting_id": meeting_id,
                "next_speaker": None,
                "message": "No next speaker available",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        agent, score = next_speaker_info
        
        return {
            "meeting_id": meeting_id,
            "next_speaker": {
                "agent_id": agent.config.id,
                "agent_name": agent.config.name,
                "role": agent.config.role,
                "score": score
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get next speaker for meeting {meeting_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get next speaker: {str(e)}")

@router.post("/meetings/{meeting_id}/schedule/force-speak")
async def force_agent_speak(
    meeting_id: int,
    agent_id: int,
    db: Session = Depends(get_database_session)
):
    """
    强制指定Agent发言
    """
    try:
        scheduler = get_meeting_scheduler(db)
        
        # 获取指定的Agent
        agent = scheduler.agent_manager.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found in meeting")
        
        # 处理发言
        speaking_result = await scheduler.process_speaking_turn(meeting_id, agent, force_speak=True)
        
        if not speaking_result:
            raise HTTPException(status_code=500, detail="Failed to process speaking turn")
        
        # 广播新消息
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "new_message",
            "message": speaking_result,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {
            "message": "Agent forced to speak successfully",
            "speaking_result": speaking_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to force agent speak: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to force agent speak: {str(e)}")

async def run_meeting_with_broadcasting(meeting_id: int, db: Session):
    """
    运行会议循环并广播消息
    """
    scheduler = get_meeting_scheduler(db)
    
    try:
        logger.info(f"Starting meeting cycle with broadcasting for meeting {meeting_id}")
        
        # 启动会议循环
        success = await scheduler.run_meeting_cycle(meeting_id, max_iterations=100)
        
        # 广播会议结束
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "meeting_cycle_completed",
            "meeting_id": meeting_id,
            "success": success,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        logger.info(f"Meeting cycle completed for meeting {meeting_id}, success: {success}")
        
    except Exception as e:
        logger.error(f"Error in meeting cycle for meeting {meeting_id}: {str(e)}")
        
        # 广播错误事件
        await meeting_manager.broadcast_to_meeting(meeting_id, {
            "type": "meeting_error",
            "meeting_id": meeting_id,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        })