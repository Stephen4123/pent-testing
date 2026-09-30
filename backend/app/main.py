from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.db.models import Base
from app.db.session import engine, sync_db_schema
from app.orchestrator.queue_manager import scan_queue_watcher

@asynccontextmanager
async def lifespan(app: FastAPI):
    print('Starting AI Pentest Platform Backend...')
    sync_db_schema()
    watcher_task = asyncio.create_task(scan_queue_watcher())
    yield
    print('Shutting down...')
    watcher_task.cancel()

app = FastAPI(title='AI Pentest Platform API', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.get('/api/health')
async def health_check(): return {'status': 'ok'}

from app.api.endpoints import router as api_router
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router

app.include_router(api_router, prefix='/api')
app.include_router(auth_router, prefix='/api/auth', tags=['auth'])
app.include_router(admin_router, prefix='/api')