from typing import Optional, Dict
from pydantic import BaseModel, Field, field_validator
from backend.app.config import Config

ALLOWED_PERSONAS = {'executive', 'peer', 'legal', 'casual'}

class WritingAttributes(BaseModel):
    formality: int = Field(default=3, ge=1, le=5)
    conciseness: int = Field(default=3, ge=1, le=5)
    friendliness: int = Field(default=3, ge=1, le=5)
    energy: int = Field(default=3, ge=1, le=5)
    persuasiveness: int = Field(default=3, ge=1, le=5)
    technical_depth: int = Field(default=3, ge=1, le=5)

class RewriteRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=Config.MAX_INPUT_CHARS)
    persona: str = Field(..., description="Target persona: executive, peer, legal, casual")
    attributes: Optional[WritingAttributes] = Field(default_factory=WritingAttributes)
    target_language: Optional[str] = Field(default='en', description="Target language code (e.g. 'en', 'es', 'fr', 'de', 'hi')")
    enable_regeneration: bool = Field(default=True)
    save_to_history: bool = Field(default=True)

    @field_validator('persona')
    @classmethod
    def validate_persona(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in ALLOWED_PERSONAS:
            raise ValueError(f"Invalid persona '{v}'. Must be one of: {', '.join(sorted(ALLOWED_PERSONAS))}")
        return clean

    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Input text cannot be empty or whitespace only.")
        return clean

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=Config.MAX_INPUT_CHARS)

    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Input text cannot be empty or whitespace only.")
        return clean

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    target_lang: str = Field(default='es')
    source_lang: Optional[str] = Field(default='auto')

