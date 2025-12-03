from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.database import db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.close()

app = FastAPI(title="Hey Mark! API", version="3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for now, restrict in production if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hey Mark! API v3 is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

from routers import upload, dashboard, tts_clips, custom_prompt, delete_clip, auth
app.include_router(upload.router)
app.include_router(dashboard.router)
app.include_router(tts_clips.router)
app.include_router(custom_prompt.router)
app.include_router(delete_clip.router)
app.include_router(auth.router)

from fastapi.staticfiles import StaticFiles
import os
os.makedirs("uploads/clips", exist_ok=True)
app.mount("/clips", StaticFiles(directory="uploads/clips"), name="clips")
