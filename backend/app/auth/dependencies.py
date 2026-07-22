from fastapi import Depends, Header
from app.database import supabase_admin
from app.auth.schemas import UserProfile
from app.common.exceptions import UnauthorizedError, ForbiddenError


async def get_current_user(authorization: str = Header(...)) -> UserProfile:
    """
    Extract and validate the Supabase JWT from the Authorization header.
    Returns the authenticated user's profile.
    """
    try:
        # Strip "Bearer " prefix
        token = authorization
        if token.lower().startswith("bearer "):
            token = token[7:]

        # Verify token with Supabase
        user_response = supabase_admin.auth.get_user(token)
        if not user_response or not user_response.user:
            raise UnauthorizedError("Invalid or expired token")

        supabase_user = user_response.user

        # Fetch profile from DB
        profile_response = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("id", str(supabase_user.id))
            .single()
            .execute()
        )

        if not profile_response.data:
            raise UnauthorizedError("User profile not found")

        profile = profile_response.data

        return UserProfile(
            id=profile["id"],
            full_name=profile["full_name"],
            email=profile["email"],
            role=profile["role"],
            avatar_url=profile.get("avatar_url"),
            display_name=profile.get("display_name"),
            created_at=profile.get("created_at"),
            updated_at=profile.get("updated_at"),
        )

    except UnauthorizedError:
        raise
    except Exception as e:
        raise UnauthorizedError(f"Authentication failed: {str(e)}")


async def require_admin(
    current_user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """Dependency that ensures the user has admin role."""
    if current_user.role != "admin":
        raise ForbiddenError("Admin access required")
    return current_user


async def require_manager(
    current_user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """Dependency that ensures the user has Manager role."""
    if current_user.role not in ["Manager", "manager"]:
        raise ForbiddenError("Manager access required")
    return current_user


async def require_hr(
    current_user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """Dependency that ensures the user has HR role."""
    if current_user.role not in ["HR", "hr"]:
        raise ForbiddenError("HR access required")
    return current_user


async def require_super_admin(
    current_user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """Dependency that ensures the user has SuperAdmin role."""
    if current_user.role not in ["SuperAdmin", "super_admin"]:
        raise ForbiddenError("Super Admin access required")
    return current_user
