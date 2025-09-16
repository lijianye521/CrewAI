# CrewAI 项目对话总结

## 当前对话重点

### 1. 讨论的主要技术决策

#### 架构选择
- **前后端分离架构**: Next.js (前端) + FastAPI (后端)
- **AI框架选择**: CrewAI + LangChain 用于多智能体协作
- **实时通信**: WebSockets 用于前后端实时数据传输
- **UI框架**: Tailwind CSS + Antd + Lucide React 组件库

#### 技术栈决策
- **前端**: Next.js 15 + React 18 + TypeScript (类型安全)
- **后端**: FastAPI + Python (高性能异步框架)
- **多智能体**: CrewAI 框架 (智能体协作系统)
- **样式方案**: Tailwind CSS + Antd Design (现代化响应式设计)

### 2. 解决的问题

#### 项目架构问题
- ✅ **路由冲突修复**: 修复了左侧菜单"创建智能体"和"创建会议"的key重复问题
- ✅ **Hash路由系统**: 实现了完整的单页应用hash路由，避免页面跳转
- ✅ **TypeScript错误**: 修复了所有严重的TypeScript类型错误
- ✅ **组件化设计**: 创建了完整的UI组件库和视图系统
- ✅ **系统配置简化**: 将配置页面专注于模型参数配置

#### 用户体验问题
- ✅ **界面现代化**: 深色主题 + 专业的管理界面
- ✅ **导航体验**: 左侧栏菜单支持子菜单展开和路由导航
- ✅ **内容展示**: 右侧面板统一展示所有功能内容
- ✅ **表单体验**: 完整的智能体和会议创建表单

## 前端需要的后端API接口规范

### 基础信息
- **Base URL**: `http://localhost:8000/api/v1`
- **认证方式**: 暂无 (后续可添加JWT)
- **数据格式**: JSON
- **错误格式**: `{"detail": "错误描述"}`

### 1. 智能体管理接口 (Agents)

#### 1.1 获取智能体列表
```http
GET /api/v1/agents
Query Parameters:
- is_active: boolean (可选) - 是否只获取活跃的智能体

Response:
[
  {
    "id": 1,
    "name": "分析师Alex",
    "role": "高级数据分析师",
    "goal": "提供准确的数据分析...",
    "backstory": "拥有10年经验...",
    "personality_traits": {
      "personality_type": "理性分析型",
      "decision_making": "数据驱动",
      "communication_style": "专业严谨",
      "collaboration_style": "团队协作"
    },
    "speaking_style": {
      "tone": "正式专业",
      "sentence_length": "中等长度",
      "vocabulary_level": "专业",
      "emotional_expression": "适中"
    },
    "behavior_settings": {
      "speaking_frequency": "medium",
      "initiative_level": "proactive",
      "detail_preference": "comprehensive"
    },
    "expertise_areas": ["数据分析", "机器学习", "统计建模"],
    "avatar_url": "https://...",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### 1.2 创建智能体
```http
POST /api/v1/agents
Content-Type: application/json

Request Body:
{
  "name": "分析师Alex",
  "role": "高级数据分析师",
  "goal": "提供准确的数据分析建议",
  "backstory": "拥有10年数据分析经验",
  "personality_traits": {
    "personality_type": "理性分析型",
    "decision_making": "数据驱动",
    "communication_style": "专业严谨"
  },
  "speaking_style": {
    "tone": "正式专业",
    "sentence_length": "中等长度",
    "vocabulary_level": "适中",
    "emotional_expression": "适中"
  },
  "behavior_settings": {
    "speaking_frequency": "medium",
    "initiative_level": "proactive",
    "detail_preference": "comprehensive"
  },
  "expertise_areas": ["数据分析", "统计建模"],
  "is_active": true
}

