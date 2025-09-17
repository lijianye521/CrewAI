# CrewAI 项目结构重组方案

## 当前问题
1. 前端文件组织不够清晰，缺乏分层架构
2. 后端API结构可以更加模块化
3. 缺乏统一的错误处理和工具函数
4. 项目配置和文档散乱

## 新的项目结构

### 前端结构 (frontend/crewai-frontend/)
```
├── app/                          # Next.js 13+ App Router
│   ├── (auth)/                   # 认证相关页面组
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # 主要功能页面组
│   │   ├── agents/               # 智能体管理
│   │   ├── meetings/             # 会议管理
│   │   ├── analytics/            # 数据分析
│   │   └── settings/             # 系统设置
│   ├── api/                      # API 路由 (如果需要)
│   ├── globals.css               # 全局样式
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页
├── src/                          # 源代码目录
│   ├── components/               # 可复用组件
│   │   ├── ui/                   # 基础UI组件
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── Form/
│   │   │   └── Modal/
│   │   ├── business/             # 业务组件
│   │   │   ├── AgentCard/
│   │   │   ├── MeetingPanel/
│   │   │   └── ConfigPanel/
│   │   ├── layout/               # 布局组件
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   └── Footer/
│   │   └── charts/               # 图表组件
│   ├── hooks/                    # 自定义Hooks
│   │   ├── useApi.ts
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   └── useErrorHandler.ts
│   ├── lib/                      # 工具库
│   │   ├── api/                  # API客户端
│   │   │   ├── client.ts
│   │   │   ├── agents.ts
│   │   │   ├── meetings.ts
│   │   │   └── config.ts
│   │   ├── utils/                # 工具函数
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   └── constants.ts
│   │   ├── types/                # 类型定义
│   │   │   ├── api.ts
│   │   │   ├── agent.ts
│   │   │   └── meeting.ts
│   │   └── auth/                 # 认证相关
│   ├── store/                    # 状态管理
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── agentSlice.ts
│   │   │   └── meetingSlice.ts
│   │   └── index.ts
│   └── styles/                   # 样式文件
│       ├── globals.css
│       ├── components.css
│       └── themes/
└── public/                       # 静态资源
    ├── icons/
    ├── images/
    └── favicon.ico
```

### 后端结构 (backend/)
```
├── app/                          # 主应用目录
│   ├── api/                      # API路由
│   │   ├── v1/                   # API版本控制
│   │   │   ├── endpoints/        # API端点
│   │   │   │   ├── agents.py
│   │   │   │   ├── meetings.py
│   │   │   │   ├── config.py
│   │   │   │   └── analytics.py
│   │   │   └── router.py         # 路由汇总
│   │   └── middleware/           # 中间件
│   │       ├── auth.py
│   │       ├── cors.py
│   │       └── error_handler.py
│   ├── core/                     # 核心配置
│   │   ├── config.py             # 应用配置
│   │   ├── database.py           # 数据库配置
│   │   ├── security.py           # 安全配置
│   │   └── settings.py           # 设置管理
│   ├── models/                   # 数据模型
│   │   ├── base.py               # 基础模型
│   │   ├── agent.py              # 智能体模型
│   │   ├── meeting.py            # 会议模型
│   │   └── user.py               # 用户模型
│   ├── schemas/                  # Pydantic模式
│   │   ├── agent.py
│   │   ├── meeting.py
│   │   └── config.py
│   ├── services/                 # 业务服务
│   │   ├── ai/                   # AI服务
│   │   │   ├── crewai_service.py
│   │   │   ├── deepseek_service.py
│   │   │   └── openai_service.py
│   │   ├── agent_service.py      # 智能体服务
│   │   ├── meeting_service.py    # 会议服务
│   │   └── websocket_service.py  # WebSocket服务
│   ├── utils/                    # 工具函数
│   │   ├── helpers.py
│   │   ├── validators.py
│   │   └── exceptions.py
│   └── tests/                    # 测试文件
│       ├── unit/
│       ├── integration/
│       └── conftest.py
├── migrations/                   # 数据库迁移
├── scripts/                      # 脚本文件
│   ├── init_db.py
│   └── dev_setup.py
├── docs/                         # 文档
│   ├── api.md
│   └── deployment.md
├── requirements/                 # 依赖管理
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── main.py                       # 应用入口
├── .env.example                  # 环境变量示例
└── README.md
```

### 项目根目录
```
CrewAI/
├── frontend/                     # 前端应用
├── backend/                      # 后端应用
├── docs/                         # 项目文档
│   ├── README.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
├── scripts/                      # 项目脚本
│   ├── setup.sh                  # 环境搭建
│   ├── deploy.sh                 # 部署脚本
│   └── test.sh                   # 测试脚本
├── docker/                       # Docker配置
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── .github/                      # GitHub配置
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .gitignore
├── CLAUDE.md                     # 项目记忆文件
└── README.md                     # 项目说明
```

## 迁移计划

### 阶段1: 前端重构
1. 创建新的目录结构
2. 移动现有组件到对应目录
3. 重构导入路径
4. 优化组件的职责分离

### 阶段2: 后端重构
1. 重新组织API结构
2. 分离业务逻辑和数据层
3. 添加统一的错误处理
4. 完善测试覆盖

### 阶段3: 项目工程化
1. 添加代码规范工具
2. 配置自动化测试
3. 添加Docker支持
4. 完善文档

## 实施优先级
1. **高优先级**: 前端组件重构、API错误处理
2. **中优先级**: 后端服务分层、类型定义
3. **低优先级**: Docker配置、CI/CD流程