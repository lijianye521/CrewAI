from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from ..models import get_database_session
from ..services.deepseek_service import deepseek_service, api_key_manager
from datetime import datetime

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
def get_model_config(user_id: str = "default"):
    """
    获取模型配置
    
    根据 DeepSeek API 文档：https://api-docs.deepseek.com/zh-cn/
    - Base URL: https://api.deepseek.com
    - 兼容 OpenAI API 格式
    - 支持模型: deepseek-chat, deepseek-reasoner
    """
    try:
        has_key = api_key_manager.has_key(user_id)
        
        return {
            "openai_api_key": "sk-****" if has_key else None,
            "openai_base_url": "https://api.deepseek.com",
            "model": "deepseek-chat",
            "max_tokens": 2000,
            "temperature": 0.7,
            "is_configured": has_key,
            "available_models": [
                {
                    "id": "deepseek-chat",
                    "name": "DeepSeek Chat (V3.1)",
                    "description": "DeepSeek-V3.1 非思考模式，适合日常对话和任务",
                    "max_tokens": 4096,
                    "pricing": {
                        "input": "$0.14 / 1M tokens",
                        "output": "$0.28 / 1M tokens"
                    }
                },
                {
                    "id": "deepseek-reasoner",
                    "name": "DeepSeek Reasoner (V3.1)",
                    "description": "DeepSeek-V3.1 思考模式，适合复杂推理任务",
                    "max_tokens": 4096,
                    "pricing": {
                        "input": "$0.55 / 1M tokens",
                        "output": "$2.19 / 1M tokens"
                    }
                }
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model config: {str(e)}")

@router.post("/config/models")
async def update_model_config(
    config_data: Dict[str, Any],
    user_id: str = "default"
):
    """
    更新模型配置
    
    支持 DeepSeek API 配置:
    {
      "openai_api_key": "sk-...",  // DeepSeek API Key
      "openai_base_url": "https://api.deepseek.com",
      "model": "deepseek-chat",  // deepseek-chat 或 deepseek-reasoner
      "max_tokens": 2000,
      "temperature": 0.7
    }
    """
    try:
        # 验证模型是否支持
        supported_models = ["deepseek-chat", "deepseek-reasoner"]
        if "model" in config_data and config_data["model"] not in supported_models:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported model. Supported models: {', '.join(supported_models)}"
            )
        
        # 验证 base_url
        if "openai_base_url" in config_data:
            base_url = config_data["openai_base_url"]
            if not base_url.startswith("https://api.deepseek.com"):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid base URL. Please use https://api.deepseek.com for DeepSeek API"
                )
        
        # 如果提供了API密钥，验证并保存
        if "openai_api_key" in config_data:
            api_key = config_data["openai_api_key"]
            
            # 验证 API Key 格式
            if not api_key.startswith("sk-"):
                raise HTTPException(status_code=400, detail="Invalid API key format. DeepSeek API key should start with 'sk-'")
            
            # 验证API密钥有效性
            is_valid = await deepseek_service.validate_api_key(api_key)
            if not is_valid:
                raise HTTPException(status_code=400, detail="Invalid API key. Please check your DeepSeek API key.")
            
            api_key_manager.set_key(user_id, api_key)
        
        # TODO: 保存其他配置到数据库
        # 可以保存 model, max_tokens, temperature 等参数
        
        return {
            "message": "DeepSeek 模型配置更新成功",
            "is_configured": True,
            "config": {
                "base_url": config_data.get("openai_base_url", "https://api.deepseek.com"),
                "model": config_data.get("model", "deepseek-chat"),
                "max_tokens": config_data.get("max_tokens", 2000),
                "temperature": config_data.get("temperature", 0.7)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update model config: {str(e)}")

@router.post("/config/test-connection")
async def test_connection(
    test_config: Dict[str, Any]
):
    """
    测试 DeepSeek 模型连接
    
    Request Body:
    {
      "openai_api_key": "sk-...",  // DeepSeek API Key
      "openai_base_url": "https://api.deepseek.com",
      "model": "deepseek-chat"  // deepseek-chat 或 deepseek-reasoner
    }
    
    根据 DeepSeek API 文档进行连接测试
    """
    try:
        import time
        start_time = time.time()
        
        # 获取测试参数
        api_key = test_config.get("openai_api_key")
        base_url = test_config.get("openai_base_url", "https://api.deepseek.com")
        model = test_config.get("model", "deepseek-chat")
        
        if not api_key:
            raise HTTPException(status_code=400, detail="DeepSeek API key is required")
        
        # 验证 API Key 格式
        if not api_key.startswith("sk-"):
            raise HTTPException(status_code=400, detail="Invalid DeepSeek API key format")
        
        # 验证模型
        supported_models = ["deepseek-chat", "deepseek-reasoner"]
        if model not in supported_models:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported model '{model}'. Supported models: {', '.join(supported_models)}"
            )
        
        # 创建测试服务实例
        test_service = deepseek_service.__class__(api_key)
        
        # 测试模型调用 - 使用简单的测试消息
        test_messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "你好，这是一个连接测试。请简短回复。"}
        ]
        
        response = await test_service.chat_completion(
            messages=test_messages,
            model=model,
            max_tokens=20,  # 限制测试token数量
            temperature=0.1  # 使用低 temperature 保证稳定输出
        )
        
        # 计算响应时间
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # 获取响应内容和使用统计
        response_content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
        usage = response.get("usage", {})
        
        return {
            "success": True,
            "message": "DeepSeek API 连接测试成功",
            "model_info": {
                "model": model,
                "available": True,
                "response_time_ms": response_time_ms,
                "base_url": base_url
            },
            "test_response": {
                "content": response_content[:100] + "..." if len(response_content) > 100 else response_content,
                "usage": usage
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "unauthorized" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Invalid DeepSeek API key. Please check your API key.")
        elif "429" in error_msg or "rate limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="DeepSeek API rate limit exceeded. Please try again later.")
        else:
            raise HTTPException(status_code=500, detail=f"DeepSeek API connection test failed: {error_msg}")

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

# 获取 DeepSeek 模型信息
@router.get("/config/deepseek-models")
def get_deepseek_models():
    """
    获取 DeepSeek 支持的模型列表
    
    根据 DeepSeek API 文档返回最新的模型信息
    """
    try:
        models = [
            {
                "id": "deepseek-chat",
                "name": "DeepSeek Chat (V3.1)",
                "description": "DeepSeek-V3.1 非思考模式，适合日常对话和多数任务",
                "max_tokens": 4096,
                "context_length": "128K tokens",
                "pricing": {
                    "input": "$0.14 / 1M tokens",
                    "output": "$0.28 / 1M tokens"
                },
                "features": ["general_conversation", "coding", "analysis", "creative_writing"]
            },
            {
                "id": "deepseek-reasoner",
                "name": "DeepSeek Reasoner (V3.1)",
                "description": "DeepSeek-V3.1 思考模式，适合复杂推理和问题解决",
                "max_tokens": 4096,
                "context_length": "128K tokens",
                "pricing": {
                    "input": "$0.55 / 1M tokens",
                    "output": "$2.19 / 1M tokens"
                },
                "features": ["complex_reasoning", "math", "science", "logical_analysis"]
            }
        ]
        
        return {
            "models": models,
            "default_model": "deepseek-chat",
            "api_base_url": "https://api.deepseek.com",
            "documentation": "https://api-docs.deepseek.com/zh-cn/",
            "updated_at": "2024-12-26"  # DeepSeek V3 发布日期
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get DeepSeek models: {str(e)}")

# 导出配置
@router.get("/config/export")
def export_system_config():
    """
    导出系统配置 (不包含敏感信息)
    """
    try:
        config = {
            "version": "2.0.0",
            "ai_provider": {
                "name": "DeepSeek",
                "base_url": "https://api.deepseek.com",
                "default_model": "deepseek-chat",
                "supported_models": ["deepseek-chat", "deepseek-reasoner"]
            },
            "limits": {
                "max_tokens_per_request": 4096,
                "max_participants_per_meeting": 10,
                "max_messages_per_meeting": 1000,
                "context_length": "128K tokens"
            },
            "features": {
                "agent_customization": True,
                "meeting_replay": True,
                "real_time_collaboration": True,
                "analytics": True,
                "deepseek_integration": True
            },
            "export_timestamp": datetime.utcnow().isoformat()
        }
        
        return config
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export config: {str(e)}")