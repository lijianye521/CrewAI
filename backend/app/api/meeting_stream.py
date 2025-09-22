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

logger = logging.getLogger(__name__)

router = APIRouter()

# 存储活跃的SSE连接
active_streams: Dict[int, List[asyncio.Queue]] = {}

# 存储正在进行的对话会议ID，防止重复启动
active_conversations: set = set()

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
    db: Session = Depends(get_database_session),
    force_restart: bool = False
):
    """
    启动会议的智能体自动对话
    force_restart: 强制重新开始对话，无视当前状态
    """
    meeting_service = MeetingService(db)
    meeting = meeting_service.get_meeting_by_id(meeting_id)

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status != 'active':
        raise HTTPException(status_code=400, detail="Meeting must be active to start conversation")

    # 检查是否已经在进行对话
    if meeting_id in active_conversations and not force_restart:
        return {"message": "Meeting conversation already in progress", "meeting_id": meeting_id}

    # 如果是强制重启，先清除旧状态
    if force_restart:
        active_conversations.discard(meeting_id)
        # 广播重置事件
        await sse_manager.broadcast_to_meeting(meeting_id, {
            "type": "conversation_reset",
            "meeting_id": meeting_id,
            "timestamp": datetime.utcnow().isoformat()
        })

    # 标记对话开始
    active_conversations.add(meeting_id)

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

        # 开始一问一答对话逻辑
        conversation_context = f"讨论主题: {meeting.topic}\n"
        if meeting.discussion_config:
            conversation_context += f"背景: {meeting.discussion_config.get('context_description', '')}\n"
            conversation_context += f"期望结果: {', '.join(meeting.discussion_config.get('expected_outcomes', []))}\n"

        # 从会议配置中获取对话轮数，默认为8轮（问答对）
        max_rounds = 8
        if meeting.meeting_rules and 'discussion_rounds' in meeting.meeting_rules:
            max_rounds = meeting.meeting_rules['discussion_rounds'] * 2  # 转换为问答对数

        # 从会议配置中获取发言间隔时间，默认为4秒
        speaking_interval = 4
        if meeting.meeting_rules and 'speaking_time_limit' in meeting.meeting_rules:
            speaking_interval = min(max(meeting.meeting_rules['speaking_time_limit'] // 30, 3), 8)

        # 检测是否为面试场景
        meeting_topic = meeting.topic.lower()
        is_interview = any(keyword in meeting_topic for keyword in ['面试', '招聘', 'interview', '求职'])

        # 分离面试官和求职者
        interviewers = []
        interviewees = []

        if is_interview:
            for agent in agent_configs:
                agent_role = agent.role.lower()
                agent_name = agent.name.lower()
                if any(keyword in agent_role or keyword in agent_name for keyword in ['ceo', 'cto', '面试官', '经理', '主管', 'hr']):
                    interviewers.append(agent)
                else:
                    interviewees.append(agent)

            # 如果没有明确区分，取前一半作为面试官
            if not interviewers and not interviewees:
                mid = len(agent_configs) // 2
                interviewers = agent_configs[:mid] if mid > 0 else agent_configs[:1]
                interviewees = agent_configs[mid:] if mid < len(agent_configs) else []

        logger.info(f"Starting {'interview' if is_interview else 'discussion'} for meeting {meeting_id} with {len(agent_configs)} agents, {max_rounds} exchanges")

        # 获取现有消息避免重复
        existing_messages = meeting_service.get_meeting_messages(meeting_id, skip=0, limit=50)
        existing_content = [msg.message_content for msg in existing_messages]

        message_count = 0
        for round_num in range(max_rounds // 2):  # 问答对数
            # 广播轮次开始信息
            await sse_manager.broadcast_to_meeting(meeting_id, {
                "type": "round_started",
                "round_number": round_num + 1,
                "total_rounds": max_rounds // 2,
                "timestamp": datetime.utcnow().isoformat()
            })

            if is_interview:
                # 面试模式：面试官问，求职者答
                if interviewers and interviewees:
                    interviewer = interviewers[round_num % len(interviewers)]
                    interviewee = interviewees[round_num % len(interviewees)]

                    # 1. 面试官提问
                    question_response = await generate_contextual_response(
                        agent=interviewer,
                        conversation_context=conversation_context,
                        meeting=meeting,
                        existing_messages=existing_messages,
                        message_count=message_count,
                        role_type="interviewer",
                        target_agent=interviewee,
                        db=db
                    )

                    if question_response and question_response["content"] not in existing_content:
                        await save_and_broadcast_message(
                            meeting_id, interviewer, question_response, db
                        )
                        existing_content.append(question_response["content"])
                        message_count += 1
                        await asyncio.sleep(speaking_interval)

                    # 2. 求职者回答
                    answer_response = await generate_contextual_response(
                        agent=interviewee,
                        conversation_context=conversation_context,
                        meeting=meeting,
                        existing_messages=meeting_service.get_meeting_messages(meeting_id, skip=0, limit=50),
                        message_count=message_count,
                        role_type="interviewee",
                        target_agent=interviewer,
                        db=db
                    )

                    if answer_response and answer_response["content"] not in existing_content:
                        await save_and_broadcast_message(
                            meeting_id, interviewee, answer_response, db
                        )
                        existing_content.append(answer_response["content"])
                        message_count += 1
                        await asyncio.sleep(speaking_interval)
            else:
                # 普通讨论模式：轮流发言
                for agent_index, agent in enumerate(agent_configs[:2]):  # 限制每轮最多2个agent
                    try:
                        # 生成有针对性的回应
                        response = await generate_contextual_response(
                            agent=agent,
                            conversation_context=conversation_context,
                            meeting=meeting,
                            existing_messages=meeting_service.get_meeting_messages(meeting_id, skip=0, limit=50),
                            message_count=message_count,
                            role_type="participant",
                            target_agent=None,
                            db=db
                        )

                        if response and response["content"] not in existing_content:
                            await save_and_broadcast_message(
                                meeting_id, agent, response, db
                            )
                            existing_content.append(response["content"])
                            message_count += 1
                            await asyncio.sleep(speaking_interval)
                    except Exception as e:
                        logger.error(f"Error generating response for agent {agent.name}: {e}")
                        continue

            # 每轮之间的间隔
            await asyncio.sleep(2)

            # 更新现有消息列表
            existing_messages = meeting_service.get_meeting_messages(meeting_id, skip=0, limit=50)


        # 对话结束
        await sse_manager.broadcast_to_meeting(meeting_id, {
            "type": "conversation_ended",
            "meeting_id": meeting_id,
            "timestamp": datetime.utcnow().isoformat()
        })

        logger.info(f"Conversation ended for meeting {meeting_id}")

    except Exception as e:
        logger.error(f"Error in agent conversation for meeting {meeting_id}: {e}")
    finally:
        # 无论成功或失败，都要清除对话状态
        active_conversations.discard(meeting_id)

async def save_and_broadcast_message(
    meeting_id: int,
    agent: AgentConfig,
    response: Dict[str, Any],
    db: Session
):
    """
    保存消息到数据库并广播
    """
    try:
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

        new_message = MeetingMessage(**message_data)
        db.add(new_message)
        db.commit()
        db.refresh(new_message)

        # 通过SSE广播打字机效果消息
        await broadcast_typewriter_message(
            meeting_id=meeting_id,
            message_id=new_message.id,
            agent_id=new_message.agent_id,
            agent_name=agent.name,
            content=new_message.message_content,
            message_type=new_message.message_type,
            metadata=new_message.message_metadata
        )

        logger.info(f"Agent {agent.name} spoke in meeting {meeting_id}")
    except Exception as e:
        logger.error(f"Error saving/broadcasting message for agent {agent.name}: {e}")
        raise

async def generate_contextual_response(
    agent: AgentConfig,
    conversation_context: str,
    meeting: Meeting,
    existing_messages: List[MeetingMessage],
    message_count: int,
    role_type: str,  # "interviewer", "interviewee", "participant"
    target_agent: Optional[AgentConfig],
    db: Session
) -> Optional[Dict[str, Any]]:
    """
    生成有上下文的智能体回应
    """
    try:
        # 获取最近5条消息作为上下文
        recent_messages = existing_messages[-5:] if existing_messages else []
        context_history = "\n".join([
            f"Agent{msg.agent_id}: {msg.message_content}" for msg in recent_messages
        ])

        # 检测是否为面试场景
        meeting_topic = meeting.topic.lower()
        is_interview = any(keyword in meeting_topic for keyword in ['面试', '招聘', 'interview', '求职'])

        if is_interview:
            return await generate_interview_response(
                agent, meeting, existing_messages, message_count, role_type, target_agent
            )
        else:
            return generate_discussion_response(
                agent, meeting, existing_messages, message_count, context_history
            )

    except Exception as e:
        logger.error(f"Error generating contextual response for agent {agent.name}: {e}")
        return None

def generate_discussion_response(
    agent: AgentConfig,
    meeting: Meeting,
    existing_messages: List[MeetingMessage],
    message_count: int,
    context_history: str
) -> Dict[str, Any]:
    """
    生成讨论模式的回应
    """
    discussion_topics = [
        f"根据{meeting.topic}，我认为我们应该重点关注{agent.expertise_areas[0] if agent.expertise_areas else '相关领域'}的发展趋势。",
        f"基于我在{agent.role}的经验，我建议我们可以从以下几个维度来分析这个问题。",
        f"关于{meeting.topic}，我觉得我们还需要考虑一些潜在的挑战和机会。",
        f"从{agent.expertise_areas[0] if agent.expertise_areas else '专业'}角度来看，我认为这个方案的可行性还需要进一步验证。"
    ]

    content = discussion_topics[message_count % len(discussion_topics)]

    return {
        "content": content,
        "type": "discussion",
        "metadata": {
            "agent_name": agent.name,
            "agent_role": agent.role,
            "message_count": message_count
        }
    }

async def generate_interview_response(
    agent: AgentConfig,
    meeting: Meeting,
    existing_messages: List[MeetingMessage],
    message_count: int,
    role_type: str,
    target_agent: Optional[AgentConfig]
) -> Dict[str, Any]:
    """
    生成面试模式的回应（使用AI模型生成）
    """
    agent_role = agent.role.lower()
    agent_name = agent.name.lower()

    # 检测是否为面试官
    is_interviewer = any(keyword in agent_role or keyword in agent_name
                        for keyword in ['ceo', 'cto', '面试官', '经理', '主管', 'hr'])

    # 获取最近5条对话作为上下文
    recent_messages = existing_messages[-5:] if existing_messages else []
    conversation_history = "\n".join([
        f"{msg.agent_id}: {msg.message_content}" for msg in recent_messages
    ])

    if role_type == "interviewer" or is_interviewer:
        # 面试官提问
        system_prompt = f"""你是{agent.name}，担任{agent.role}。
你正在面试一位{target_agent.expertise_areas[0] if target_agent and target_agent.expertise_areas else '前端开发'}工程师。

你的背景：{agent.backstory}
你的目标：{agent.goal}

请按照以下原则提问：
1. 问题要具体、有针对性
2. 基于候选人的专业背景提问
3. 问题要有深度，能考察技能和思维能力
4. 保持专业和严肅的面试官身份
5. 根据对话历史逐步深入"""

        user_prompt = f"""当前面试进展：
面试轮数：第{(message_count // 2) + 1}轮
候选人信息：{target_agent.name if target_agent else '未知'}，擅长{target_agent.expertise_areas[0] if target_agent and target_agent.expertise_areas else '前端开发'}

最近对话：
{conversation_history}

现在轮到你提问。请根据上下文和面试进展，提出一个具体的、有挑战性的问题。"""

        message_type = "question"
    else:
        # 求职者回答
        system_prompt = f"""你是{agent.name}，一位{agent.role}。
你正在参加面试，希望获得这个职位。

你的背景：{agent.backstory}
你的目标：{agent.goal}
你的专业领域：{', '.join(agent.expertise_areas) if agent.expertise_areas else '前端开发'}

请按照以下原则回答：
1. 回答要真实、具体
2. 展示你的专业能力和经验
3. 回答要有结构、有逻辑
4. 体现你的思考过程和解决问题的能力
5. 保持礼貌和专业"""

        user_prompt = f"""面试现状：
当前回答轮数：第{((message_count - 1) // 2) + 1}轮

最近对话：
{conversation_history}

面试官刚刚向你提了问题。请根据你的背景和经验，给出一个详细、专业的回答。"""

        message_type = "answer"

    # 尝试使用DeepSeek生成回应
    try:
        logger.info(f"Attempting to use DeepSeek for {agent.name} ({role_type})")
        from ..services.deepseek_service import deepseek_service

        if deepseek_service and deepseek_service.api_key:
            logger.info(f"DeepSeek service available with API key: {deepseek_service.api_key[:10]}...")
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            logger.info(f"Calling DeepSeek API for {agent.name}")
            response = await deepseek_service.chat_completion(
                messages=messages,
                max_tokens=300,
                temperature=0.8
            )

            if response and "choices" in response:
                content = response["choices"][0]["message"]["content"].strip()
                logger.info(f"DeepSeek response received for {agent.name}: {content[:50]}...")
                return {
                    "content": content,
                    "type": message_type,
                    "metadata": {
                        "agent_name": agent.name,
                        "agent_role": agent.role,
                        "message_count": message_count,
                        "role_type": role_type,
                        "generated_by": "deepseek"
                    }
                }
            else:
                logger.warning(f"DeepSeek API returned invalid response: {response}")
        else:
            logger.warning(f"DeepSeek service not available: service={deepseek_service}, api_key={'exists' if deepseek_service and deepseek_service.api_key else 'missing'}")
    except Exception as e:
        logger.error(f"DeepSeek generation failed: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")

    # 如果模型调用失败，使用高质量的备用模板
    logger.info(f"Using template fallback for {agent.name} ({role_type})")
    if role_type == "interviewer" or is_interviewer:
        # 面试官问题模板，更具体、更有深度
        advanced_questions = [
            f"欢迎参加面试！我是{agent.name}。请先简单介绍一下您的技术背景，以及您认为最能体现您前端开发水平的一个项目。",
            f"在您的前端开发经历中，遇到过哪些性能瓶颈？您是如何定位问题并解决的？请详细说明具体的优化手段和效果。",
            f"假设需要构建一个高并发的前端应用，您会如何设计架构？包括状态管理、路由设计、组件分层等方面。",
            f"谈一谈您对前端工程化的理解，包括构建工具、代码规范、测试策略等。您在团队中是如何推动这些实践的？",
            f"现在轮到您提问了，您对我们公司和这个职位有什么想了解的？另外，请简要说说您的职业规划。"
        ]
        content = advanced_questions[message_count // 2 % len(advanced_questions)]
    else:
        # 求职者回答模板，更详细、更专业
        advanced_answers = [
            f"您好！我是{agent.name}，{agent.backstory[:80] if agent.backstory else '有5年前端开发经验'}。我最满意的项目是一个企业级的数据可视化平台，技术栈包括Vue3 + TypeScript + Echarts。我负责了整个前端架构设计，包括微前端框架搭建、通用组件库建设、以及复杂图表交互逻辑。最大的挑战是处理海量数据的实时渲染，我通过虚拟滚动、Canvas优化、以及WebWorker等技术将页面响应时间从3秒优化到300ms以内。这个项目也获得了公司的技术创新奖。",

            f"我印象最深的是一次移动端H5页面的性能优化。页面初始加载时间超过8秒，用户体验很差。我首先通过Chrome DevTools和Lighthouse进行性能分析，发现主要问题在于：1)JavaScript包过大(2MB+)；2)图片资源未优化；3)关键渲染路径阻塞。解决方案包括：代码分割(将包大小降到300KB)、图片懒加载和WebP格式转换、关键CSS内联、Service Worker缓存策略。最终首屏时间降到1.2秒，页面性能评分从30分提升到95分。整个优化过程中，我特别注重数据驱动，每个优化点都有明确的性能指标对比。",

            f"对于高并发前端应用，我会采用分层架构设计。技术选型上，我倾向于React + Redux Toolkit或者Vue3 + Pinia进行状态管理，确保数据流清晰可控。架构层面包括：1)组件层：原子化设计原则，构建可复用的基础组件库；2)业务层：按功能模块划分，使用微前端架构支持团队并行开发；3)数据层：实现统一的API层，包括请求拦截、错误处理、缓存策略；4)工程层：配置完整的CI/CD流程，包括自动化测试、代码质量检查、部署回滚机制。对于高并发场景，我还会特别关注客户端缓存策略、CDN配置、以及前端监控体系。",

            f"前端工程化是保证项目质量和团队效率的关键。我的实践包括：1)代码规范：使用ESLint + Prettier + Husky配置，确保代码风格统一，配合TypeScript增强类型安全；2)构建优化：基于Webpack/Vite配置多环境构建，实现代码分割、Tree Shaking、资源优化等；3)测试体系：建立了单元测试(Jest)、集成测试(Cypress)、视觉回归测试的三层测试体系，覆盖率达到80%+；4)发布流程：配置Git Flow工作流，结合Jenkins实现自动化部署，包括代码检查、自动化测试、灰度发布等环节。在团队推广方面，我通过技术分享、Code Review、以及制定团队规范文档来提升整体工程化水平。",

            f"谢谢！我想了解几个方面：1)团队技术氛围如何？是否鼓励技术创新和分享？2)公司的前端技术栈和架构演进规划；3)团队的成长路径和学习资源支持。关于职业规划，短期(1-2年)我希望能深入业务，成为某个技术领域的专家，同时提升架构设计能力；中期(3-5年)希望能带领技术团队，推动前端工程化和技术创新；长期目标是成为全栈型的技术管理者，能够从产品和技术两个维度推动业务发展。我相信通过不断学习和实践，能够为公司创造更大的价值。"
        ]
        content = advanced_answers[(message_count - 1) // 2 % len(advanced_answers)]

    return {
        "content": content,
        "type": message_type,
        "metadata": {
            "agent_name": agent.name,
            "agent_role": agent.role,
            "message_count": message_count,
            "role_type": role_type,
            "generated_by": "template"
        }
    }

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
            mock_response = generate_mock_response(agent, meeting, existing_messages)
            return {
                "content": mock_response["content"],
                "type": mock_response["type"],
                "metadata": {"generated_by": "mock", "agent_id": agent.id}
            }

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            response = await deepseek_service.chat_completion(
                messages=messages,
                max_tokens=200,
                temperature=0.7
            )
        except ValueError as e:
            # API key错误时，使用模拟回复
            if "API key is required" in str(e):
                mock_response = generate_mock_response(agent, meeting, existing_messages)
                return {
                    "content": mock_response["content"],
                    "type": mock_response["type"],
                    "metadata": {"generated_by": "mock", "agent_id": agent.id}
                }
            raise e

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

async def broadcast_typewriter_message(
    meeting_id: int,
    message_id: int,
    agent_id: int,
    agent_name: str,
    content: str,
    message_type: str,
    metadata: dict
):
    """
    实现打字机效果的消息广播
    """
    # 首先发送消息开始事件
    await sse_manager.broadcast_to_meeting(meeting_id, {
        "type": "message_start",
        "message_id": message_id,
        "agent_id": agent_id,
        "agent_name": agent_name,
        "message_type": message_type,
        "timestamp": datetime.utcnow().isoformat()
    })

    # 逐字发送内容
    accumulated_content = ""
    typing_speed = 50  # 50ms per character for typewriter effect

    for i, char in enumerate(content):
        accumulated_content += char

        # 发送当前累积的内容
        await sse_manager.broadcast_to_meeting(meeting_id, {
            "type": "message_typing",
            "message_id": message_id,
            "agent_id": agent_id,
            "agent_name": agent_name,
            "partial_content": accumulated_content,
            "total_length": len(content),
            "current_position": i + 1,
            "timestamp": datetime.utcnow().isoformat()
        })

        # 控制打字速度
        await asyncio.sleep(typing_speed / 1000.0)

    # 发送消息完成事件
    await sse_manager.broadcast_to_meeting(meeting_id, {
        "type": "message_complete",
        "message_id": message_id,
        "agent_id": agent_id,
        "agent_name": agent_name,
        "final_content": content,
        "message_type": message_type,
        "metadata": metadata,
        "timestamp": datetime.utcnow().isoformat()
    })

def generate_mock_response(agent, meeting, existing_messages):
    """
    生成多样化的模拟回复，实现更好的对话流程
    """
    import random

    # 获取已有消息数量，用于判断对话阶段
    message_count = len(existing_messages)

    # 检测会议场景类型
    meeting_topic = meeting.topic.lower()
    is_interview = any(keyword in meeting_topic for keyword in ['面试', '招聘', 'interview', '求职'])
    is_technical_discussion = any(keyword in meeting_topic for keyword in ['技术', '开发', '代码', '架构'])
    is_product_meeting = any(keyword in meeting_topic for keyword in ['产品', '需求', '功能', '用户'])
    is_business_meeting = any(keyword in meeting_topic for keyword in ['商业', '战略', '市场', '销售'])

    # 面试场景的特殊处理
    if is_interview:
        return generate_interview_response(agent, meeting, existing_messages, message_count)

    # 根据智能体角色定义不同的发言风格和内容模板
    role_templates = {
        "CEO": {
            "opening": [
                f"我是公司CEO，对于'{meeting.topic}'这个议题，我认为需要从商业战略的角度来考量。这个决策将直接影响我们的市场竞争力和发展方向。",
                f"我是{agent.name}，作为CEO我最关心的是'{meeting.topic}'能为公司带来什么样的商业价值。让我们一起分析一下可行性和投资回报。",
                f"我是负责战略决策的CEO，'{meeting.topic}'这个方案我觉得很有潜力，但我们需要仔细评估风险和机会。"
            ],
            "questions": [
                "从技术实现的角度，这个方案的可行性如何？",
                "我们的预算和时间安排是否能支持这个项目？",
                "这个决策对我们的竞争优势会有什么影响？",
                "团队是否有足够的技术储备来完成这个任务？"
            ],
            "responses": [
                f"基于大家的分析，我认为'{meeting.topic}'确实有很大的战略价值。我们需要制定详细的实施计划。",
                f"听了各位的观点，我觉得在'{meeting.topic}'这个问题上，我们应该更加谨慎地评估风险和收益。",
                f"我同意刚才的分析。作为CEO，我会确保公司为'{meeting.topic}'提供必要的资源支持。"
            ]
        },
        "CTO": {
            "opening": [
                f"我是CTO，专门负责技术架构。对于'{meeting.topic}'这个方案，我需要从技术可行性和实现难度来分析。",
                f"我是{agent.name}，技术出身的CTO。'{meeting.topic}'确实有技术挑战，但我觉得我们的团队有能力解决。",
                f"我是负责技术决策的CTO，'{meeting.topic}'在技术实现上有几个关键点需要考虑。"
            ],
            "questions": [
                "这个技术方案的架构设计是否合理？",
                "我们现有的技术栈能否支持这个需求？",
                "开发周期和技术风险如何评估？",
                "是否需要引入新的技术框架？"
            ],
            "responses": [
                f"从技术实现的角度，'{meeting.topic}'确实可行，但需要克服几个关键的技术难点。",
                f"我建议我们采用渐进式开发的方式来实现'{meeting.topic}'，这样可以降低技术风险。",
                f"基于当前的技术储备，我们有能力完成'{meeting.topic}'，但需要合理安排开发资源。"
            ]
        },
        "产品经理": {
            "opening": [
                f"我是产品经理，主要关注用户需求和市场。'{meeting.topic}'这个想法很有意思，但我们需要验证用户是否真的需要。",
                f"我是{agent.name}，做产品的。对于'{meeting.topic}'我做了一些市场调研，我觉得有一定的用户需求。",
                f"我是负责产品规划的PM，'{meeting.topic}'在产品战略上的位置需要我们仔细思考。"
            ],
            "questions": [
                "用户对这个功能的真实需求程度如何？",
                "竞品是如何解决类似问题的？",
                "这个功能的优先级在产品路线图中应该如何排列？",
                "我们如何衡量这个功能的成功指标？"
            ],
            "responses": [
                f"从产品角度看，'{meeting.topic}'确实能解决用户的痛点，我建议我们优先实现核心功能。",
                f"根据用户反馈，'{meeting.topic}'是一个高优先级需求，我们应该加快推进。",
                f"我认为在'{meeting.topic}'的实现上，我们需要平衡功能完整性和开发效率。"
            ]
        },
        "高级前端开发工程师": {
            "opening": [
                f"我是前端工程师，主要负责用户界面开发。'{meeting.topic}'在前端实现上我觉得有几个技术点需要注意。",
                f"我是{agent.name}，专门做前端的。对于'{meeting.topic}'这个需求，从UI/UX的角度我有一些想法。",
                f"我是前端开发负责人，'{meeting.topic}'在用户体验和性能优化方面需要我们仔细考虑。"
            ],
            "questions": [
                "前端框架选择是否合适？",
                "页面性能和加载速度如何优化？",
                "移动端适配有什么特殊要求？",
                "UI/UX设计是否符合开发标准？"
            ],
            "responses": [
                f"从前端实现来看，'{meeting.topic}'的界面设计需要注意响应式布局和性能优化。",
                f"我建议在'{meeting.topic}'的前端开发中采用组件化的设计模式，提高代码复用性。",
                f"前端实现'{meeting.topic}'时，我们需要特别关注用户交互的流畅性和数据加载的效率。"
            ]
        },
        "数据分析师": {
            "opening": [
                f"我是数据分析师，专门负责数据挖掘和分析。关于'{meeting.topic}'我看了一些相关数据，有几个有趣的发现。",
                f"我是{agent.name}，做数据分析的。针对'{meeting.topic}'这个话题，我建议我们用数据来支撑决策。",
                f"我是数据团队负责人，'{meeting.topic}'的效果评估需要建立合适的数据指标体系。"
            ],
            "questions": [
                "我们有哪些相关的历史数据可以参考？",
                "如何建立合适的数据监控体系？",
                "预期的数据增长模式是什么？",
                "如何量化这个方案的效果？"
            ],
            "responses": [
                f"根据数据分析，'{meeting.topic}'的实施预计会带来显著的指标提升。",
                f"从数据角度看，'{meeting.topic}'的风险是可控的，建议我们持续监控关键指标。",
                f"我建议为'{meeting.topic}'建立完整的数据埋点和分析体系，以便及时调整策略。"
            ]
        }
    }

    # 默认模板（如果角色不在预定义列表中）
    default_templates = {
        "opening": [
            f"我是{agent.name}，主要负责{agent.role}相关工作。对于'{meeting.topic}'这个话题，我觉得需要从我的专业角度来分析一下。",
            f"我是团队的{agent.role}，针对'{meeting.topic}'这个议题，基于我的工作经验有一些想法要分享。",
            f"我是{agent.name}，做{agent.role}的。'{meeting.topic}'确实是个值得讨论的话题，我来说说我的看法。"
        ],
        "questions": [
            "大家对这个方案的可行性怎么看？",
            "我们是否考虑过其他的替代方案？",
            "这个决策的关键风险点在哪里？",
            "实施过程中可能遇到什么挑战？"
        ],
        "responses": [
            f"听了大家的分析，我对'{meeting.topic}'有了更深入的理解。",
            f"我同意刚才的观点，'{meeting.topic}'确实需要我们更加谨慎地处理。",
            f"基于团队的讨论，我认为我们在'{meeting.topic}'上已经达成了基本共识。"
        ]
    }

    # 获取智能体角色对应的模板
    agent_role = agent.role
    templates = role_templates.get(agent_role, default_templates)

    # 分析最近的消息，获取对话上下文
    recent_context = ""
    if existing_messages:
        # 获取最近的2-3条消息作为上下文
        recent_msgs = existing_messages[-3:]
        for msg in recent_msgs:
            recent_context += f"{msg.agent_id}: {msg.message_content}\n"

    # 判断对话阶段和选择合适的回复类型
    if message_count == 0:
        # 第一个发言者：开场
        content = random.choice(templates["opening"])
        message_type = "opening"
    elif message_count % 4 == 1:
        # 每4个消息中的第2个：提问
        content = random.choice(templates["questions"])
        message_type = "question"
    elif message_count % 4 == 2:
        # 每4个消息中的第3个：基于上下文回应
        if recent_context and "?" in recent_context:
            # 如果有人提问，就回答问题
            base_response = random.choice(templates["responses"])
            content = f"{base_response} 针对刚才的问题，我觉得需要从多个维度来考虑。"
        else:
            content = random.choice(templates["responses"])
        message_type = "analysis"
    else:
        # 其他情况：总结或补充
        content = random.choice([
            f"补充一点，关于'{meeting.topic}'我觉得还需要考虑实际落地的问题。",
            f"我同意前面的观点，'{meeting.topic}'确实值得我们深入探讨。",
            f"基于大家的讨论，我认为'{meeting.topic}'的下一步应该是制定具体的行动计划。"
        ])
        message_type = "summary"

    # 根据智能体个性特征调整语言风格
    if agent.speaking_style:
        tone = agent.speaking_style.get("tone", "专业")
        if tone == "友好":
            content = content.replace("我认为", "我觉得").replace("建议", "建议大家")
        elif tone == "严谨":
            content = content.replace("我觉得", "我认为").replace("可能", "很可能")

    return {
        "content": content,
        "type": message_type
    }

def generate_interview_response(agent, meeting, existing_messages, message_count):
    """
    专门为面试场景生成对话回复
    """
    import random

    # 分析最近的消息，判断对话上下文
    recent_context = ""
    if existing_messages:
        recent_msgs = existing_messages[-3:]
        for msg in recent_msgs:
            recent_context += f"{msg.message_content}\n"

    # 根据角色和对话阶段生成面试相关内容
    agent_role = agent.role.lower()

    # 判断角色类型
    is_interviewer = any(keyword in agent_role for keyword in ['ceo', 'cto', '面试官', '经理', '主管', '总监'])
    is_hr = any(keyword in agent_role for keyword in ['hr', '人事', '招聘'])
    is_candidate = any(keyword in agent_role for keyword in ['候选', '求职', '应聘'])

    if message_count == 0:
        # 开场阶段
        if is_hr:
            content = f"我是{agent.name}，负责招聘工作。欢迎参加今天的面试！请先简单介绍一下你自己，包括你的工作经验和为什么对我们公司感兴趣。"
        elif is_interviewer:
            content = f"我是{agent.name}，{agent.role}。很高兴见到你！我会从{agent.role.replace('高级', '').replace('工程师', '')}的角度来了解你的技能和经验。"
        else:
            content = f"我是{agent.name}，很高兴参加今天的面试。我有{random.choice(['3年', '5年', '2年', '4年'])}的{agent.role}经验，对贵公司的发展很感兴趣。"
        return {"content": content, "type": "opening"}

    elif message_count % 3 == 1:
        # 提问阶段
        if is_interviewer:
            if 'ceo' in agent_role or '总' in agent_role:
                questions = [
                    "你对我们公司的商业模式有什么了解？你觉得在未来发展中可能面临哪些挑战？",
                    "如果让你负责一个重要项目，你会如何确保项目成功？",
                    "你的职业规划是什么？你希望在5年内达到什么目标？",
                    "你认为一个优秀的团队成员应该具备哪些素质？"
                ]
            elif 'cto' in agent_role or '技术' in agent_role:
                questions = [
                    "请介绍一下你最有挑战性的技术项目，你是如何解决遇到的技术难题的？",
                    "你对我们使用的技术栈有什么了解？你觉得还有哪些可以改进的地方？",
                    "如何保证代码质量？你在团队中是如何进行代码审查的？",
                    "你是如何学习新技术的？最近学习了哪些新的技术或框架？"
                ]
            elif '产品' in agent_role:
                questions = [
                    "你如何理解用户需求？你用过哪些方法来收集和分析用户反馈？",
                    "如果产品经理和技术团队对功能实现有分歧，你会如何处理？",
                    "你认为一个成功的产品应该具备哪些特征？",
                    "你有没有从0到1做过产品？可以分享一下经验吗？"
                ]
            else:
                questions = [
                    "你在之前的工作中遇到过最大的挑战是什么？你是如何克服的？",
                    "你觉得自己的优势和不足分别是什么？",
                    "你为什么选择离开上一家公司？",
                    "你对加班有什么看法？能接受偶尔的加班吗？"
                ]
            content = random.choice(questions)
        elif is_hr:
            hr_questions = [
                "你对我们公司的薪资福利有什么期望？可以说一下你的期望薪资范围吗？",
                "你什么时候可以入职？需要多长的离职交接时间？",
                "你还在面试其他公司吗？如果我们给你offer，你会如何选择？",
                "你有什么问题想要了解我们公司的吗？"
            ]
            content = random.choice(hr_questions)
        else:
            # 候选人提问
            candidate_questions = [
                "请问公司的技术团队规模大概是多少？团队的技术氛围怎么样？",
                "这个岗位的主要职责是什么？日常工作内容大概是怎样的？",
                "公司对员工的培训和发展有什么支持吗？",
                "公司的发展前景如何？未来有什么重要的规划吗？"
            ]
            content = random.choice(candidate_questions)
        return {"content": content, "type": "question"}

    elif message_count % 3 == 2:
        # 回答阶段
        if "?" in recent_context or "？" in recent_context:
            if is_candidate or (not is_interviewer and not is_hr):
                # 候选人回答问题
                if "技术" in recent_context or "项目" in recent_context:
                    answers = [
                        "我在上个项目中负责了整个后端架构的设计，使用了微服务架构，大大提升了系统的可扩展性。遇到性能瓶颈时，我通过优化数据库查询和引入缓存机制解决了问题。",
                        "我有丰富的前端开发经验，熟练掌握React、Vue等框架。最近我在学习Next.js，我觉得它的服务端渲染功能对SEO很有帮助。",
                        "我认为代码质量非常重要，我习惯写单元测试，并且严格遵循代码规范。在团队协作中，我也会主动参与代码审查。"
                    ]
                elif "薪资" in recent_context or "期望" in recent_context:
                    answers = [
                        "我了解这个岗位的市场薪资水平，我的期望是在[X-Y]K的范围内，当然具体还要看公司的整体福利待遇。",
                        "我更看重的是发展机会和团队氛围，薪资方面我相信公司会给出合理的offer。",
                        "我希望薪资能够体现我的价值，具体数字我们可以进一步讨论。"
                    ]
                elif "优势" in recent_context or "不足" in recent_context:
                    answers = [
                        "我的优势是学习能力强，能够快速适应新技术和新环境。不足是有时候过于追求完美，会在细节上花费较多时间。",
                        "我比较擅长团队协作和沟通，能够很好地理解需求并与不同角色的同事配合。需要改进的是我的英语口语，我正在努力提升。",
                        "我的技术功底比较扎实，也有一定的项目管理经验。但在大规模系统设计方面还需要更多实践。"
                    ]
                else:
                    answers = [
                        "这确实是个好问题。基于我之前的经验，我认为需要从多个角度来考虑这个问题。",
                        "我之前遇到过类似的情况，当时我采用的方法是先分析根本原因，然后制定具体的解决方案。",
                        "我觉得这个问题很有意思，让我结合我的实际经验来回答。"
                    ]
                content = random.choice(answers)
            else:
                # 面试官回应
                responses = [
                    "很好，我能感受到你的专业能力。让我们继续下一个问题。",
                    "你的经验很丰富，这个回答让我很满意。",
                    "这个想法很不错，我觉得你很适合我们的团队文化。",
                    "从你的回答中我能看出你的思考深度，这很棒。"
                ]
                content = random.choice(responses)
        else:
            content = "基于刚才的讨论，我觉得我们已经有了很好的了解。"
        return {"content": content, "type": "analysis"}

    else:
        # 总结或下一步
        if is_hr:
            conclusions = [
                "今天的面试就到这里，我们会在3个工作日内给你反馈。感谢你来参加面试！",
                "整体面试效果不错，我们内部讨论后会尽快通知你结果。",
                "我觉得你很符合我们的要求，接下来还需要和团队其他成员见面聊聊。"
            ]
        elif is_interviewer:
            conclusions = [
                "从技术角度来看，我觉得你的能力是符合我们要求的。",
                "你的项目经验很丰富，我相信你能很快融入我们的团队。",
                "我们对你的表现很满意，期待能够与你合作。"
            ]
        else:
            conclusions = [
                "非常感谢给我这次面试机会，我对加入贵公司非常期待。",
                "通过今天的交流，我对公司有了更深的了解，我很希望能成为团队的一员。",
                "如果有机会加入，我会全力以赴，为公司的发展贡献我的力量。"
            ]
        content = random.choice(conclusions)
        return {"content": content, "type": "summary"}