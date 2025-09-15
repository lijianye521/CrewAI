# CrewAI 多智能体投资决策协作系统

基于 CrewAI 框架的多智能体投资决策协作系统，通过模拟专业投资团队的协作模式，为用户提供全面、客观的投资建议。

## 项目结构

```
CrewAI/
├── frontend/                  # Next.js 前端应用
│   └── crewai-frontend/       # 前端项目根目录
│       ├── app/               # Next.js App Router
│       ├── components/        # React 组件
│       │   └── ui/           # UI 组件库
│       ├── lib/              # 工具函数
│       └── package.json      # 前端依赖
├── backend/                   # FastAPI 后端应用
│   ├── main.py               # FastAPI 主应用
│   ├── app/                  # 应用程序代码
│   │   ├── api/             # API 路由
│   │   ├── agents/          # CrewAI 智能体
│   │   ├── core/            # 核心配置
│   │   ├── models/          # 数据模型
│   │   └── services/        # 业务服务
│   ├── config/              # 配置文件
│   ├── tests/               # 测试文件
│   ├── venv/                # Python 虚拟环境
│   └── requirements.txt     # Python 依赖
└── ReadMe.txt               # 项目需求文档
```

## 技术栈

### 前端
- **Next.js 15** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Radix UI** - UI 组件库
- **Lucide React** - 图标库
- **Socket.io Client** - WebSocket 实时通信

### 后端
- **FastAPI** - 高性能 Web 框架
- **CrewAI** - 多智能体协作框架
- **LangChain** - LLM 应用开发框架
- **SQLAlchemy** - ORM 数据库操作
- **WebSockets** - 实时通信
- **Uvicorn** - ASGI 服务器

## 核心功能

### 多智能体系统
- **基本面分析师Agent** - 财务数据分析、估值计算、行业对比
- **技术分析师Agent** - K线图分析、技术指标计算、趋势判断
- **风险控制Agent** - 投资风险评估、资金管理建议、止损策略
- **市场情绪Agent** - 新闻舆情分析、市场热度、投资者情绪
- **决策协调Agent** - 综合各方意见、权重分配、最终建议生成

### 实时协作可视化
- 展示各 Agent 的实时对话过程
- 分类显示不同维度的分析结果
- 高亮显示 Agent 间的分歧点
- 显示最终一致性意见的形成过程

### 投资分析 Dashboard
- 基于多 Agent 分析的综合投资评分
- 多维度风险评估可视化
- 基于多方分析的价格走势预测
- 具体的买入/卖出/持有建议

## 快速开始

### 前置条件
- Node.js 18+ 
- Python 3.8+
- npm 或 yarn

### 安装和运行

#### 1. 启动后端服务

```bash
cd backend

# 激活虚拟环境 (Windows)
venv\\Scripts\\activate

# 安装依赖
pip install -r requirements.txt

# 启动 FastAPI 服务
python main.py
```

后端服务将在 `http://localhost:8000` 运行

#### 2. 启动前端应用

```bash
cd frontend/crewai-frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 `http://localhost:3000` 运行

### API 接口

- `GET /` - 健康检查
- `GET /api/v1/health` - 服务状态检查
- `POST /api/v1/analysis/start` - 启动股票分析
- `GET /api/v1/analysis/{session_id}` - 获取分析结果
- `WebSocket /api/v1/ws` - 实时通信端点

## 系统特性

### 多维度分析
基本面、技术面、风险控制、市场情绪四个维度全覆盖

### 实时协作
智能体间实时讨论，形成一致性投资决策

### 可视化过程
完整展示分析过程，决策透明可追溯

### 风险控制
专业风控分析，提供完善的风险管理建议

## 开发规划

### 第一阶段 ✅
- [x] 项目架构设计和技术选型
- [x] 后端 API 框架搭建
- [x] 前端基础页面开发
- [x] CrewAI 框架集成

### 第二阶段 (进行中)
- [ ] Agent 角色定义和 Prompt 优化
- [ ] 多智能体协作流程实现
- [ ] 实时通信机制完善
- [ ] 真实数据接入集成

### 第三阶段 (计划中)
- [ ] 历史决策记录和回放功能
- [ ] 性能优化和错误处理
- [ ] 用户界面优化和测试
- [ ] 系统集成测试

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

本项目采用 MIT 许可证。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至项目维护者