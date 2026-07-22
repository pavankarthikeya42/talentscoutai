from fastapi import APIRouter, Depends, Query
from app.database import supabase, supabase_admin
from app.auth.schemas import (
    SignInRequest,
    UpdateProfileRequest,
    RefreshTokenRequest,
    AuthResponse,
    UserProfile,
    MessageResponse,
    SignUpRequest,
)
from app.auth.dependencies import get_current_user, require_super_admin
from app.common.exceptions import BadRequestError, UnauthorizedError

router = APIRouter(prefix="/auth", tags=["Authentication"])




@router.post("/signin", response_model=AuthResponse)
async def sign_in(request: SignInRequest):
    """Authenticate an existing user."""
    try:
        response = supabase.auth.sign_in_with_password(
            {
                "email": request.email,
                "password": request.password,
            }
        )

        if not response.user:
            raise UnauthorizedError("Invalid credentials")

        # Ensure profile exists (preserve role if already present)
        profile_check = (
            supabase_admin.table("profiles")
            .select("role")
            .eq("id", str(response.user.id))
            .execute()
        )


        if not profile_check.data:
            # No profile = not provisioned in the system. Reject.
            raise UnauthorizedError("Account not provisioned. Contact your administrator.")
        else:
            # Only update non-role fields to preserve the assigned role
            existing_full_name = profile_check.data[0].get("full_name", "")
            new_full_name = response.user.user_metadata.get("full_name", "") or existing_full_name
            supabase_admin.table("profiles").update(
                {
                    "full_name": new_full_name,
                    "email": response.user.email,
                }
            ).eq("id", str(response.user.id)).execute()

        # Fetch profile
        profile_resp = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("id", str(response.user.id))
            .single()
            .execute()
        )

        profile = profile_resp.data

        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user=UserProfile(
                id=profile["id"],
                full_name=profile["full_name"],
                email=profile["email"],
                role=profile["role"],
                avatar_url=profile.get("avatar_url"),
                display_name=profile.get("display_name"),
                created_at=profile.get("created_at"),
                updated_at=profile.get("updated_at"),
            ),
        )

    except UnauthorizedError:
        raise
    except Exception as e:
        raise UnauthorizedError(f"Sign in failed: {str(e)}")


@router.post("/signout", response_model=MessageResponse)
async def sign_out(current_user: UserProfile = Depends(get_current_user)):
    """Sign out the current user."""
    try:
        supabase.auth.sign_out()
        return MessageResponse(message="Signed out successfully")
    except Exception as e:
        raise BadRequestError(f"Sign out failed: {str(e)}")


@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: UserProfile = Depends(get_current_user)):
    """Get the current user's profile."""
    return current_user


