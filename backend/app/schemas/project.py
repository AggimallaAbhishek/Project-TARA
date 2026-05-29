from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.analysis import AnalysisSummary


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name", "description")
    @classmethod
    def trim_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if info.field_name == "name" and not cleaned:
            raise ValueError("name cannot be blank")
        return cleaned or None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name", "description")
    @classmethod
    def trim_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if info.field_name == "name" and not cleaned:
            raise ValueError("name cannot be blank")
        return cleaned or None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    analysis_count: int = 0
    latest_analysis_id: int | None = None
    latest_analysis_title: str | None = None
    latest_analysis_at: datetime | None = None
    latest_risk_score: float | None = None
    total_threat_count: int = 0
    high_risk_count: int = 0


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    skip: int
    limit: int
    has_more: bool


class ProjectActivityResponse(BaseModel):
    id: int
    user_id: int
    project_id: int | None
    analysis_id: int | None
    action: str
    event_metadata: dict[str, Any] | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectAnalysesResponse(BaseModel):
    items: list[AnalysisSummary]
    total: int
    skip: int
    limit: int
    has_more: bool
