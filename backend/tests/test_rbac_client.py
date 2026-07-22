import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sys
from unittest.mock import MagicMock

# Mock Gemini API calls BEFORE importing app
import app.common.gemini as gemini
gemini.generate_embedding = MagicMock(return_value=[0.0] * 768)
gemini.generate_text = MagicMock(return_value="mocked text")
gemini.generate_json = MagicMock(return_value="[]")

from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.auth.schemas import UserProfile

# Global role mock for testing
current_test_role = "HR"

async def mock_get_current_user():
    return UserProfile(
        id="test-user-id",
        full_name="Test User",
        email="test@example.com",
        role=current_test_role,
        avatar_url=None,
        display_name="testuser",
        created_at="2026-06-09T00:00:00Z",
        updated_at="2026-06-09T00:00:00Z"
    )

# Mock get_db to return a mock connection and avoid db pool/connection usage
async def mock_get_db():
    mock_conn = MagicMock()
    async def mock_execute(*args, **kwargs):
        return "SELECT 1"
    async def mock_fetch(*args, **kwargs):
        return []
    async def mock_fetchrow(*args, **kwargs):
        return None
    mock_conn.execute = mock_execute
    mock_conn.fetch = mock_fetch
    mock_conn.fetchrow = mock_fetchrow
    yield mock_conn

# Override both auth and database dependencies
app.dependency_overrides[get_current_user] = mock_get_current_user
app.dependency_overrides[get_db] = mock_get_db

client = TestClient(app)

# Test cases: (method, url, payload, allowed_roles)
tests = [
    # Jobs Management (Restricted strictly to Manager)
    ("POST", "/api/jobs/", {}, ["Manager"]),
    ("PUT", "/api/jobs/123", {}, ["Manager"]),
    ("DELETE", "/api/jobs/123", None, ["Manager"]),
    
    # Interview Management - Scheduler (Restricted strictly to HR)
    ("POST", "/api/interviews/", {}, ["HR"]),
    ("PUT", "/api/interviews/123", {}, ["HR"]),
    ("DELETE", "/api/interviews/123", None, ["HR"]),
    
    # Interview Feedback (Restricted strictly to Manager)
    ("POST", "/api/interviews/123/feedback", {}, ["Manager"]),
    
    # Screening Automated Email (Restricted strictly to HR)
    ("POST", "/api/screening/applications/123/send-email", None, ["HR"]),
    
    # Screening and Candidate Control (Restricted strictly to HR)
    ("POST", "/api/screening/jobs/123/screen", {}, ["HR"]),
    ("POST", "/api/screening/screen-candidate", {"job_id": "123", "candidate_id": "456"}, ["HR"]),
    ("PATCH", "/api/screening/applications/123/status", {"status": "shortlisted"}, ["HR"]),
    
    # RAG Chatbot (Restricted strictly to HR, blocked for Manager)
    ("POST", "/api/rag/chat", {"message": "Find python developers"}, ["HR"]),
    ("GET", "/api/rag/sessions", None, ["HR"]),
]

failed = False

print("=" * 75)
print("RUNNING STRICT 2-ROLE (MANAGER / HR) ACCESS CONTROL ROUTE SECURITY TESTS")
print("=" * 75)

for method, url, json_data, allowed_roles in tests:
    # Test across old and new roles to ensure strict blocking of unauthorized roles
    for role in ["Manager", "HR", "recruiter", "admin"]:
        current_test_role = role
        
        response = None
        try:
            if method == "POST":
                response = client.post(url, json=json_data, headers={"Authorization": "Bearer mock-token"})
            elif method == "PUT":
                response = client.put(url, json=json_data, headers={"Authorization": "Bearer mock-token"})
            elif method == "PATCH":
                response = client.patch(url, json=json_data, headers={"Authorization": "Bearer mock-token"})
            elif method == "DELETE":
                response = client.delete(url, headers={"Authorization": "Bearer mock-token"})
            elif method == "GET":
                response = client.get(url, headers={"Authorization": "Bearer mock-token"})
            
            status_code = response.status_code if response is not None else 500
        except Exception as e:
            # Route handler execution failure after passing dependencies counts as "Allowed" (not 403)
            status_code = 500
            
        is_forbidden = status_code == 403
        should_be_forbidden = role not in allowed_roles
        
        if is_forbidden != should_be_forbidden:
            print(f"[FAIL] Role '{role}': {method} {url} - Status: {status_code} (Expected Forbidden: {should_be_forbidden}, Got: {is_forbidden})")
            failed = True
        else:
            status_desc = "403 Forbidden" if is_forbidden else f"{status_code} (Allowed)"
            print(f"[PASS] Role '{role}': {method} {url} -> {status_desc}")

print("=" * 75)
if failed:
    print("STRICT 2-ROLE RBAC ROUTE SECURITY TESTS FAILED")
    sys.exit(1)
else:
    print("ALL STRICT 2-ROLE RBAC ROUTE SECURITY TESTS PASSED SUCCESSFULLY!")
    sys.exit(0)
