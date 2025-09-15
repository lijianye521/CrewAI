import aiohttp
import json
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class DeepSeekService:
    """
    DeepSeek 模型服务
    提供与 DeepSeek API 的集成和对话功能
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        self.base_url = "https://api.deepseek.com/v1"
        self.timeout = 30
        self.max_retries = 3
        
        if not self.api_key:
            logger.warning("DeepSeek API key not provided. Service will be limited.")
    
    async def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "deepseek-chat",
        temperature: float = 0.7,
        max_tokens: int = 1000,
        stream: bool = False,
        agent_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        调用 DeepSeek Chat Completion API
        
        Args:
            messages: 对话消息列表
            model: 模型名称
            temperature: 温度参数 (0-1)
            max_tokens: 最大token数
            stream: 是否流式输出
            agent_config: Agent配置信息，用于个性化调整
            
        Returns:
            API响应结果
        """
        if not self.api_key:
            raise ValueError("DeepSeek API key is required")
        
        # 根据Agent配置调整参数
        if agent_config:
            temperature = self._adjust_temperature_for_agent(agent_config, temperature)
            messages = self._customize_messages_for_agent(messages, agent_config)
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result
                    else:
                        error_text = await response.text()
                        raise Exception(f"DeepSeek API error {response.status}: {error_text}")
        
        except Exception as e:
            logger.error(f"DeepSeek API call failed: {str(e)}")
            raise
    
    async def generate_agent_response(
        self,
        context: str,
        agent_config: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        meeting_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        根据Agent配置生成个性化回应
        
        Args:
            context: 当前讨论上下文
            agent_config: Agent配置信息
            conversation_history: 对话历史
            meeting_context: 会议上下文信息
            
        Returns:
            生成的回应和元数据
        """
        
        # 构建系统提示词
        system_prompt = self._build_agent_system_prompt(agent_config, meeting_context)
        
        # 构建消息列表
        messages = [{"role": "system", "content": system_prompt}]
        
        # 添加对话历史
        if conversation_history:
            messages.extend(conversation_history[-10:])  # 只保留最近10条
        
        # 添加当前上下文
        messages.append({"role": "user", "content": context})
        
        # 调用API
        try:
            response = await self.chat_completion(
                messages=messages,
                agent_config=agent_config,
                temperature=self._get_temperature_for_agent(agent_config),
                max_tokens=self._get_max_tokens_for_agent(agent_config)
            )
            
            # 提取响应内容
            content = response["choices"][0]["message"]["content"]
            
            # 分析响应特征
            metadata = self._analyze_response(content, agent_config)
            
            return {
                "content": content,
                "metadata": metadata,
                "usage": response.get("usage", {}),
                "model": response.get("model", "deepseek-chat")
            }
            
        except Exception as e:
            logger.error(f"Agent response generation failed: {str(e)}")
            # 返回失败回退
            return {
                "content": f"[{agent_config.get('name', 'Agent')}暂时无法响应，请稍后再试]",
                "metadata": {"error": str(e)},
                "usage": {},
                "model": "fallback"
            }
    
    async def stream_agent_response(
        self,
        context: str,
        agent_config: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        meeting_context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[str, None]:
        """
        流式生成Agent响应 (用于实时显示)
        
        Yields:
            生成的文本块
        """
        # 构建消息 (与generate_agent_response相同逻辑)
        system_prompt = self._build_agent_system_prompt(agent_config, meeting_context)
        messages = [{"role": "system", "content": system_prompt}]
        
        if conversation_history:
            messages.extend(conversation_history[-10:])
        
        messages.append({"role": "user", "content": context})
        
        # 流式调用
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "deepseek-chat",
                "messages": messages,
                "temperature": self._get_temperature_for_agent(agent_config),
                "max_tokens": self._get_max_tokens_for_agent(agent_config),
                "stream": True
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                ) as response:
                    async for line in response.content:
                        line = line.decode('utf-8').strip()
                        if line.startswith('data: '):
                            data = line[6:]  # 移除 'data: ' 前缀
                            if data == '[DONE]':
                                break
                            try:
                                chunk = json.loads(data)
                                if 'choices' in chunk and len(chunk['choices']) > 0:
                                    delta = chunk['choices'][0].get('delta', {})
                                    if 'content' in delta:
                                        yield delta['content']
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            logger.error(f"Streaming response failed: {str(e)}")
            yield f"[响应生成失败: {str(e)}]"
    
    def _build_agent_system_prompt(
        self, 
        agent_config: Dict[str, Any], 
        meeting_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """构建Agent的系统提示词"""
        
        prompt_parts = []
        
        # 基础角色设定
        prompt_parts.append(f"你是 {agent_config.get('name', '智能助手')}，担任 {agent_config.get('role', '参与者')} 的角色。")
        
        # 背景故事
        if agent_config.get('backstory'):
            prompt_parts.append(f"背景：{agent_config['backstory']}")
        
        # 个性特征
        if agent_config.get('personality_traits'):
            traits = agent_config['personality_traits']
            prompt_parts.append("你的个性特征：")
            for key, value in traits.items():
                prompt_parts.append(f"- {key}: {value}")
        
        # 说话风格
        if agent_config.get('speaking_style'):
            style = agent_config['speaking_style']
            prompt_parts.append("你的说话风格：")
            for key, value in style.items():
                prompt_parts.append(f"- {key}: {value}")
        
        # 行为设置
        if agent_config.get('behavior_settings'):
            behavior = agent_config['behavior_settings']
            prompt_parts.append("行为指导：")
            for key, value in behavior.items():
                prompt_parts.append(f"- {key}: {value}")
        
        # 会议上下文
        if meeting_context:
            prompt_parts.append(f"当前会议主题：{meeting_context.get('topic', '未指定')}")
            if meeting_context.get('meeting_rules'):
                prompt_parts.append("会议规则：请遵守发言时长限制，保持专业讨论。")
        
        # 角色期望
        prompt_parts.append("请根据你的角色特点参与讨论，保持专业性和个性化表达。")
        
        return "\n\n".join(prompt_parts)
    
    def _adjust_temperature_for_agent(self, agent_config: Dict[str, Any], base_temp: float) -> float:
        """根据Agent配置调整温度参数"""
        personality = agent_config.get('personality_traits', {})
        behavior = agent_config.get('behavior_settings', {})
        
        # 基于个性调整
        if personality.get('decision_making') == '数据驱动':
            base_temp *= 0.8  # 更保守
        elif personality.get('communication_style') == '创造性':
            base_temp *= 1.2  # 更有创意
        
        # 基于行为调整
        if behavior.get('speaking_frequency') == 'high':
            base_temp *= 1.1  # 稍微更活跃
        
        return max(0.1, min(2.0, base_temp))  # 限制在合理范围
    
    def _customize_messages_for_agent(
        self, 
        messages: List[Dict[str, str]], 
        agent_config: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """根据Agent配置定制消息"""
        # 这里可以根据需要添加消息预处理逻辑
        return messages
    
    def _get_temperature_for_agent(self, agent_config: Dict[str, Any]) -> float:
        """获取Agent的推荐温度值"""
        behavior = agent_config.get('behavior_settings', {})
        
        # 根据详细偏好设置
        detail_pref = behavior.get('detail_preference', 'balanced')
        if detail_pref == 'comprehensive':
            return 0.5  # 更保守，更详细
        elif detail_pref == 'creative':
            return 0.9  # 更有创意
        else:
            return 0.7  # 平衡
    
    def _get_max_tokens_for_agent(self, agent_config: Dict[str, Any]) -> int:
        """获取Agent的最大token数"""
        speaking_style = agent_config.get('speaking_style', {})
        
        # 根据句子长度偏好
        length_pref = speaking_style.get('sentence_length', '中等长度')
        if length_pref == '简洁有力':
            return 500
        elif length_pref == '详细准确':
            return 1500
        else:
            return 1000
    
    def _analyze_response(self, content: str, agent_config: Dict[str, Any]) -> Dict[str, Any]:
        """分析响应内容，提取元数据"""
        return {
            "length": len(content),
            "word_count": len(content.split()),
            "agent_name": agent_config.get('name', 'Unknown'),
            "agent_role": agent_config.get('role', 'Unknown'),
            "generated_at": datetime.utcnow().isoformat(),
            "sentiment": "neutral",  # TODO: 添加情感分析
            "confidence": 0.8  # TODO: 添加置信度评估
        }
    
    async def validate_api_key(self, api_key: str) -> bool:
        """验证API密钥是否有效"""
        test_service = DeepSeekService(api_key)
        try:
            await test_service.chat_completion(
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            return True
        except Exception as e:
            logger.error(f"API key validation failed: {str(e)}")
            return False
    
    def get_available_models(self) -> List[str]:
        """获取可用的模型列表"""
        return [
            "deepseek-chat",
            "deepseek-coder",
            "deepseek-math"
        ]
    
    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """估算API调用成本 (USD)"""
        # DeepSeek 定价 (示例，请根据实际定价调整)
        input_cost_per_1k = 0.0014  # 每1k input tokens
        output_cost_per_1k = 0.0028  # 每1k output tokens
        
        input_cost = (input_tokens / 1000) * input_cost_per_1k
        output_cost = (output_tokens / 1000) * output_cost_per_1k
        
        return input_cost + output_cost


class APIKeyManager:
    """API密钥管理器"""
    
    def __init__(self):
        self._keys = {}
    
    def set_key(self, user_id: str, api_key: str) -> None:
        """设置用户的API密钥"""
        # 在实际应用中，应该加密存储
        self._keys[user_id] = api_key
    
    def get_key(self, user_id: str) -> Optional[str]:
        """获取用户的API密钥"""
        return self._keys.get(user_id) or os.getenv("DEEPSEEK_API_KEY")
    
    def remove_key(self, user_id: str) -> None:
        """移除用户的API密钥"""
        self._keys.pop(user_id, None)
    
    def has_key(self, user_id: str) -> bool:
        """检查用户是否有API密钥"""
        return user_id in self._keys or bool(os.getenv("DEEPSEEK_API_KEY"))

# 全局实例
deepseek_service = DeepSeekService()
api_key_manager = APIKeyManager()