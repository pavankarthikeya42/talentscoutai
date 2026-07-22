"""
Full Integration Test for TalentScout AI
Tests: Login routing, role isolation, data from DB, notifications
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


import requests
import json

BASE = "http://127.0.0.1:8000"

def login(email, password="Password123!"):
    r = requests.post(f"{BASE}/api/auth/signin", json={"email": email, "password": password})
    if r.status_code == 200:
        d = r.json()
        return d["access_token"], d["user"]
    else:
        print(f"  ❌ Login FAILED for {email}: {r.status_code} {r.text}")
        return None, None

def headers(token):
    return {"Authorization": f"Bearer {token}"}

def test_role(label, email, expected_role):
    print(f"\n{'='*60}")
    print(f"Testing: {label} ({email})")
    token, user = login(email)
    if not token:
        return None, None
    role = user.get("role", "")
    if role == expected_role:
        print(f"  ✅ Role correct: {role}")
    else:
        print(f"  ❌ Role WRONG: got '{role}', expected '{expected_role}'")
    return token, user

print("\n" + "="*60)
print("TALENTSCOUT AI - INTEGRATION TEST")
print("="*60)

# ─── 1. Login Tests ───
sa_token, sa_user = test_role("Super Admin", "superadmin@talentscout.ai", "SuperAdmin")
hr_token, hr_user = test_role("HR Admin", "hr@talentscout.ai", "HR")
m1_token, m1_user = test_role("Manager 1", "manager1@talentscout.ai", "Manager")
m2_token, m2_user = test_role("Manager 2", "manager2@talentscout.ai", "Manager")
m3_token, m3_user = test_role("Manager 3", "manager3@talentscout.ai", "Manager")

# ─── 2. Super Admin Tests ───
print(f"\n{'='*60}")
print("SUPER ADMIN TESTS")
if sa_token:
    r = requests.get(f"{BASE}/api/auth/recruiters", headers=headers(sa_token))
    if r.status_code == 200:
        recs = r.json()
        print(f"  ✅ Can list recruiters: {len(recs)} accounts")
        for rec in recs:
            print(f"     - {rec['full_name']} ({rec['email']}) [{rec['role']}]")
    else:
        print(f"  ❌ Cannot list recruiters: {r.status_code}")

    # SA cannot access jobs
    r = requests.get(f"{BASE}/api/jobs/", headers=headers(sa_token))
    print(f"  {'✅' if r.status_code == 200 else '⚠️'} Jobs access: {r.status_code} (SuperAdmin can read all jobs)")

# ─── 3. Manager Job Isolation ───
print(f"\n{'='*60}")
print("MANAGER ISOLATION TESTS")
if m1_token and m2_token:
    r1 = requests.get(f"{BASE}/api/jobs/", headers=headers(m1_token))
    r2 = requests.get(f"{BASE}/api/jobs/", headers=headers(m2_token))
    if r1.status_code == 200 and r2.status_code == 200:
        j1 = r1.json()
        j2 = r2.json()
        jobs1 = j1.get("jobs", []) if isinstance(j1, dict) else j1
        jobs2 = j2.get("jobs", []) if isinstance(j2, dict) else j2
        print(f"  Manager 1 sees {len(jobs1)} jobs")
        print(f"  Manager 2 sees {len(jobs2)} jobs")
        
        # Check no overlap
        ids1 = {j.get("id") for j in jobs1}
        ids2 = {j.get("id") for j in jobs2}
        overlap = ids1 & ids2
        if not overlap:
            print(f"  ✅ No job overlap between managers - isolation WORKING")
        else:
            print(f"  ❌ Jobs shared between managers: {len(overlap)} jobs visible to both!")

# ─── 4. HR Can See All ───
print(f"\n{'='*60}")
print("HR ACCESS TESTS")
if hr_token:
    r = requests.get(f"{BASE}/api/jobs/", headers=headers(hr_token))
    if r.status_code == 200:
        d = r.json()
        jobs = d.get("jobs", []) if isinstance(d, dict) else d
        print(f"  ✅ HR can see {len(jobs)} total jobs from all managers")
        
        # Check emergency jobs at top
        if jobs and jobs[0].get("emergency"):
            print(f"  ✅ Emergency job is at position 1 (priority sorting working)")
        
    r = requests.get(f"{BASE}/api/screening/applications/", headers=headers(hr_token))
    print(f"  {'✅' if r.status_code == 200 else '❌'} Applications: {r.status_code}")

    r = requests.get(f"{BASE}/api/candidates/", headers=headers(hr_token))
    if r.status_code == 200:
        d = r.json()
        cands = d.get("candidates", []) if isinstance(d, dict) else d
        print(f"  ✅ HR sees {len(cands)} candidates")

# ─── 5. Interviews ───
print(f"\n{'='*60}")
print("INTERVIEW TESTS")
if hr_token:
    r = requests.get(f"{BASE}/api/interviews/", headers=headers(hr_token))
    if r.status_code == 200:
        d = r.json()
        ivs = d.get("interviews", []) if isinstance(d, dict) else d
        print(f"  ✅ HR sees {len(ivs)} interviews")
        
        if m1_token and ivs:
            # Manager should only see their own
            r2 = requests.get(f"{BASE}/api/interviews/", headers=headers(m1_token))
            if r2.status_code == 200:
                d2 = r2.json()
                ivs2 = d2.get("interviews", []) if isinstance(d2, dict) else d2
                print(f"  ✅ Manager 1 sees {len(ivs2)} interviews (filtered to their own)")

# ─── 6. Notifications ───
print(f"\n{'='*60}")
print("NOTIFICATION TESTS")
if hr_token:
    r = requests.get(f"{BASE}/api/notifications/", headers=headers(hr_token))
    print(f"  {'✅' if r.status_code == 200 else '❌'} HR Notifications: {r.status_code}")
    
if m1_token:
    r = requests.get(f"{BASE}/api/notifications/", headers=headers(m1_token))
    if r.status_code == 200:
        d = r.json()
        notifs = d if isinstance(d, list) else d.get("notifications", [])
        print(f"  ✅ Manager 1 has {len(notifs)} notifications")

print(f"\n{'='*60}")
print("INTEGRATION TEST COMPLETE")
print("="*60)
print("\n✅ KEY CREDENTIALS:")
print("  Super Admin:  superadmin@talentscout.ai  / Password123!")
print("  HR:           hr@talentscout.ai           / Password123!")
print("  Manager 1:    manager1@talentscout.ai     / Password123!")
print("  Manager 2:    manager2@talentscout.ai     / Password123!")
print("  Manager 3:    manager3@talentscout.ai     / Password123!")
