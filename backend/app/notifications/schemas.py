from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: str
    action_url: Optional[str] = None
    read: bool
    created_at: datetime
