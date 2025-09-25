from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 导入所有API路由
from app.api.routes import router as legacy_router
from app.api.agents import router as agents_router
from app.api.meetings import router as meetings_router
from app.api.config import router as config_router
from app.api.test import router as test_router
from app.api.meeting_stream import router as meeting_stream_router

# 导入数据库相
from app.models import create_database, get_database_session, init_sample_data

app = FastAPI(
    title="CrewAI Multi-Agent Meeting System",
    description="智能多Agent会议协作系统 - 支持Agent配置、会议管理、实时讨论和历史回放",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # 备用端口
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 数据库初始化事件
@app.on_event("startup")
async def startup_event():
    """应用启动时初始化数据库"""
    try:
        create_database()
        # 初始化示例数据
        db = next(get_database_session())
        init_sample_data(db)
        print("Database initialization completed")
    except Exception as e:
        print(f"Database initialization failed: {str(e)}")

# 包含所有API路由
app.include_router(legacy_router, prefix="/api/v1", tags=["Legacy"])
app.include_router(agents_router, prefix="/api/v1", tags=["Agent管理"])
app.include_router(meetings_router, prefix="/api/v1", tags=["会议管理"])
app.include_router(config_router, prefix="/api/v1", tags=["系统配置"])
app.include_router(test_router, prefix="/api/v1", tags=["测试接口"])
app.include_router(meeting_stream_router, prefix="/api/v1", tags=["会议实时流"])

@app.get("/", tags=["系统"])
async def root():
    """系统根路径"""
    return {
        "message": "CrewAI Multi-Agent Meeting System",
        "version": "2.0.0",
        "features": [
            "Agent个性化配置",
            "智能会议管理", 
            "实时协作讨论",
            "历史回放分析",
            "DeepSeek模型集成"
        ],
        "endpoints": {
            "docs": "/docs",
            "agents": "/api/v1/agents",
            "meetings": "/api/v1/meetings", 
            "config": "/api/v1/config"
        }
    }

@app.get("/health", tags=["系统"])
async def health_check(db: Session = Depends(get_database_session)):
    """系统健康检查"""
    try:
        # 检查数据库连接
        from sqlalchemy import text
        db.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "version": "2.0.0",
            "database": "connected",
            "timestamp": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": "2024-01-01T00:00:00Z"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)