
import config
import uvicorn
import asyncio

from fastapi import FastAPI
from contextlib import asynccontextmanager
from apis.base import api_router
from starlette.middleware.cors import CORSMiddleware
from services.rtsp_fetcher import rtsp_fetcher
from apis.v1.route_tracking import reset_counts_periodically

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INFO] Starting application")
    rtsp_fetcher.start()
    reset_task = asyncio.create_task(reset_counts_periodically())
    yield
    reset_task.cancel()
    
    try:
        await reset_task
    except asyncio.CancelledError:
        pass

    rtsp_fetcher.stop()
    print("[INFO] Shutting down RTSP streams")


def add_middleware(app):
    origins = [
        # settings.CLIENT_ORIGIN,
        "*"
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

def include_router(app):
    app.include_router(api_router)

def start_application():
    app = FastAPI(
        title=config.PROJECT_NAME, 
        version=config.PROJECT_VERSION, 
        lifespan=lifespan
    )
    add_middleware(app)
    include_router(app)

    return app

app = start_application()

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5101
    )
