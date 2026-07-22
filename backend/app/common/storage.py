from app.database import supabase_admin
from app.common.exceptions import BadRequestError

RESUME_BUCKET = "resumes"


def upload_file(file_bytes: bytes, file_path: str, content_type: str = "application/pdf") -> str:
    """
    Upload a file to Supabase Storage.
    Returns the file path in the bucket.
    """
    try:
        supabase_admin.storage.from_(RESUME_BUCKET).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": content_type},
        )
        return file_path
    except Exception as e:
        raise BadRequestError(f"File upload failed: {str(e)}")


def get_file_url(file_path: str, expires_in: int = 3600) -> str:
    """Generate a signed URL for a file in storage."""
    try:
        response = supabase_admin.storage.from_(RESUME_BUCKET).create_signed_url(
            path=file_path,
            expires_in=expires_in,
        )
        return response["signedURL"]
    except Exception as e:
        raise BadRequestError(f"Failed to generate file URL: {str(e)}")


def delete_file(file_path: str) -> bool:
    """Delete a file from storage."""
    try:
        supabase_admin.storage.from_(RESUME_BUCKET).remove([file_path])
        return True
    except Exception as e:
        raise BadRequestError(f"File deletion failed: {str(e)}")


def download_file(file_path: str) -> bytes:
    """Download a file from storage."""
    try:
        response = supabase_admin.storage.from_(RESUME_BUCKET).download(file_path)
        return response
    except Exception as e:
        raise BadRequestError(f"File download failed: {str(e)}")
