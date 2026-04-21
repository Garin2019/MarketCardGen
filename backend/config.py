from dotenv import load_dotenv
import os

load_dotenv()

# App
DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/app.db")
UPLOAD_DIR    = os.getenv("UPLOAD_DIR",    "./data/uploads")
LOG_DIR       = os.getenv("LOG_DIR",       "./data/logs")
LOG_LEVEL     = os.getenv("LOG_LEVEL",     "INFO")
EDITOR_URL    = os.getenv("EDITOR_URL",    "")
CORS_ORIGINS  = os.getenv("CORS_ORIGINS",  "http://localhost:3000,http://127.0.0.1:3000")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")

# AI — Text
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "")
QWEN_TEXT_MODEL = os.getenv("QWEN_TEXT_MODEL", "qwen3.5-plus")
QWEN_IMAGE_MODEL = os.getenv("QWEN_IMAGE_MODEL", "qwen-image-edit")
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_TEXT_MODEL = os.getenv("MINIMAX_TEXT_MODEL", "MiniMax-M2.5")
MINIMAX_IMAGE_MODEL = os.getenv("MINIMAX_IMAGE_MODEL", "image-01")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4.1-mini")
OPENAI_IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1.5")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL   = os.getenv("OPENROUTER_MODEL", "google/gemma-3-27b-it:free")

# Social
VK_ACCESS_TOKEN = os.getenv("VK_ACCESS_TOKEN", "")
VK_OWNER_ID = os.getenv("VK_OWNER_ID", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "")
MAX_ACCESS_TOKEN = os.getenv("MAX_ACCESS_TOKEN", "")
MAX_CHANNEL_ID = os.getenv("MAX_CHANNEL_ID", "")
