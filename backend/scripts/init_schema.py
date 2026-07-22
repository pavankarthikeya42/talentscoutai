"""Apply supabase_schema.sql to the database."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))



import asyncio
from pathlib import Path

from app.database import get_db_pool, close_db_pool

SCHEMA_FILE = Path(__file__).resolve().parents[2] / "supabase_schema.sql"
STATEMENT_DELIMITER = "-- @@@"


def _load_statements() -> list[str]:
    if not SCHEMA_FILE.exists():
        raise FileNotFoundError(f"Schema file not found: {SCHEMA_FILE}")

    raw = SCHEMA_FILE.read_text(encoding="utf-8")
    statements: list[str] = []
    for block in raw.split(STATEMENT_DELIMITER):
        lines = [
            line for line in block.splitlines()
            if line.strip() and not line.strip().startswith("--")
        ]
        sql = "\n".join(lines).strip()
        if sql:
            statements.append(sql)
    return statements


async def run_schema(conn=None) -> None:
    statements = _load_statements()
    if conn is not None:
        for i, sql in enumerate(statements, 1):
            try:
                await conn.execute(sql)
            except Exception as exc:
                raise RuntimeError(f"Schema statement {i}/{len(statements)} failed: {exc}") from exc
        return

    pool = await get_db_pool()
    async with pool.acquire() as acquired:
        await run_schema(acquired)


async def main() -> None:
    print(f"Applying schema from {SCHEMA_FILE}...")
    statements = _load_statements()
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        for i, sql in enumerate(statements, 1):
            preview = sql.splitlines()[0][:80]
            print(f"  [{i}/{len(statements)}] {preview}...")
            await conn.execute(sql)
    await close_db_pool()
    print("[OK] Database schema applied successfully.")


if __name__ == "__main__":
    asyncio.run(main())
