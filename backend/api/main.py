from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import get_settings
from api.database import check_tables
from api.routes import admin_songs, songs, translate


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    check_tables()
    yield


app = FastAPI(title="Lyrix API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(songs.router)
app.include_router(translate.router)
app.include_router(admin_songs.router)


@app.get("/health", tags=["sistema"])
def health() -> dict[str, str]:
    return {"status": "ok"}
