import json
import datetime
import re
from datetime import timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlmodel import Session, select
from models import Product, GeneratedImage, SocialPost
from database import get_session
from services.social_text_service import generate_post_text
from services.social.vk_service       import publish as vk_publish
from services.social.telegram_service import publish as tg_publish
from services.social.max_service      import publish as max_publish
from utils.db_helpers import get_setting, increment_setting_counter
from logger import get_logger

log = get_logger("social")

router = APIRouter(prefix="/api/social", tags=["social"])

PUBLISHERS = {
    "vk":       vk_publish,
    "telegram": tg_publish,
    "max":      max_publish,
}

HTML_TAG_RE = re.compile(r"</?[^>]+>")


def _post_to_dict(p: SocialPost) -> dict:
    return {
        "id":           p.id,
        "product_id":   p.product_id,
        "platform":     p.platform,
        "post_text":    p.post_text,
        "post_size":    p.post_size,
        "tone":         p.tone,
        "hashtags":     json.loads(p.hashtags or "[]"),
        "use_emoji":    p.use_emoji,
        "status":       p.status,
        "published_at": p.published_at.isoformat() if p.published_at else None,
        "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
        "created_at":   p.created_at.isoformat(),
    }


# ── POST /api/social/generate-post ───────────────────────────────────────────

class GeneratePostRequest(BaseModel):
    product_id: int
    platform:   str                    # vk | telegram | max
    post_size:  Optional[int]          = None
    tone:       Optional[str]          = None
    use_emoji:  Optional[bool]         = True
    hashtags:   Optional[List[str]]    = None
    provider:   Optional[str]          = None
    post_text_override: Optional[str]  = None
    hashtags_override: Optional[List[str]] = None


def _strip_html_tags(text: str) -> str:
    cleaned = HTML_TAG_RE.sub("", text or "")
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _adapt_post_text_for_platform(platform: str, text: str) -> str:
    if platform == "telegram":
        return text
    return _strip_html_tags(text)


@router.post("/generate-post")
async def generate_post(
    body: GeneratePostRequest,
    session: Session = Depends(get_session),
):
    if body.platform not in PUBLISHERS:
        raise HTTPException(400, f"Неизвестная платформа: {body.platform}. Доступны: vk, telegram, max")

    product = session.get(Product, body.product_id)
    if not product:
        raise HTTPException(404, f"Продукт {body.product_id} не найден")

    post_size = body.post_size or int(get_setting("default_post_size", "600"))
    tone      = body.tone      or get_setting("default_post_tone", "friendly")
    provider  = body.provider  or get_setting("default_text_provider", "qwen")
    keywords  = json.loads(product.keywords or "[]")

    if body.post_text_override is not None:
        result = {
            "text": body.post_text_override.strip(),
            "hashtags": body.hashtags_override or body.hashtags or [],
        }
        log.info("Черновик создан из общего текста product_id=%d platform=%s", body.product_id, body.platform)
    else:
        log.info("Генерация поста product_id=%d platform=%s provider=%s", body.product_id, body.platform, provider)
        try:
            result = await generate_post_text(
                provider_name=provider,
                platform=body.platform,
                product_name="",
                category=product.category or "",
                short_description=product.short_description or "",
                long_description=product.long_description   or "",
                keywords=keywords,
                tone=tone,
                post_size=post_size,
                use_emoji=body.use_emoji if body.use_emoji is not None else True,
                extra_requirements=product.extra_requirements or "",
                extra_hashtags=body.hashtags,
            )
        except Exception as e:
            log.error("Ошибка генерации поста product_id=%d provider=%s: %s", body.product_id, provider, e, exc_info=True)
            raise HTTPException(502, f"Ошибка провайдера ИИ ({provider}): {str(e)}")

    # Сохраняем черновик
    now  = datetime.datetime.now(timezone.utc)
    post = SocialPost(
        product_id=body.product_id,
        platform=body.platform,
        post_text=result["text"],
        post_size=post_size,
        tone=tone,
        hashtags=json.dumps(result["hashtags"], ensure_ascii=False),
        use_emoji=body.use_emoji if body.use_emoji is not None else True,
        status="draft",
        created_at=now,
    )
    session.add(post)
    increment_setting_counter("generation_count_posts", session=session)
    session.commit()
    session.refresh(post)

    return _post_to_dict(post)


