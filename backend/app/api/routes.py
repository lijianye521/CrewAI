from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any
import json
from datetime import datetime

router = APIRouter()

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "crewai-backend"}

@router.post("/analysis/start")
async def start_analysis(request: Dict[str, Any]):
    """
    Start investment analysis for a given stock symbol
    """
    stock_symbol = request.get("stock_symbol")
    if not stock_symbol:
        return {"error": "Stock symbol is required"}
    
    # TODO: Implement CrewAI analysis
    return {
        "status": "analysis_started", 
        "stock_symbol": stock_symbol,
        "session_id": "temp_session_123"
    }

@router.get("/analysis/{session_id}")
async def get_analysis_results(session_id: str):
    """
    Get analysis results for a session
    """
    # TODO: Implement result retrieval
    return {
        "session_id": session_id,
        "status": "completed",
        "results": {
            "recommendation": "BUY",
            "confidence": 0.85,
            "target_price": 150.0
        }
    }

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket 连接端点 - 用于全局实时通信
    
    WebSocket URL: ws://localhost:8000/api/v1/ws
    
    支持的消息类型:
    - meeting_status: 会议状态更新
    - new_message: 新消息通知
    - agent_status: 智能体状态更新
    """
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理不同类型的消息
            message_type = message.get("type", "ping")
            
            if message_type == "ping":
                # 心跳检测
                await websocket.send_text(json.dumps({"type": "pong"}))
            else:
                # 广播消息给所有连接的客户端
                await manager.broadcast(json.dumps({
                    "type": message_type,
                    "data": message,
                    "timestamp": datetime.utcnow().isoformat()
                }))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)