# 基于CrewAI的多智能体投资决策协作系统

## 项目需求文档 v1.0

------

## 1. 项目背景与目标

### 1.1 项目背景

传统投资决策往往依赖单一分析师的判断，存在以下问题：

- **视角局限性**：单一分析师难以覆盖基本面、技术面、风险控制等多个维度
- **主观偏见**：个人经验和认知局限可能导致决策偏差
- **信息孤岛**：不同分析师之间缺乏有效的信息共享和协作机制
- **决策追溯难**：缺乏完整的决策过程记录，难以复盘和优化

### 1.2 项目目标

构建一个基于CrewAI框架的多智能体投资决策协作系统，通过模拟专业投资团队的协作模式，为用户提供更全面、客观的投资建议。

**核心目标：**

- 提供多维度、全方位的股票投资分析
- 实现智能体间的高效协作和信息共享
- 提供可视化的决策过程展示
- 建立可追溯的投资决策记录体系

------

## 2. 系统功能需求

### 2.1 核心功能模块

#### 2.1.1 多智能体协作引擎

- **基本面分析师Agent**：负责财务数据分析、估值计算、行业对比
- **技术分析师Agent**：专注K线图分析、技术指标计算、趋势判断
- **风险控制Agent**：评估投资风险、资金管理建议、止损策略
- **市场情绪Agent**：分析新闻舆情、市场热度、投资者情绪
- **决策协调Agent**：综合各方意见、权重分配、最终建议生成

#### 2.1.2 实时协作可视化

- **讨论界面**：展示各Agent的实时对话过程
- **观点展示**：分类显示不同维度的分析结果
- **争议标记**：高亮显示Agent间的分歧点
- **共识达成**：显示最终一致性意见的形成过程

#### 2.1.3 投资分析Dashboard

- **综合评分**：基于多Agent分析的综合投资评分
- **风险雷达图**：多维度风险评估可视化
- **价格预测**：基于多方分析的价格走势预测
- **投资建议**：具体的买入/卖出/持有建议

#### 2.1.4 历史决策追溯

- **决策记录**：完整记录每次投资决策的全过程
- **回放功能**：可重新播放历史决策的协作过程
- **绩效追踪**：跟踪历史建议的实际投资表现
- **策略优化**：基于历史数据优化Agent策略

### 2.2 技术功能需求

#### 2.2.1 数据接入能力

- **实时股价数据**：接入股票实时行情数据
- **财务数据**：获取上市公司财务报表数据
- **新闻舆情**：实时抓取相关新闻和市场动态
- **技术指标**：计算各类技术分析指标

#### 2.2.2 AI能力集成

- **LLM集成**：支持多个大语言模型（GPT-4、Claude等）
- **向量检索**：基于RAG技术的知识库检索
- **情感分析**：新闻和社交媒体情感分析
- **数值计算**：财务指标和技术指标计算

------

## 3. 系统架构设计

### 3.1 整体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端展示层    │    │   业务逻辑层    │    │   数据服务层    │
│                 │    │                 │    │                 │
│ React Dashboard │◄──►│ FastAPI Server  │◄──►│ 数据接口服务   │
│ Echarts可视化   │    │ Agent编排引擎   │    │ 向量数据库     │
│ WebSocket通信   │    │ CrewAI框架     │    │ 关系数据库     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 3.2 核心组件设计

#### 3.2.1 Agent编排引擎

```python
class AgentOrchestrator:
    def __init__(self):
        self.agents = {}
        self.workflow = None
        self.memory_store = None
    
    def create_investment_crew(self, stock_symbol):
        # 创建投资分析团队
        pass
    
    def execute_analysis(self, stock_symbol):
        # 执行投资分析流程
        pass
    
    def aggregate_results(self, agent_outputs):
        # 聚合各Agent分析结果
        pass
```

#### 3.2.2 智能体定义

```python
class FundamentalAnalyst(Agent):
    role = "基本面分析师"
    goal = "分析公司财务状况和内在价值"
    backstory = "擅长财务报表分析和估值计算的专业分析师"
    
class TechnicalAnalyst(Agent):
    role = "技术分析师" 
    goal = "分析股票价格走势和技术指标"
    backstory = "精通技术分析和图表分析的交易专家"
```