# ── POST /api/social/publish ─────────────────────────────────────────────────

class PublishRequest(BaseModel):
    post_id:        int
    use_images:     Optional[bool] = True   # прикрепить изображения продукта
    vk_use_images:  Optional[bool] = True   # для VK можно отключить загрузку картинок
    selected_image_ids: Optional[List[int]] = None
    primary_image_id: Optional[int] = None


@router.post("/publish")
async def publish_post(
    body: PublishRequest,
    session: Session = Depends(get_session),
):
    post = session.get(SocialPost, body.post_id)
    if not post:
        raise HTTPException(404, f"Пост {body.post_id} не найден")
    if post.status == "published":
        raise HTTPException(400, "Пост уже опубликован")
    if post.platform not in PUBLISHERS:
        raise HTTPException(400, f"Неизвестная платформа: {post.platform}")

    # Собираем пути изображений продукта
    image_paths: list[str] = []
    if body.use_images:
        images = session.exec(
            select(GeneratedImage)
            .where(GeneratedImage.product_id == post.product_id)
            .order_by(GeneratedImage.sort_order)
        ).all()
        if body.selected_image_ids:
            selected_ids = set(body.selected_image_ids)
            images = [img for img in images if img.id in selected_ids]

        if body.primary_image_id is not None:
            primary = next((img for img in images if img.id == body.primary_image_id), None)
            if primary is not None:
                others = [img for img in images if img.id != body.primary_image_id]
                images = [primary, *others]

        if post.platform == "vk" and body.vk_use_images and images:
            images = images[:1]

        image_paths = [img.image_path for img in images if img.image_path]

    # Формируем полный текст (пост + хэштеги)
    hashtags = json.loads(post.hashtags or "[]")
    full_text = _adapt_post_text_for_platform(post.platform, post.post_text)
    if hashtags:
        full_text += "\n\n" + " ".join(hashtags)

    log.info(
        "Публикация поста id=%d platform=%s images=%d vk_use_images=%s selected=%s primary=%s",
        body.post_id,
        post.platform,
        len(image_paths),
        body.vk_use_images,
        body.selected_image_ids,
        body.primary_image_id,
    )
    try:
        publish_fn = PUBLISHERS[post.platform]
        if post.platform == "vk":
            post_url = await publish_fn(
                full_text,
                image_paths or None,
                include_images=bool(body.vk_use_images),
            )
        else:
            post_url = await publish_fn(full_text, image_paths or None)
    except Exception as e:
        log.error("Ошибка публикации post_id=%d platform=%s: %s", body.post_id, post.platform, e, exc_info=True)
        raise HTTPException(502, f"Ошибка публикации в {post.platform}: {str(e)}")

    now           = datetime.datetime.now(timezone.utc)
    post.status   = "published"
    post.published_at = now
    session.add(post)
    session.commit()
    session.refresh(post)

    log.info("Пост опубликован id=%d url=%s", body.post_id, post_url)
    return {**_post_to_dict(post), "post_url": post_url}


# ── PUT /api/social/posts/{id} ───────────────────────────────────────────────

class UpdatePostRequest(BaseModel):
    post_text: Optional[str]       = None
    hashtags:  Optional[List[str]] = None


@router.put("/posts/{post_id}")
def update_post(
    post_id: int,
    body: UpdatePostRequest,
    session: Session = Depends(get_session),
):
    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(404, f"Пост {post_id} не найден")
    if post.status == "published":
        raise HTTPException(400, "Нельзя редактировать опубликованный пост")

    if body.post_text is not None:
        post.post_text = body.post_text
    if body.hashtags is not None:
        post.hashtags = json.dumps(body.hashtags, ensure_ascii=False)

    session.add(post)
    session.commit()
    session.refresh(post)
    return _post_to_dict(post)


# ── GET /api/social/posts/{product_id} ───────────────────────────────────────

@router.get("/posts/{product_id}")
def get_posts(product_id: int, session: Session = Depends(get_session)):
    if not session.get(Product, product_id):
        raise HTTPException(404, f"Продукт {product_id} не найден")
    posts = session.exec(
        select(SocialPost)
        .where(SocialPost.product_id == product_id)
        .order_by(SocialPost.created_at.desc())
    ).all()
    return {"posts": [_post_to_dict(p) for p in posts]}
