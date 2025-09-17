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
    获取模型配置 - 支持通用 OpenAI 兼容 API

    默认配置为 DeepSeek，但支持其他 OpenAI 兼容服务
    """
    try:
        has_key = api_key_manager.has_key(user_id)

        # 检查是否有存储的配置，否则使用默认的 DeepSeek 配置
        stored_config = getattr(api_key_manager, 'configs', {}).get(user_id, {})

        return {
            "openai_api_key": "sk-****" if has_key else None,
            "openai_base_url": stored_config.get("base_url", "https://api.deepseek.com"),
            "model": stored_config.get("model", "deepseek-chat"),
            "max_tokens": stored_config.get("max_tokens", 2000),
            "temperature": stored_config.get("temperature", 0.7),
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
                },
                {
                    "id": "gpt-3.5-turbo",
                    "name": "GPT-3.5 Turbo",
                    "description": "OpenAI GPT-3.5 Turbo 模型",
                    "max_tokens": 4096,
                    "pricing": {
                        "input": "自定义定价",
                        "output": "自定义定价"
                    }
                },
                {
                    "id": "gpt-4",
                    "name": "GPT-4",
                    "description": "OpenAI GPT-4 模型",
                    "max_tokens": 8192,
                    "pricing": {
                        "input": "自定义定价",
                        "output": "自定义定价"
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

    支持通用 OpenAI 兼容 API 配置:
    {
      "openai_api_key": "sk-...",  // API Key
      "openai_base_url": "https://api.openai.com/v1",  // 或其他兼容服务
      "model": "gpt-3.5-turbo",  // 任何兼容模型
      "max_tokens": 2000,
      "temperature": 0.7
    }
    """
    try:
        # 支持的常见模型（不再限制为 DeepSeek only）
        common_models = [
            "deepseek-chat", "deepseek-reasoner",
            "gpt-3.5-turbo", "gpt-4", "gpt-4-turbo",
            "claude-3-sonnet", "claude-3-opus"
        ]

        # 验证模型（如果提供了模型名）
        if "model" in config_data:
            model = config_data["model"]
            # 允许任何模型，但给出提示
            if model not in common_models:
                print(f"注意: 使用了不常见的模型 '{model}'，请确保API服务支持此模型")

        # 验证 base_url 格式
        if "openai_base_url" in config_data:
            base_url = config_data["openai_base_url"]
            if not base_url.startswith(("https://", "http://")):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid base URL format. Must start with https:// or http://"
                )

        # 如果提供了API密钥，验证并保存
        if "openai_api_key" in config_data:
            api_key = config_data["openai_api_key"]

            # 验证 API Key 格式（支持多种格式）
            if not api_key.startswith(("sk-", "eyJ", "ak-")):  # OpenAI, JWT token, 其他格式
                print(f"Warning: API key format unusual for user {user_id}")

            # 保存API密钥
            api_key_manager.set_key(user_id, api_key)

            # 如果是 DeepSeek，进行特殊验证
            base_url = config_data.get("openai_base_url", "")
            if "deepseek" in base_url.lower():
                try:
                    is_valid = await deepseek_service.validate_api_key(api_key)
                    if not is_valid:
                        print(f"Warning: DeepSeek API key validation failed for user {user_id}")
                except Exception as e:
                    print(f"Warning: DeepSeek API key validation error: {str(e)}")

        # 保存配置到内存（扩展 api_key_manager 功能）
        if not hasattr(api_key_manager, 'configs'):
            api_key_manager.configs = {}

        api_key_manager.configs[user_id] = {
            "base_url": config_data.get("openai_base_url", "https://api.openai.com/v1"),
            "model": config_data.get("model", "gpt-3.5-turbo"),
            "max_tokens": config_data.get("max_tokens", 2000),
            "temperature": config_data.get("temperature", 0.7)
        }

        return {
            "message": "模型配置更新成功",
            "is_configured": True,
            "config": {
                "base_url": config_data.get("openai_base_url", "https://api.openai.com/v1"),
                "model": config_data.get("model", "gpt-3.5-turbo"),
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
    测试模型连接

    Request Body:
    {
      "openai_api_key": "sk-...",  // API Key
      "openai_base_url": "https://api.openai.com/v1",  // 任何兼容的 API 地址
      "model": "gpt-3.5-turbo"  // 任何兼容的模型
    }

    支持任何 OpenAI 兼容的 API 服务
    """
    try:
        import time
        import aiohttp
        import json
        start_time = time.time()

        # 获取测试参数
        api_key = test_config.get("openai_api_key")
        base_url = test_config.get("openai_base_url", "https://api.openai.com/v1")
        model = test_config.get("model", "gpt-3.5-turbo")

        if not api_key:
            raise HTTPException(status_code=400, detail="API key is required")

        if not base_url:
            raise HTTPException(status_code=400, detail="Base URL is required")

        # 构建请求
        if not base_url.endswith('/chat/completions'):
            chat_url = f"{base_url.rstrip('/')}/chat/completions"
        else:
            chat_url = base_url

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        test_payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello! This is a connection test. Please respond briefly."}
            ],
            "max_tokens": 20,
            "temperature": 0.1
        }

        # 发送测试请求
        async with aiohttp.ClientSession() as session:
            async with session.post(
                chat_url,
                headers=headers,
                json=test_payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                response_data = await response.json()

                if response.status == 200:
                    # 成功
                    response_time_ms = int((time.time() - start_time) * 1000)

                    # 获取响应内容
                    choices = response_data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                    else:
                        content = "Test successful"

                    usage = response_data.get("usage", {})

                    return {
                        "success": True,
                        "message": "API 连接测试成功",
                        "model_info": {
                            "model": model,
                            "available": True,
                            "response_time_ms": response_time_ms,
                            "base_url": base_url
                        },
                        "test_response": {
                            "content": content[:100] + "..." if len(content) > 100 else content,
                            "usage": usage
                        }
                    }
                else:
                    # 错误处理
                    error_detail = response_data.get("error", {}).get("message", f"HTTP {response.status}")
                    if response.status == 401:
                        raise HTTPException(status_code=400, detail="Invalid API key. Please check your API key.")
                    elif response.status == 404:
                        raise HTTPException(status_code=400, detail=f"Model '{model}' not found or not supported by this API.")
                    elif response.status == 429:
                        raise HTTPException(status_code=429, detail="API rate limit exceeded. Please try again later.")
                    else:
                        raise HTTPException(status_code=500, detail=f"API connection test failed: {error_detail}")

    except HTTPException:
        raise
    except asyncio.TimeoutError:
        raise HTTPException(status_code=500, detail="Connection test timed out. Please check the API URL and network connection.")
    except Exception as e:
        error_msg = str(e)
        if "unauthorized" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(status_code=400, detail="Invalid API key. Please check your API key.")
        elif "rate limit" in error_msg.lower() or "429" in error_msg:
            raise HTTPException(status_code=429, detail="API rate limit exceeded. Please try again later.")
        else:
            raise HTTPException(status_code=500, detail=f"API connection test failed: {error_msg}")

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