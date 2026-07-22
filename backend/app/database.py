import asyncpg
from supabase import create_client, Client, ClientOptions

from app.config import get_settings

settings = get_settings()

# ── Supabase client (for auth & storage) ──
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_anon_key,
)

# Service-role client (bypasses RLS — use only in server-side operations)
supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
    options=ClientOptions(auto_refresh_token=False, persist_session=False),
)

# ── Async connection pool (for direct SQL queries with pgvector) ──
_pool: asyncpg.Pool | None = None


async def get_db_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=settings.supabase_db_url,
            min_size=5,
            max_size=20,
            command_timeout=30,
            ssl='require',
            statement_cache_size=0,
        )
    return _pool


async def close_db_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def get_db():
    """Dependency that yields an asyncpg connection from the pool."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        yield conn