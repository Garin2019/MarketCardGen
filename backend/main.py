import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException

from database import init_db
from config import UPLOAD_DIR, CORS_ORIGINS

from routers import settings, products, text_generation, image_generation, social, export, templates


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Marketplace Card App",
    description="MVP для подготовки карточек товаров и контента",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — origins из .env, дефолт — локальный dev-сервер
origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Раздаём загруженные файлы как статику
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Роутеры
app.include_router(settings.router)
app.include_router(products.router)
app.include_router(text_generation.router)
app.include_router(image_generation.router)
app.include_router(social.router)
app.include_router(export.router)
app.include_router(templates.router)


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok"}


# Глобальный обработчик — НЕ перехватываем HTTPException (они уже обработаны FastAPI)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        raise exc
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )
