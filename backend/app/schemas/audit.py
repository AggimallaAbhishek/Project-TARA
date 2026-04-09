from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    analysis_id: int | None
    action: str
    event_metadata: dict[str, Any] | None
    created_at: datetime
