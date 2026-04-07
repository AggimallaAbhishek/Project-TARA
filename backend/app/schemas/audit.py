from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    analysis_id: int | None
    action: str
    event_metadata: dict[str, Any] | None
    created_at: datetime

    class Config:
        from_attributes = True
