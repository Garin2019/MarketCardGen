from __future__ import annotations
import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


# ── Products ──────────────────────────────────────────────────────────────────

class Product(SQLModel, table=True):
    __tablename__ = "products"

    id:                      Optional[int] = Field(default=None, primary_key=True)
    photo_path:              Optional[str] = Field(default=None)
    reference_path:          Optional[str] = Field(default=None)
    article:                 Optional[str] = Field(default=None)
    marketplace:             str           = Field(default="catalog")  # legacy DB column, not used in app logic
    category:                Optional[str] = Field(default=None)
    tone:                    str           = Field(default="expert")
    target_audience:         str           = Field(default="Широкая аудитория")
    keywords:                str           = Field(default="[]")       # JSON list
    extra_requirements:      Optional[str] = Field(default=None)
    short_description:       Optional[str] = Field(default=None)
    long_description:        Optional[str] = Field(default=None)
    short_description_limit: int           = Field(default=255)
    long_description_limit:  int           = Field(default=5000)
    created_at:              datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    updated_at:              datetime.datetime = Field(default_factory=datetime.datetime.utcnow)


# ── Prompt Templates ──────────────────────────────────────────────────────────

class PromptTemplate(SQLModel, table=True):
    __tablename__ = "prompt_templates"

    id:          Optional[int] = Field(default=None, primary_key=True)
    name:        str           = Field()
    description: str           = Field(default="")
    prompt_text: str           = Field()
    is_default:  bool          = Field(default=False)
    created_at:  datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    updated_at:  datetime.datetime = Field(default_factory=datetime.datetime.utcnow)


# ── Generated Images ──────────────────────────────────────────────────────────

class GeneratedImage(SQLModel, table=True):
    __tablename__ = "generated_images"

    id:          Optional[int] = Field(default=None, primary_key=True)
    product_id:  int           = Field(foreign_key="products.id")
    image_path:  str           = Field()
    prompt:      str           = Field(default="")
    template_id: Optional[int] = Field(default=None, foreign_key="prompt_templates.id")
    sort_order:  int           = Field(default=0)
    created_at:  datetime.datetime = Field(default_factory=datetime.datetime.utcnow)


# ── App Settings ──────────────────────────────────────────────────────────────

class AppSetting(SQLModel, table=True):
    __tablename__ = "app_settings"

    id:         Optional[int] = Field(default=None, primary_key=True)
    key:        str           = Field(unique=True)
    value:      str           = Field(default="")
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)


# ── Social Posts ──────────────────────────────────────────────────────────────

class SocialPost(SQLModel, table=True):
    __tablename__ = "social_posts"

    id:           Optional[int] = Field(default=None, primary_key=True)
    product_id:   int           = Field(foreign_key="products.id")
    platform:     str           = Field()               # vk | telegram | max
    post_text:    str           = Field(default="")
    post_size:    int           = Field(default=600)
    tone:         str           = Field(default="friendly")
    hashtags:     str           = Field(default="[]")   # JSON list
    use_emoji:    bool          = Field(default=True)
    status:       str           = Field(default="draft")
    published_at: Optional[datetime.datetime] = Field(default=None)
    scheduled_at: Optional[datetime.datetime] = Field(default=None)
    created_at:   datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
