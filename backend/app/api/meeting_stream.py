from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional, AsyncGenerator
import json
import asyncio
import logging
import time
from datetime import datetime

from ..models import get_database_session, Meeting, MeetingMessage, AgentConfig
from ..services.meeting_service import MeetingService
from ..services.agent_service import AgentService
from ..services.deepseek_service import deepseek_service

router = APIRouter()
logger = logging.getLogger(__name__)

# 存储活跃的SSE连接
active_streams: Dict[int, List[asyncio.Queue]] = {}

class SSEConnectionManager:
    def __init__(self):
        self.connections: Dict[int, List[asyncio.Queue]] = {}

    async def add_connection(self, meeting_id: int, queue: asyncio.Queue):
        if meeting_id not in self.connections:
            self.connections[meeting_id] = []
        self.connections[meeting_id].append(queue)
        logger.info(f"Added SSE connection for meeting {meeting_id}, total: {len(self.connections[meeting_id])}")

    async def remove_connection(self, meeting_id: int, queue: asyncio.Queue):
        if meeting_id in self.connections and queue in self.connections[meeting_id]:
            self.connections[meeting_id].remove(queue)
            if not self.connections[meeting_id]:
                del self.connections[meeting_id]
            logger.info(f"Removed SSE connection for meeting {meeting_id}")

    async def broadcast_to_meeting(self, meeting_id: int, data: Dict[str, Any]):
        """广播消息到指定会议的所有连接"""
        if meeting_id in self.connections:
            disconnected_queues = []
            for queue in self.connections[meeting_id]:
                try:
                    await queue.put(data)
                except:
                    disconnected_queues.append(queue)

            # 清理断开的连接
            for queue in disconnected_queues:
                await self.remove_connection(meeting_id, queue)

sse_manager = SSEConnectionManager()

