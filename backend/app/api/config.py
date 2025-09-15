from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from ..models import get_database_session
from ..services.deepseek_service import deepseek_service, api_key_manager

router = APIRouter()

# Pydantic 模型定义
class APIKeyRequest(BaseModel):
    api_key: str
    user_id: Optional[str] = "default"

class ModelConfigRequest(BaseModel):
    model: str
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000

class SystemConfigResponse(BaseModel):
    available_models: List[str]
    current_model: str
    api_key_configured: bool
    service_status: str

# API密钥管理
@router.post("/config/deepseek-key")
async def set_deepseek_api_key(
    key_request: APIKeyRequest
):
    """
    设置 DeepSeek API 密钥
    """
    try:
        # 验证API密钥
        is_valid = await deepseek_service.validate_api_key(key_request.api_key)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid API key")
        
        # 保存API密钥
        api_key_manager.set_key(key_request.user_id, key_request.api_key)
        
        return {
            "message": "API key saved successfully",
            "valid": True,
            "user_id": key_request.user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save API key: {str(e)}")

@router.get("/config/deepseek-key")
def get_deepseek_api_key_status(
    user_id: str = "default"
):
    """
    检查 DeepSeek API 密钥状态
    """
    try:
        has_key = api_key_manager.has_key(user_id)
        
        return {
            "user_id": user_id,
            "has_api_key": has_key,
            "key_masked": "sk-****" if has_key else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check API key: {str(e)}")

@router.delete("/config/deepseek-key")
def remove_deepseek_api_key(
    user_id: str = "default"
):
    """
    删除 DeepSeek API 密钥
    """
    try:
        api_key_manager.remove_key(user_id)
        
        return {
            "message": "API key removed successfully",
            "user_id": user_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove API key: {str(e)}")

# 模型配置管理
@router.get("/config/models")
def get_available_models():
    """
    获取可用的模型列表
    """
    try:
        models = deepseek_service.get_available_models()
        
        return {
            "available_models": models,
            "default_model": "deepseek-chat",
            "model_info": {
                "deepseek-chat": {
                    "name": "DeepSeek Chat",
                    "description": "通用对话模型，适合大部分场景",
                    "max_tokens": 4000,
                    "pricing": "按token计费"
                },
                "deepseek-coder": {
                    "name": "DeepSeek Coder", 
                    "description": "代码生成和编程相关模型",
                    "max_tokens": 4000,
                    "pricing": "按token计费"
                },
                "deepseek-math": {
                    "name": "DeepSeek Math",
                    "description": "数学和逻辑推理模型",
                    "max_tokens": 4000,
                    "pricing": "按token计费"
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")

@router.post("/config/test-model")
async def test_model_connection(
    config_request: ModelConfigRequest,
    user_id: str = "default"
):
    """
    测试模型连接和配置
    """
    try:
        # 检查API密钥
        if not api_key_manager.has_key(user_id):
            raise HTTPException(status_code=400, detail="API key not configured")
        
        # 获取API密钥
        api_key = api_key_manager.get_key(user_id)
        test_service = deepseek_service.__class__(api_key)
        
        # 测试模型调用
        test_messages = [
            {"role": "user", "content": "Hello, this is a test message. Please respond briefly."}
        ]
        
        response = await test_service.chat_completion(
            messages=test_messages,
            model=config_request.model,
            temperature=config_request.temperature,
            max_tokens=min(config_request.max_tokens, 100)  # 限制测试token数
        )
        
        # 估算成本
        usage = response.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)
        estimated_cost = deepseek_service.estimate_cost(input_tokens, output_tokens)
        
        return {
            "status": "success",
            "model": config_request.model,
            "response_preview": response["choices"][0]["message"]["content"][:100] + "..." if len(response["choices"][0]["message"]["content"]) > 100 else response["choices"][0]["message"]["content"],
            "token_usage": usage,
            "estimated_cost_usd": round(estimated_cost, 6),
            "test_timestamp": "2024-01-01T00:00:00Z"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model test failed: {str(e)}")

# 系统配置
@router.get("/config/system", response_model=SystemConfigResponse)
def get_system_config(
    user_id: str = "default"
):
    """
    获取系统配置概览
    """
    try:
        has_key = api_key_manager.has_key(user_id)
        available_models = deepseek_service.get_available_models()
        
        # 确定服务状态
        if has_key:
            service_status = "ready"
        else:
            service_status = "api_key_required"
        
        return SystemConfigResponse(
            available_models=available_models,
            current_model="deepseek-chat",
            api_key_configured=has_key,
            service_status=service_status
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system config: {str(e)}")

@router.get("/config/cost-estimate")
def get_cost_estimate(
    input_tokens: int = 1000,
    output_tokens: int = 500
):
    """
    获取成本估算
    """
    try:
        cost = deepseek_service.estimate_cost(input_tokens, output_tokens)
        
        # 不同场景的成本估算
        scenarios = {
            "short_conversation": deepseek_service.estimate_cost(500, 200),
            "medium_conversation": deepseek_service.estimate_cost(1500, 800),
            "long_conversation": deepseek_service.estimate_cost(3000, 1500),
            "meeting_hour": deepseek_service.estimate_cost(5000, 3000)  # 假设一小时会议
        }
        
        return {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_cost_usd": round(cost, 6),
            "scenarios": {k: round(v, 6) for k, v in scenarios.items()},
            "currency": "USD",
            "last_updated": "2024-01-01"  # TODO: 实际更新时间
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate cost estimate: {str(e)}")

# 健康检查
@router.get("/config/health")
async def check_service_health(
    user_id: str = "default"
):
    """
    检查服务健康状态
    """
    try:
        health_status = {
            "database": "healthy",  # TODO: 实际检查数据库连接
            "deepseek_api": "unknown",
            "api_key_status": "configured" if api_key_manager.has_key(user_id) else "missing",
            "timestamp": "2024-01-01T00:00:00Z"
        }
        
        # 测试API连接 (如果有密钥)
        if api_key_manager.has_key(user_id):
            try:
                api_key = api_key_manager.get_key(user_id)
                test_service = deepseek_service.__class__(api_key)
                await test_service.chat_completion(
                    messages=[{"role": "user", "content": "test"}],
                    max_tokens=1
                )
                health_status["deepseek_api"] = "healthy"
            except:
                health_status["deepseek_api"] = "error"
        
        # 确定总体状态
        if health_status["database"] == "healthy" and health_status["deepseek_api"] == "healthy":
            overall_status = "healthy"
        elif health_status["api_key_status"] == "missing":
            overall_status = "configuration_required"
        else:
            overall_status = "degraded"
        
        health_status["overall"] = overall_status
        
        return health_status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# 导出配置
@router.get("/config/export")
def export_system_config():
    """
    导出系统配置 (不包含敏感信息)
    """
    try:
        config = {
            "version": "1.0.0",
            "models": {
                "available": deepseek_service.get_available_models(),
                "default": "deepseek-chat"
            },
            "limits": {
                "max_tokens_per_request": 4000,
                "max_participants_per_meeting": 10,
                "max_messages_per_meeting": 1000
            },
            "features": {
                "agent_customization": True,
                "meeting_replay": True,
                "real_time_collaboration": True,
                "analytics": True
            },
            "export_timestamp": "2024-01-01T00:00:00Z"
        }
        
        return config
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export config: {str(e)}")