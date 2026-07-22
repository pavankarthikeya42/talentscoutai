from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware


from app.config import get_settings
from app.database import get_db_pool, close_db_pool
from app.auth.router import router as auth_router
from app.jobs.router import router as jobs_router
from app.resumes.router import router as resumes_router
from app.candidates.router import router as candidates_router
from app.screening.router import router as screening_router
from app.interviews.router import router as interviews_router
from app.rag.router import router as rag_router
from app.analytics.router import router as analytics_router
from app.portal.router import router as portal_router
from app.notifications.router import router as notifications_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await get_db_pool()
    print("[OK] Database pool initialized")
    
    # Run startup migration to ensure jobs table has LinkedIn and Naukri integration columns
    async with pool.acquire() as conn:
        print("[MIGRATION] Checking for external job board columns...")
        await conn.execute("""
            ALTER TABLE public.jobs 
            ADD COLUMN IF NOT EXISTS posted_to_linkedin BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS posted_to_naukri BOOLEAN NOT NULL DEFAULT FALSE;
        """)
        print("[MIGRATION] External job board columns checked successfully.")
        
    yield
    await close_db_pool()
    print("[INFO] Database pool closed")


app = FastAPI(
    title="TalentScout AI",
    description="AI-powered recruitment platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    if request.url.path in ["/docs", "/openapi.json"]:
        return await call_next(request)
    response = await call_next(request)
    # Prevent browsers from MIME-sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    # Prevent XSS attacks in older browsers
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Content Security Policy (CSP) to mitigate XSS
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self' *; "
        "frame-ancestors 'none';"
    )
    return response

# ── Routers ──
app.include_router(auth_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(resumes_router, prefix="/api")
app.include_router(candidates_router, prefix="/api")
app.include_router(screening_router, prefix="/api")
app.include_router(interviews_router, prefix="/api")
app.include_router(rag_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(portal_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "TalentScout AI",
        "version": "1.0.0",
    }
# trigger reload

