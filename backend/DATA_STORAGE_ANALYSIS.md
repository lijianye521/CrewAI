# CrewAI 数据存储和向量化现状分析

## 当前数据存储方案

### 1. 主数据库 - SQLite
- **文件位置**: `backend/crewai_meeting.db`
- **数据库类型**: SQLite
- **ORM**: SQLAlchemy
- **连接配置**: `DATABASE_URL = "sqlite:///./crewai_meeting.db"`

### 2. 数据表结构

#### Agent 配置表 (agent_config)
```sql
- id: 主键
- name: Agent名称
- role: 角色
- personality_traits: 个性特征 (JSON)
- speaking_style: 说话风格 (JSON)  
- behavior_settings: 行为设置 (JSON)
- backstory: 背景故事 (TEXT)
- goal: 目标描述 (TEXT)
- expertise_areas: 专业领域 (JSON)
- is_active: 是否激活
- created_at/updated_at: 时间戳
```

#### 会议表 (meetings)
```sql
- id: 主键
- title: 会议标题
- description: 会议描述
- topic: 主题
- status: 状态 (draft/scheduled/active/completed等)
- meeting_rules: 会议规则 (JSON)
- discussion_config: 讨论配置 (JSON)
- scheduled_start: 计划开始时间
- actual_start/actual_end: 实际开始/结束时间
```

#### 消息表 (meeting_messages)
```sql
- id: 主键
- meeting_id: 会议ID (外键)
- agent_id: Agent ID (外键)
- agent_name: Agent名称
- content: 消息内容 (TEXT)
- message_type: 消息类型
- metadata: 元数据 (JSON)
- created_at: 创建时间
```

## 向量化现状

### ❌ 当前未实现的向量化功能

1. **语义搜索**: 目前只有基础的文本匹配搜索
2. **智能推荐**: 没有基于向量相似度的Agent推荐
3. **会议内容分析**: 缺乏对会议内容的语义理解
4. **知识检索**: 无法进行语义化的知识查询

### 🔍 当前搜索实现 (基础文本搜索)

```python
# agent_service.py - 当前搜索实现
def search_agents(self, keyword: str):
    query = self.db.query(AgentConfig).filter(
        AgentConfig.name.contains(keyword) |
        AgentConfig.role.contains(keyword) |
        AgentConfig.backstory.contains(keyword)
    )
```

## 建议的向量化升级方案

### 1. 向量数据库选择

#### 方案A: 集成向量数据库
- **Chroma**: 轻量级，适合快速集成
- **Pinecone**: 云服务，性能优秀
- **Weaviate**: 开源，功能丰富

#### 方案B: 本地向量存储
- **FAISS**: Facebook开源，高性能
- **Annoy**: Spotify开源，内存友好

### 2. 向量化实现架构

```python
# 建议的向量化服务架构
class VectorService:
    def __init__(self):
        self.embedding_model = "text-embedding-ada-002"  # 或使用本地模型
        self.vector_db = ChromaDB()  # 或其他向量数据库
    
    async def embed_agent_profile(self, agent: AgentConfig):
        """将Agent配置向量化"""
        text = f"{agent.name} {agent.role} {agent.backstory} {agent.goal}"
        embedding = await self.get_embedding(text)
        self.vector_db.upsert(
            collection="agents",
            id=str(agent.id),
            embedding=embedding,
            metadata=agent.to_dict()
        )
    
    async def semantic_search_agents(self, query: str, limit: int = 10):
        """语义搜索Agent"""
        query_embedding = await self.get_embedding(query)
        results = self.vector_db.query(
            collection="agents",
            query_embeddings=[query_embedding],
            n_results=limit
        )
        return results
```

### 3. 具体实现步骤

#### 第一阶段: Agent向量化
1. 为每个Agent生成语义向量
2. 存储在向量数据库中
3. 实现语义搜索API

#### 第二阶段: 会议内容向量化
1. 会议消息实时向量化
2. 会议主题和讨论点提取
3. 智能会议推荐

#### 第三阶段: 知识图谱
1. Agent关系图谱
2. 专业领域关联
3. 历史会议关联分析

## 实施建议

### 1. 技术栈选择
- **嵌入模型**: OpenAI text-embedding-ada-002 或 开源模型
- **向量数据库**: Chroma (易于集成) 或 FAISS (高性能)
- **相似度计算**: 余弦相似度

### 2. 数据迁移
```python
# 迁移脚本示例
async def migrate_existing_data():
    agents = db.query(AgentConfig).all()
    for agent in agents:
        await vector_service.embed_agent_profile(agent)
    
    meetings = db.query(Meeting).all()
    for meeting in meetings:
        await vector_service.embed_meeting_content(meeting)
```

### 3. API增强
```python
# 新增语义搜索API
@router.get("/agents/semantic-search")
async def semantic_search_agents(
    query: str,
    limit: int = 10,
    vector_service: VectorService = Depends(get_vector_service)
):
    results = await vector_service.semantic_search_agents(query, limit)
    return results
```

## 性能考虑

1. **嵌入生成**: 异步处理，避免阻塞
2. **向量存储**: 定期备份和索引优化
3. **缓存策略**: 热门查询结果缓存
4. **批量处理**: 大量数据的批量向量化

## 成本分析

- **OpenAI Embedding API**: ~$0.0001/1K tokens
- **本地模型**: 无API成本，需要计算资源
- **向量数据库**: Chroma免费，Pinecone按使用量收费

## 结论

当前系统使用传统关系数据库存储，缺乏向量化能力。建议优先实现Agent配置的向量化搜索，逐步扩展到会议内容和知识图谱功能。这将显著提升用户体验和系统智能化水平。