@router.get("/meetings/{meeting_id}/stream")
async def stream_meeting_messages(
    meeting_id: int,
    db: Session = Depends(get_database_session)
):
    """
    SSE接口：实时推送会议消息
    """
    # 验证会议是否存在
    meeting_service = MeetingService(db)
    meeting = meeting_service.get_meeting_by_id(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    async def event_generator() -> AsyncGenerator[str, None]:
        queue = asyncio.Queue()

        try:
            # 添加连接到管理器
            await sse_manager.add_connection(meeting_id, queue)

            # 发送连接确认
            yield f"data: {json.dumps({'type': 'connected', 'meeting_id': meeting_id, 'timestamp': datetime.utcnow().isoformat()})}\n\n"

            # 发送现有消息 - 使用安全的序列化方法避免循环引用
            existing_messages = meeting_service.get_meeting_messages(meeting_id, skip=0, limit=100)
            for msg in existing_messages:
                # 手动构建消息数据，避免循环引用
                safe_message = {
                    "id": msg.id,
                    "meeting_id": msg.meeting_id,
                    "agent_id": msg.agent_id,
                    "message_content": msg.message_content,
                    "message_type": msg.message_type,
                    "status": msg.status,
                    "created_at": msg.created_at.isoformat() if msg.created_at else None,
                    "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
                    "metadata": msg.message_metadata
                }
                yield f"data: {json.dumps({'type': 'existing_message', 'message': safe_message})}\n\n"

            # 持续监听新消息
            while True:
                try:
                    # 等待新消息，设置超时以便发送心跳
                    data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    # 发送心跳
                    yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                except Exception as e:
                    logger.error(f"Error in SSE stream: {e}")
                    break

        except Exception as e:
            logger.error(f"SSE connection error: {e}")
        finally:
            # 清理连接
            await sse_manager.remove_connection(meeting_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

@router.post("/meetings/{meeting_id}/start-conversation")
async def start_meeting_conversation(
    meeting_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_database_session)
):
    """
    启动会议的智能体自动对话
    """
    meeting_service = MeetingService(db)
    meeting = meeting_service.get_meeting_by_id(meeting_id)

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status != 'active':
        raise HTTPException(status_code=400, detail="Meeting must be active to start conversation")

    # 在后台启动对话任务
    background_tasks.add_task(run_agent_conversation, meeting_id, db)

    return {"message": "Meeting conversation started", "meeting_id": meeting_id}

@router.post("/meetings/{meeting_id}/pause-conversation")
async def pause_meeting_conversation(
    meeting_id: int,
    db: Session = Depends(get_database_session)
):
    """
    暂停会议的智能体对话
    """
    # TODO: 实现暂停逻辑（可以使用Redis或内存标志）
    await sse_manager.broadcast_to_meeting(meeting_id, {
        "type": "conversation_paused",
        "meeting_id": meeting_id,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {"message": "Meeting conversation paused", "meeting_id": meeting_id}

async def run_agent_conversation(meeting_id: int, db: Session):
    """
    运行智能体对话的后台任务
    """
    try:
        meeting_service = MeetingService(db)
        agent_service = AgentService(db)

        # 获取会议信息
        meeting = meeting_service.get_meeting_by_id(meeting_id)
        if not meeting:
            return

        # 获取参与的智能体
        participants = meeting_service.get_meeting_participants(meeting_id)
        if not participants:
            # 如果没有参与者，添加一些默认的智能体
            available_agents = agent_service.get_agents(skip=0, limit=5, active_only=True)
            for agent in available_agents[:3]:  # 添加前3个活跃智能体
                await meeting_service.add_participant(meeting_id, {
                    "agent_id": agent.id,
                    "role_in_meeting": "participant",
                    "speaking_priority": 1.0
                })
            participants = meeting_service.get_meeting_participants(meeting_id)

        # 获取智能体配置
        agent_configs = []
        for participant in participants:
            agent = agent_service.get_agent_by_id(participant.agent_id)
            if agent and agent.is_active:
                agent_configs.append(agent)

        if not agent_configs:
            logger.warning(f"No active agents found for meeting {meeting_id}")
            return

        # 开始对话循环
        conversation_context = f"讨论主题: {meeting.topic}\n"
        if meeting.discussion_config:
            conversation_context += f"背景: {meeting.discussion_config.get('context_description', '')}\n"
            conversation_context += f"期望结果: {', '.join(meeting.discussion_config.get('expected_outcomes', []))}\n"

        # 从会议配置中获取对话轮数，默认为3轮
        max_rounds = 3
        if meeting.meeting_rules and 'discussion_rounds' in meeting.meeting_rules:
            max_rounds = meeting.meeting_rules['discussion_rounds']

        # 从会议配置中获取发言间隔时间，默认为3秒
        speaking_interval = 3
        if meeting.meeting_rules and 'speaking_time_limit' in meeting.meeting_rules:
            # speaking_time_limit 是秒数，转换为合理的间隔时间
            speaking_interval = min(max(meeting.meeting_rules['speaking_time_limit'] // 40, 2), 10)

        logger.info(f"Starting conversation for meeting {meeting_id} with {len(agent_configs)} agents, {max_rounds} rounds, {speaking_interval}s intervals")

        for round_num in range(max_rounds):
            # 广播轮次开始信息
            await sse_manager.broadcast_to_meeting(meeting_id, {
                "type": "round_started",
                "round_number": round_num + 1,
                "total_rounds": max_rounds,
                "timestamp": datetime.utcnow().isoformat()
            })

            for agent_index, agent in enumerate(agent_configs):
                try:
                    # 广播智能体开始发言
                    await sse_manager.broadcast_to_meeting(meeting_id, {
                        "type": "agent_speaking",
                        "agent_id": agent.id,
                        "agent_name": agent.name,
                        "round_number": round_num + 1,
                        "agent_order": agent_index + 1,
                        "total_agents": len(agent_configs),
                        "timestamp": datetime.utcnow().isoformat()
                    })

                    # 生成智能体的发言
                    response = await generate_agent_response(
                        agent=agent,
                        conversation_context=conversation_context,
                        meeting=meeting,
                        existing_messages=meeting_service.get_meeting_messages(meeting_id, skip=0, limit=20),
                        db=db
                    )

                    if response:
                        # 保存消息到数据库
                        message_data = {
                            "meeting_id": meeting_id,
                            "agent_id": agent.id,
                            "message_content": response["content"],
                            "message_type": response.get("type", "analysis"),
                            "status": "sent",
                            "sent_at": datetime.utcnow(),
                            "message_metadata": response.get("metadata", {})
                        }

                        # 这里需要直接创建数据库记录
                        new_message = MeetingMessage(**message_data)
                        db.add(new_message)
                        db.commit()
                        db.refresh(new_message)

                        # 通过SSE广播新消息 - 使用安全的序列化
                        safe_message = {
                            "id": new_message.id,
                            "meeting_id": new_message.meeting_id,
                            "agent_id": new_message.agent_id,
                            "message_content": new_message.message_content,
                            "message_type": new_message.message_type,
                            "status": new_message.status,
                            "created_at": new_message.created_at.isoformat() if new_message.created_at else None,
                            "sent_at": new_message.sent_at.isoformat() if new_message.sent_at else None,
                            "metadata": new_message.message_metadata
                        }
                        await sse_manager.broadcast_to_meeting(meeting_id, {
                            "type": "new_message",
                            "message": safe_message,
                            "timestamp": datetime.utcnow().isoformat()
                        })

                        # 更新对话上下文
                        conversation_context += f"\n{agent.name}: {response['content']}"

                        logger.info(f"Agent {agent.name} spoke in meeting {meeting_id}")

                        # 等待一下，模拟真实对话节奏 - 使用配置的间隔时间
                        await asyncio.sleep(speaking_interval)

                except Exception as e:
                    logger.error(f"Error generating response for agent {agent.name}: {e}")
                    continue

            # 每轮之间的间隔
            await asyncio.sleep(2)

        # 对话结束
        await sse_manager.broadcast_to_meeting(meeting_id, {
            "type": "conversation_ended",
            "meeting_id": meeting_id,
            "timestamp": datetime.utcnow().isoformat()
        })

        logger.info(f"Conversation ended for meeting {meeting_id}")

    except Exception as e:
        logger.error(f"Error in agent conversation for meeting {meeting_id}: {e}")

async def generate_agent_response(
    agent: AgentConfig,
    conversation_context: str,
    meeting: Meeting,
    existing_messages: List[MeetingMessage],
    db: Session
) -> Optional[Dict[str, Any]]:
    """
    生成智能体的响应
    """
    try:
        # 构建提示词 - 需要通过agent_id获取agent名称
        agent_service = AgentService(db)
        recent_messages_list = []
        for msg in existing_messages[-5:]:  # 最近5条消息
            agent_config = agent_service.get_agent_by_id(msg.agent_id)
            agent_name = agent_config.name if agent_config else f"Agent{msg.agent_id}"
            recent_messages_list.append(f"{agent_name}: {msg.message_content}")
        recent_messages = "\n".join(recent_messages_list)

        system_prompt = f"""你是{agent.name}，{agent.role}。

个性特征: {json.dumps(agent.personality_traits, ensure_ascii=False)}
说话风格: {json.dumps(agent.speaking_style, ensure_ascii=False)}
行为设置: {json.dumps(agent.behavior_settings, ensure_ascii=False)}
背景故事: {agent.backstory}
目标: {agent.goal}
专业领域: {', '.join(agent.expertise_areas)}

请根据你的角色特点和专业背景，参与这次会议讨论。回复应该：
1. 符合你的角色设定和说话风格
2. 提供有价值的观点和见解
3. 长度控制在100-200字
4. 语气和用词要符合你的个性"""

        user_prompt = f"""会议主题: {meeting.topic}

{conversation_context}

最近的对话:
{recent_messages}

请以{agent.name}的身份，基于你的专业背景和角色设定，对当前讨论给出你的观点。"""

        # 调用AI服务生成回复
        if not deepseek_service or not hasattr(deepseek_service, 'chat_completion'):
            # 如果没有配置AI服务，返回模拟回复
            return {
                "content": f"作为{agent.role}，我认为{meeting.topic}这个话题很重要。基于我的经验，我建议我们需要更深入地分析这个问题。",
                "type": "analysis",
                "metadata": {"generated_by": "mock", "agent_id": agent.id}
            }

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = await deepseek_service.chat_completion(
            messages=messages,
            max_tokens=200,
            temperature=0.7
        )

        if response and "choices" in response:
            content = response["choices"][0]["message"]["content"]
            return {
                "content": content.strip(),
                "type": "analysis",  # 可以根据内容分析决定类型
                "metadata": {
                    "generated_by": "deepseek",
                    "agent_id": agent.id,
                    "tokens_used": response.get("usage", {}).get("total_tokens", 0)
                }
            }

    except Exception as e:
        logger.error(f"Error generating agent response: {e}")

    return None