Response:
{
  "id": 1,
  "name": "分析师Alex",
  // ... 返回完整的智能体信息
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### 1.3 更新智能体
```http
PUT /api/v1/agents/{agent_id}
Content-Type: application/json

Request Body: 同创建接口

Response: 返回更新后的智能体信息
```

#### 1.4 删除智能体
```http
DELETE /api/v1/agents/{agent_id}

Response:
{
  "message": "智能体删除成功"
}
```

### 2. 会议管理接口 (Meetings)

#### 2.1 获取会议列表
```http
GET /api/v1/meetings
Query Parameters:
- status: string (可选) - 会议状态筛选 (draft|scheduled|active|paused|completed|cancelled)
- page: int (可选) - 分页页码，默认1
- limit: int (可选) - 每页数量，默认10

Response:
{
  "total": 50,
  "page": 1,
  "limit": 10,
  "data": [
    {
      "id": 1,
      "title": "市场趋势分析讨论",
      "description": "分析当前市场趋势",
      "status": "completed",
      "topic": "市场分析",
      "meeting_rules": {
        "max_participants": 5,
        "max_duration_minutes": 60,
        "speaking_time_limit": 120,
        "discussion_rounds": 3
      },
      "discussion_config": {
        "discussion_topic": "当前市场趋势分析",
        "context_description": "基于最新数据...",
        "expected_outcomes": ["确定投资方向", "风险评估"],
        "discussion_style": "结构化讨论"
      },
      "scheduled_start_time": "2024-01-01T10:00:00Z",
      "actual_start_time": "2024-01-01T10:05:00Z",
      "end_time": "2024-01-01T11:00:00Z",
      "participants_count": 4,
      "messages_count": 25,
      "created_at": "2024-01-01T09:00:00Z",
      "updated_at": "2024-01-01T11:00:00Z"
    }
  ]
}
```

#### 2.2 创建会议
```http
POST /api/v1/meetings
Content-Type: application/json

Request Body:
{
  "title": "市场趋势分析讨论",
  "description": "分析当前市场趋势",
  "topic": "市场分析",
  "meeting_rules": {
    "max_participants": 5,
    "max_duration_minutes": 60,
    "speaking_time_limit": 120,
    "discussion_rounds": 3
  },
  "discussion_config": {
    "discussion_topic": "当前市场趋势分析",
    "context_description": "基于最新数据进行分析",
    "expected_outcomes": ["确定投资方向", "风险评估"],
    "discussion_style": "结构化讨论"
  },
  "scheduled_start_time": "2024-01-01T10:00:00Z",
  "participant_agents": [1, 2, 3, 4]
}

Response: 返回创建的会议信息
```

#### 2.3 更新会议
```http
PUT /api/v1/meetings/{meeting_id}
Content-Type: application/json

Request Body: 同创建接口

Response: 返回更新后的会议信息
```

#### 2.4 删除会议
```http
DELETE /api/v1/meetings/{meeting_id}

Response:
{
  "message": "会议删除成功"
}
```

#### 2.5 更新会议状态
```http
PATCH /api/v1/meetings/{meeting_id}/status
Content-Type: application/json

Request Body:
{
  "status": "active" // draft|scheduled|active|paused|completed|cancelled
}

Response:
{
  "id": 1,
  "status": "active",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### 3. 会议历史和消息接口

#### 3.1 获取历史会议列表
```http
GET /api/v1/meetings?status=completed
Query Parameters:
- status: completed (固定值，获取已完成的会议)
- start_date: string (可选) - 开始日期筛选 (YYYY-MM-DD)
- end_date: string (可选) - 结束日期筛选 (YYYY-MM-DD)
- page: int (可选) - 分页
- limit: int (可选) - 每页数量

Response:
{
  "total": 20,
  "page": 1,
  "limit": 10,
  "data": [
    {
      "id": 1,
      "title": "市场趋势分析讨论",
      "topic": "市场分析",
      "status": "completed",
      "participants_count": 4,
      "messages_count": 25,
      "duration_minutes": 55,
      "created_at": "2024-01-01T09:00:00Z",
      "actual_start_time": "2024-01-01T10:05:00Z",
      "end_time": "2024-01-01T11:00:00Z",
      "meeting_summary": "会议总结内容...",
      "key_insights": ["关键洞察1", "关键洞察2"]
    }
  ]
}
```

#### 3.2 获取会议消息记录
```http
GET /api/v1/meetings/{meeting_id}/messages

Response:
{
  "meeting": {
    "id": 1,
    "title": "市场趋势分析讨论",
    "topic": "市场分析",
    // ... 其他会议基础信息
  },
  "messages": [
    {
      "id": 1,
      "agent_name": "分析师Alex",
      "content": "根据最新数据显示...",
      "message_type": "analysis", // analysis|question|suggestion|summary
      "created_at": "2024-01-01T10:10:00Z",
      "metadata": {
        "speaking_time": 30,
        "confidence": 0.95,
        "emotion": "neutral"
      }
    }
  ]
}
```

#### 3.3 获取会议回放数据
```http
GET /api/v1/meetings/{meeting_id}/replay

Response:
{
  "meeting": {
    "id": 1,
    "title": "市场趋势分析讨论",
    // ... 会议基础信息
  },
  "messages": [
    // ... 时间顺序的消息列表，用于回放
  ],
  "timeline": [
    {
      "timestamp": "2024-01-01T10:05:00Z",
      "event": "meeting_started",
      "description": "会议开始"
    },
    {
      "timestamp": "2024-01-01T10:10:00Z",
      "event": "agent_spoke",
      "agent_name": "分析师Alex",
      "message_id": 1
    }
  ]
}
```

### 4. 模型配置接口 (Config)

#### 4.1 获取模型配置
```http
GET /api/v1/config/models

Response:
{
  "openai_api_key": "sk-...", // 实际应用中不应返回，仅返回是否已配置的状态
  "openai_base_url": "https://api.openai.com/v1",
  "model": "gpt-3.5-turbo",
  "max_tokens": 2000,
  "temperature": 0.7,
  "is_configured": true
}
```

#### 4.2 更新模型配置
```http
POST /api/v1/config/models
Content-Type: application/json

Request Body:
{
  "openai_api_key": "sk-...",
  "openai_base_url": "https://api.openai.com/v1",
  "model": "gpt-3.5-turbo",
  "max_tokens": 2000,
  "temperature": 0.7
}

Response:
{
  "message": "模型配置更新成功",
  "is_configured": true
}
```

#### 4.3 测试模型连接
```http
POST /api/v1/config/test-connection
Content-Type: application/json

Request Body:
{
  "openai_api_key": "sk-...",
  "openai_base_url": "https://api.openai.com/v1",
  "model": "gpt-3.5-turbo"
}

Response:
{
  "success": true,
  "message": "连接测试成功",
  "model_info": {
    "model": "gpt-3.5-turbo",
    "available": true,
    "response_time_ms": 200
  }
}
```

### 5. WebSocket 实时通信

#### 5.1 WebSocket 连接
```
WebSocket URL: ws://localhost:8000/ws

连接后可接收以下类型的实时消息:
```

#### 5.2 消息格式
```json
// 会议状态更新
{
  "type": "meeting_status",
  "meeting_id": 1,
  "status": "active",
  "timestamp": "2024-01-01T10:00:00Z"
}

// 新消息通知
{
  "type": "new_message",
  "meeting_id": 1,
  "message": {
    "id": 25,
    "agent_name": "分析师Alex",
    "content": "我认为...",
    "message_type": "analysis",
    "created_at": "2024-01-01T10:15:00Z"
  }
}

// 智能体状态更新
{
  "type": "agent_status",
  "agent_id": 1,
  "status": "speaking|thinking|idle",
  "current_action": "正在分析数据..."
}
```

## 数据库设计建议

### 主要数据表

#### 1. agents 表 (智能体)
```sql
CREATE TABLE agents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(200) NOT NULL,
    goal TEXT NOT NULL,
    backstory TEXT NOT NULL,
    personality_traits JSON,
    speaking_style JSON,
    behavior_settings JSON,
    expertise_areas JSON,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. meetings 表 (会议)
```sql
CREATE TABLE meetings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled') DEFAULT 'draft',
    topic VARCHAR(200) NOT NULL,
    meeting_rules JSON,
    discussion_config JSON,
    scheduled_start_time TIMESTAMP,
    actual_start_time TIMESTAMP,
    end_time TIMESTAMP,
    participants_count INT DEFAULT 0,
    messages_count INT DEFAULT 0,
    meeting_summary TEXT,
    key_insights JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3. meeting_participants 表 (会议参与者)
```sql
CREATE TABLE meeting_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    meeting_id INT NOT NULL,
    agent_id INT NOT NULL,
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

#### 4. meeting_messages 表 (会议消息)
```sql
CREATE TABLE meeting_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    meeting_id INT NOT NULL,
    agent_id INT NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('analysis', 'question', 'suggestion', 'summary') DEFAULT 'analysis',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

#### 5. system_config 表 (系统配置)
```sql
CREATE TABLE system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description VARCHAR(500),
    is_encrypted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 技术实现要点

### 1. FastAPI 后端实现
- 使用 Pydantic 模型进行数据验证
- 实现异步数据库操作 (SQLAlchemy + asyncpg/aiomysql)
- 使用依赖注入管理数据库连接
- 实现 WebSocket 连接管理器
- 添加请求日志和错误处理中间件

### 2. CrewAI 集成
- 基于数据库中的 agent 配置动态创建 CrewAI Agent
- 实现会议流程编排和智能体协作逻辑
- 将会议过程和结果持久化到数据库
- 通过 WebSocket 推送实时状态更新

### 3. 安全和性能
- API 密钥加密存储
- 实现请求频率限制
- 添加输入数据验证和清理
- 数据库查询优化和索引设计
- 实现缓存机制 (Redis)

## 项目当前状态

### 已完成 ✅
- [x] 完整的前端应用架构 (Next.js + TypeScript)
- [x] 统一的 Hash 路由系统
- [x] 智能体和会议管理界面
- [x] 系统配置页面 (模型参数配置)
- [x] 响应式UI设计 (Tailwind + Antd)
- [x] TypeScript 类型安全
- [x] 完整的API接口规范文档

### 待开发 🔄
- [ ] FastAPI 后端API实现
- [ ] 数据库设计和迁移脚本
- [ ] CrewAI 智能体协作逻辑
- [ ] WebSocket 实时通信
- [ ] 模型配置管理和测试
- [ ] 会议流程编排引擎

## 启动项目命令

```bash
# 后端启动
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
# 访问: http://localhost:8000

# 前端启动
cd frontend/crewai-frontend
npm install
npm run dev
# 访问: http://localhost:3000
```

---

**总结**: 项目已完成前端架构设计和界面实现，建立了完整的API规范。下一步需要实现后端API服务，集成CrewAI框架，并建立数据库持久化机制。前端已具备生产就绪的代码质量，后端实现可以按照API规范逐步开发。