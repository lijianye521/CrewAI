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

@router.post("/simple-test")
async def simple_test(data: Dict[str, Any]):
    """简单测试接口"""
    return {
        "received": data,
        "status": "success",
        "message": "数据接收成功"
    }

@router.get("/system/status")
async def get_system_status():
    """获取系统整体状态"""
    from ..services.deepseek_service import api_key_manager
    from datetime import datetime
    
    return {
        "system": "CrewAI Multi-Agent Meeting System",
        "version": "2.0.0",
        "status": "running",
        "database": "connected",
        "ai_service": {
            "provider": "DeepSeek",
            "api_configured": api_key_manager.has_key("default"),
            "available_models": ["deepseek-chat", "deepseek-reasoner"]
        },
        "features": {
            "agent_management": True,
            "meeting_system": True,
            "real_time_collaboration": True,
            "model_configuration": True
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/config/test")
async def test_config_endpoint(config_data: Dict[str, Any]):
    """测试配置接口"""
    print(f"Received config data: {config_data}")
    
    # 简单验证
    required_fields = ["openai_api_key", "openai_base_url", "model"]
    missing_fields = [field for field in required_fields if field not in config_data]
    
    if missing_fields:
        return {
            "success": False,
            "message": f"Missing required fields: {', '.join(missing_fields)}",
            "received_data": config_data
        }
    
    # 保存API密钥
    from ..services.deepseek_service import api_key_manager
    api_key_manager.set_key("default", config_data["openai_api_key"])
    
    return {
        "success": True,
        "message": "配置已成功保存",
        "config": {
            "api_key_masked": config_data["openai_api_key"][:10] + "...",
            "base_url": config_data["openai_base_url"],
            "model": config_data["model"],
            "max_tokens": config_data.get("max_tokens", 2000),
            "temperature": config_data.get("temperature", 0.7)
        }
    }

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