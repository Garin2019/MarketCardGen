import datetime
from datetime import timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlmodel import Session, select
from models import PromptTemplate
from database import get_session
from services.ai.provider_factory import get_text_provider
from utils.db_helpers import get_setting
from logger import get_logger

log = get_logger("templates")

router = APIRouter(prefix="/api/templates", tags=["templates"])


def _template_to_dict(t: PromptTemplate) -> dict:
    return {
        "id":          t.id,
        "name":        t.name,
        "description": t.description,
        "prompt_text": t.prompt_text,
        "is_default":  t.is_default,
        "created_at":  t.created_at.isoformat(),
        "updated_at":  t.updated_at.isoformat(),
    }


@router.get("")
def list_templates(session: Session = Depends(get_session)):
    templates = session.exec(
        select(PromptTemplate).order_by(
            PromptTemplate.is_default.desc(),
            PromptTemplate.name,
        )
    ).all()
    return {"templates": [_template_to_dict(t) for t in templates]}


class CreateTemplateRequest(BaseModel):
    name:        str
    description: Optional[str] = ""
    prompt_text: str


@router.post("", status_code=201)
def create_template(
    body: CreateTemplateRequest,
    session: Session = Depends(get_session),
):
    if not body.name.strip():
        raise HTTPException(400, "Название шаблона не может быть пустым")
    if not body.prompt_text.strip():
        raise HTTPException(400, "Текст промта не может быть пустым")

    now = datetime.datetime.now(timezone.utc)
    template = PromptTemplate(
        name=body.name.strip(),
        description=body.description or "",
        prompt_text=body.prompt_text.strip(),
        is_default=False,
        created_at=now,
        updated_at=now,
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    log.info("Создан шаблон id=%d name='%s'", template.id, template.name)
    return _template_to_dict(template)


class UpdateTemplateRequest(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    prompt_text: Optional[str] = None


@router.put("/{template_id}")
def update_template(
    template_id: int,
    body: UpdateTemplateRequest,
    session: Session = Depends(get_session),
):
    template = session.get(PromptTemplate, template_id)
    if not template:
        raise HTTPException(404, f"Шаблон {template_id} не найден")

    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(400, "Название шаблона не может быть пустым")
        template.name = body.name.strip()

    if body.description is not None:
        template.description = body.description

    if body.prompt_text is not None:
        if not body.prompt_text.strip():
            raise HTTPException(400, "Текст промта не может быть пустым")
        template.prompt_text = body.prompt_text.strip()

    template.updated_at = datetime.datetime.now(timezone.utc)
    session.add(template)
    session.commit()
    session.refresh(template)
    return _template_to_dict(template)


class ImproveTemplatePromptRequest(BaseModel):
    name:        Optional[str] = ""
    description: Optional[str] = ""
    prompt_text: str


@router.post("/improve-prompt")
async def improve_template_prompt(body: ImproveTemplatePromptRequest):
    source_prompt = (body.prompt_text or "").strip()
    if not source_prompt:
        raise HTTPException(400, "Сначала заполните текст промта")

    provider_name = get_setting("default_text_provider", "qwen")

    system_prompt = (
        "Ты улучшаешь промты для генерации товарных изображений. "
        "Сделай промт более точным, полезным и коммерчески сильным, но не чрезмерно длинным. "
        "Сохрани исходную задачу пользователя. "
        "Добавь ясность по композиции, свету, фону, ракурсу и ограничениям только если это уместно. "
        "Не добавляй противоречивые детали и не выдумывай характеристики товара, которых нет в исходном тексте. "
        "Не используй длинное тире — используй только обычный дефис. "
        "Верни только готовый улучшенный промт без комментариев, markdown и пояснений."
    )
    user_prompt = (
        f"Название шаблона: {body.name or 'не указано'}\n"
        f"Описание шаблона: {body.description or 'не указано'}\n"
        f"Исходный промт:\n{source_prompt}\n\n"
        "Улучши этот промт для генерации изображения товара. "
        "Ответ должен быть одним готовым промтом длиной не более 150 слов."
    )

    try:
        provider = get_text_provider(provider_name)
        improved_prompt = await provider.generate_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=400,
        )
    except Exception as exc:
        log.error("Ошибка улучшения промта provider=%s: %s", provider_name, exc, exc_info=True)
        raise HTTPException(502, f"Не удалось улучшить промт через провайдера {provider_name}: {str(exc)}")

    cleaned_prompt = improved_prompt.strip().strip("`").strip()
    if not cleaned_prompt:
        raise HTTPException(502, "ИИ вернул пустой результат при улучшении промта")

    return {
        "prompt_text": cleaned_prompt,
        "provider": provider_name,
    }


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    session: Session = Depends(get_session),
):
    template = session.get(PromptTemplate, template_id)
    if not template:
        raise HTTPException(404, f"Шаблон {template_id} не найден")
    if template.is_default:
        raise HTTPException(403, "Системные шаблоны нельзя удалять")
    session.delete(template)
    session.commit()
    log.info("Удалён шаблон id=%d", template_id)