### 3.3 数据流设计

#### 3.3.1 分析流程

```
1. 用户输入股票代码
2. 数据服务层获取相关数据
3. Agent编排引擎分配任务
4. 各Agent并行执行分析
5. 协调Agent聚合结果
6. 前端实时展示分析过程
7. 生成最终投资建议
8. 记录决策过程到数据库
```

#### 3.3.2 实时通信机制

- **WebSocket连接**：前后端实时通信
- **消息队列**：Agent间异步消息传递
- **事件驱动**：基于事件的状态更新机制

------

## 4. 技术实现方案

### 4.1 后端技术栈

#### 4.1.1 核心框架

- **FastAPI**：高性能Web框架，支持异步处理
- **CrewAI**：多智能体协作框架
- **LangChain**：LLM应用开发框架
- **SQLAlchemy**：ORM数据库操作
- **Redis**：缓存和消息队列
- **Celery**：异步任务处理

#### 4.1.2 AI能力集成

```python
# CrewAI Agent配置示例
from crewai import Agent, Task, Crew

fundamental_analyst = Agent(
    role='基本面分析师',
    goal='分析{company}的财务状况和投资价值',
    backstory='拥有10年投资经验的资深分析师，擅长财务建模和估值分析',
    verbose=True,
    allow_delegation=False,
    tools=[financial_data_tool, valuation_calculator]
)

analysis_task = Task(
    description='对{company}进行全面的基本面分析',
    agent=fundamental_analyst,
    expected_output='包含财务指标、估值结果和投资建议的详细报告'
)
```

### 4.2 前端技术栈

#### 4.2.1 核心技术

- **React 18**：组件化前端框架
- **TypeScript**：类型安全的JavaScript
- **Echarts**：数据可视化图表库
- **Ant Design**：企业级UI组件库
- **Socket.io**：实时通信客户端
- **Zustand**：轻量级状态管理

#### 4.2.2 关键组件设计

```typescript
// Agent对话组件
interface AgentMessage {
  agentType: 'fundamental' | 'technical' | 'risk' | 'sentiment';
  content: string;
  timestamp: number;
  confidence: number;
}

const AgentDiscussion: React.FC = () => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  
  useEffect(() => {
    // WebSocket监听Agent消息
    socket.on('agent_message', (message: AgentMessage) => {
      setMessages(prev => [...prev, message]);
    });
  }, []);
  
  return (
    <div className="agent-discussion">
      {messages.map(message => (
        <AgentMessageCard key={message.timestamp} message={message} />
      ))}
    </div>
  );
};
```

### 4.3 数据库设计

#### 4.3.1 核心表结构

```sql
-- 投资分析会话表
CREATE TABLE analysis_sessions (
    id BIGINT PRIMARY KEY,
    stock_symbol VARCHAR(10) NOT NULL,
    user_id BIGINT,
    status VARCHAR(20),
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Agent分析结果表
CREATE TABLE agent_results (
    id BIGINT PRIMARY KEY,
    session_id BIGINT,
    agent_type VARCHAR(50),
    analysis_content TEXT,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP
);

-- 最终投资建议表
CREATE TABLE investment_recommendations (
    id BIGINT PRIMARY KEY,
    session_id BIGINT,
    recommendation_type VARCHAR(20), -- BUY/SELL/HOLD
    target_price DECIMAL(10,2),
    risk_level VARCHAR(20),
    reasoning TEXT,
    created_at TIMESTAMP
);
```

------

## 5. Prompt工程设计

### 5.1 角色Prompt模板

#### 5.1.1 基本面分析师Prompt

```
你是一位经验丰富的基本面分析师，拥有15年的投资分析经验。

角色设定：
- 专精于财务报表分析、估值模型构建和行业研究
- 善于从财务数据中发现投资机会和风险点
- 注重长期价值投资理念，关注公司基本面质量

分析任务：
1. 分析公司最近3年的财务指标变化趋势
2. 计算各种估值指标（PE、PB、PEG、DCF等）
3. 评估公司在行业中的竞争地位
4. 识别财务风险和增长驱动因素

输出格式：
- 财务健康度评分（1-10分）
- 估值水平评估（低估/合理/高估）
- 投资建议（强烈买入/买入/持有/卖出）
- 风险提示和关键假设

请基于提供的数据进行客观、专业的分析。
```