@router.put("/me", response_model=UserProfile)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """Update the current user's profile."""
    try:
        update_data = request.model_dump(exclude_none=True)
        if not update_data:
            raise BadRequestError("No fields to update")

        # If password is provided, update it in Supabase Auth
        if request.password:
            if len(request.password) < 6:
                raise BadRequestError("Password must be at least 6 characters long")
            from supabase_auth.types import AdminUserAttributes
            supabase_admin.auth.admin.update_user_by_id(
                current_user.id,
                AdminUserAttributes(password=request.password)
            )

        # Remove password from database update payload
        update_data.pop("password", None)
        update_data.pop("role", None)

        if update_data:
            response = (
                supabase_admin.table("profiles")
                .update(update_data)
                .eq("id", current_user.id)
                .execute()
            )

            if not response.data:
                raise BadRequestError("Profile update failed")

            profile = response.data[0]
        else:
            # If only password was updated, fetch existing profile
            response = (
                supabase_admin.table("profiles")
                .select("*")
                .eq("id", current_user.id)
                .single()
                .execute()
            )
            profile = response.data

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

    except BadRequestError:
        raise
    except Exception as e:
        raise BadRequestError(f"Profile update failed: {str(e)}")


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh the access token using a refresh token."""
    try:
        response = supabase.auth.refresh_session(request.refresh_token)

        if not response.user or not response.session:
            raise UnauthorizedError("Token refresh failed")

        profile_resp = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("id", str(response.user.id))
            .single()
            .execute()
        )

        profile = profile_resp.data

        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user=UserProfile(
                id=profile["id"],
                full_name=profile["full_name"],
                email=profile["email"],
                role=profile["role"],
                avatar_url=profile.get("avatar_url"),
                display_name=profile.get("display_name"),
                created_at=profile.get("created_at"),
                updated_at=profile.get("updated_at"),
            ),
        )

    except UnauthorizedError:
        raise
    except Exception as e:
        raise UnauthorizedError(f"Token refresh failed: {str(e)}")


@router.get("/managers", response_model=list[UserProfile])
async def list_managers(current_user: UserProfile = Depends(get_current_user)):
    """List all users with the Manager role."""
    try:
        response = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("role", "Manager")
            .execute()
        )
        
        return [
            UserProfile(
                id=profile["id"],
                full_name=profile["full_name"],
                email=profile["email"],
                role=profile["role"],
                avatar_url=profile.get("avatar_url"),
                display_name=profile.get("display_name"),
                created_at=profile.get("created_at"),
                updated_at=profile.get("updated_at"),
            )
            for profile in response.data
        ]
    except Exception as e:
        raise BadRequestError(f"Failed to fetch managers: {str(e)}")


@router.post("/create-recruiter", response_model=UserProfile)
async def create_recruiter(
    request: SignUpRequest,
    role: str = Query(..., description="Role of the new recruiter (Manager or HR)"),
    current_user: UserProfile = Depends(require_super_admin),
):
    """
    Create a new recruiter (Manager or HR) by the Super Admin.
    """
    if role not in ["Manager", "HR"]:
        raise BadRequestError("Role must be 'Manager' or 'HR'")
    
    try:
        # Create user in Supabase auth
        response = supabase_admin.auth.admin.create_user({
            "email": request.email,
            "password": request.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": request.full_name,
            }
        })
        
        if not response or not response.user:
            raise BadRequestError("Failed to create user in auth system")
            
        user_id = str(response.user.id)
        
        # Upsert profile with correct role (handles trigger race condition)
        supabase_admin.table("profiles").upsert({
            "id": user_id,
            "full_name": request.full_name,
            "email": request.email,
            "role": role
        }).execute()
        
        # Fetch the created profile
        profile_resp = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        
        profile = profile_resp.data
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
        
    except Exception as e:
        raise BadRequestError(f"Failed to create recruiter: {str(e)}")


@router.get("/recruiters", response_model=list[UserProfile])
async def list_recruiters(current_user: UserProfile = Depends(require_super_admin)):
    """List all recruiters (Managers and HRs) for Super Admin."""
    try:
        response = (
            supabase_admin.table("profiles")
            .select("*")
            .in_("role", ["Manager", "HR"])
            .execute()
        )
        return [
            UserProfile(
                id=profile["id"],
                full_name=profile["full_name"],
                email=profile["email"],
                role=profile["role"],
                avatar_url=profile.get("avatar_url"),
                display_name=profile.get("display_name"),
                created_at=profile.get("created_at"),
                updated_at=profile.get("updated_at"),
            )
            for profile in response.data
        ]
    except Exception as e:
        raise BadRequestError(f"Failed to fetch recruiters: {str(e)}")


@router.delete("/recruiters/{user_id}", response_model=MessageResponse)
async def delete_recruiter(user_id: str, current_user: UserProfile = Depends(require_super_admin)):
    """Delete a recruiter account by Super Admin."""
    try:
        # Prevent deleting oneself
        if user_id == current_user.id:
            raise BadRequestError("Cannot delete your own account")

        # Optionally check if user is actually a recruiter before deleting
        profile_resp = (
            supabase_admin.table("profiles")
            .select("role")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not profile_resp.data or profile_resp.data["role"] not in ["Manager", "HR"]:
            raise BadRequestError("Cannot delete this user. They might be a Super Admin or not exist.")

        # Delete from Supabase Auth (this should cascade to public.profiles if configured,
        # but to be safe we can also delete from profiles explicitly if needed.
        # Actually, let's delete from profiles first to be safe, then auth)
        supabase_admin.table("profiles").delete().eq("id", user_id).execute()
        
        # Delete from Auth
        response = supabase_admin.auth.admin.delete_user(user_id)
        
        return MessageResponse(message="Recruiter deleted successfully")
    except BadRequestError:
        raise
    except Exception as e:
        raise BadRequestError(f"Failed to delete recruiter: {str(e)}")
