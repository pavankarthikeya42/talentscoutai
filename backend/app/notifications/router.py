from fastapi import APIRouter, Depends, HTTPException, status
from asyncpg import Connection
import uuid

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.schemas import UserProfile
from app.notifications.schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=list[NotificationResponse])
async def get_notifications(
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Get all unread notifications for the current user."""
    rows = await conn.fetch(
        """
        SELECT id, user_id, title, message, action_url, read, created_at
        FROM notifications
        WHERE user_id = $1 AND read = FALSE
        ORDER BY created_at DESC
        """,
        uuid.UUID(current_user.id)
    )
    return [dict(r) for r in rows]


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Mark a notification as read."""
    await conn.execute(
        "UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2",
        uuid.UUID(notification_id),
        uuid.UUID(current_user.id)
    )
    return {"message": "Notification marked as read"}


@router.post("/broadcast")
async def broadcast_notification(
    data: dict,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Broadcast a notification to specific user roles or all users."""
    role_check = (current_user.role or "").replace("_", "").replace(" ", "").lower()
    if role_check != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can broadcast system notifications"
        )

    title = data.get("title", "System Announcement")
    message = data.get("message", "")
    target_role = data.get("target_role", "All")  # All, Manager, HR

    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification message is required"
        )

    # Resolve target query
    # Exclude the sender (superadmin) from receiving their own broadcast
    sender_id = uuid.UUID(current_user.id)
    if target_role == "All":
        query = "SELECT id FROM profiles WHERE id != $1"
        users = await conn.fetch(query, sender_id)
    else:
        # Standardize matching to database role casing ('Manager', 'HR')
        db_role = "Manager" if target_role.lower() == "manager" else "HR"
        query = "SELECT id FROM profiles WHERE role = $2 AND id != $1"
        users = await conn.fetch(query, sender_id, db_role)

    # Insert notifications in bulk
    for u in users:
        await conn.execute(
            """
            INSERT INTO notifications (user_id, title, message)
            VALUES ($1, $2, $3)
            """,
            u["id"],
            title,
            message
        )

    return {"message": f"Successfully broadcasted to {len(users)} users"}