#### 5.1.2 技术分析师Prompt

```
你是一位专业的技术分析师，精通各种技术分析方法和交易策略。

角色设定：
- 10年技术分析经验，熟悉各种技术指标和图表模式
- 擅长识别趋势、支撑阻力位和买卖信号
- 注重风险控制和资金管理

分析重点：
1. 识别当前价格趋势和关键技术位
2. 分析成交量和价格的配合关系
3. 计算主要技术指标（MA、MACD、RSI、KDJ等）
4. 判断短期和中期的交易机会

输出要求：
- 技术面评分（1-10分）
- 关键支撑阻力位
- 短期价格目标和止损位
- 最佳买入/卖出时机

请保持客观中性的分析态度，避免过度乐观或悲观。
```

### 5.2 协作对话Prompt

```
现在你们需要作为专业投资团队就{stock_symbol}进行投资决策讨论。

讨论规则：
1. 每位分析师从自己的专业角度发表观点
2. 如果观点存在分歧，请进行充分讨论
3. 重点关注风险控制和投资逻辑
4. 最终需要达成一致的投资建议

讨论流程：
1. 各自发表初步分析结论
2. 针对分歧点进行深入讨论
3. 综合考虑各方观点
4. 形成最终投资建议

请确保讨论过程专业、客观，避免情绪化判断。
```

------

## 6. 开发计划与里程碑

### 6.1 第一阶段：基础框架搭建（2周）

- [ ] 项目架构设计和技术选型
- [ ] 后端API框架搭建
- [ ] 前端基础页面开发
- [ ] 数据库设计和初始化
- [ ] CrewAI框架集成测试

### 6.2 第二阶段：核心功能开发（3周）

- [ ] Agent角色定义和Prompt优化
- [ ] 多智能体协作流程实现
- [ ] 实时通信机制开发
- [ ] 基础数据接入（模拟数据）
- [ ] 前端可视化组件开发

### 6.3 第三阶段：功能完善（2周）

- [ ] 真实数据接入集成
- [ ] 历史决策记录和回放功能
- [ ] 性能优化和错误处理
- [ ] 用户界面优化和测试
- [ ] 系统集成测试

### 6.4 第四阶段：部署上线（1周）

- [ ] 生产环境部署配置
- [ ] 安全性测试和优化
- [ ] 监控告警系统配置
- [ ] 用户文档编写
- [ ] 系统上线和验收

------

## 7. 风险评估与应对

### 7.1 技术风险

**风险点**：CrewAI框架稳定性和性能问题 **应对策略**：准备备用的多Agent实现方案，建立完善的错误处理机制

**风险点**：大语言模型API调用成本和延迟 **应对策略**：实现模型调用优化策略，建立缓存机制减少重复调用

### 7.2 数据风险

**风险点**：实时金融数据获取的稳定性 **应对策略**：建立多数据源备份机制，实现数据验证和清洗流程

### 7.3 业务风险

**风险点**：投资建议的准确性和法律责任 **应对策略**：明确系统定位为辅助决策工具，添加免责声明，建立建议记录机制

------

## 8. 成功指标定义

### 8.1 技术指标

- **系统可用性**：>99.5%
- **API响应时间**：<2秒
- **并发用户支持**：>100人同时在线
- **数据准确性**：>95%

### 8.2 业务指标

- **用户满意度**：>4.0/5.0
- **投资建议采纳率**：>60%
- **历史建议准确率**：>65%
- **用户留存率**：>80%

------

## 9. 部署和运维

### 9.1 部署架构

```
负载均衡器 → Web服务器集群 → API网关 → 微服务集群
                ↓
           Redis缓存集群
                ↓
           数据库主从集群
```

### 9.2 监控体系

- **应用监控**：APM性能监控
- **基础监控**：服务器资源监控
- **业务监控**：关键业务指标监控
- **日志监控**：集中化日志分析

------

这份文档为您的CrewAI多智能体投资决策系统提供了完整的需求分析和实现方案。每个模块都有清晰的逻辑和实现路径，可以作为开发的指导文档。