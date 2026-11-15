from fastapi.testclient import TestClient

from app.core.security import create_access_token, decode_token, get_password_hash, verify_password


def test_password_hashing():
    raw = "SecurePassword123!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_lifecycle():
    user_id = "user-12345"
    token = create_access_token(subject=user_id)
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["type"] == "access"
    assert "exp" in payload


def test_register_and_login_flow(client: TestClient):
    print("\n--- STEP 1: Registration ---", flush=True)
    register_payload = {
        "email": "candidate@example.com",
        "full_name": "Alex Candidate",
        "password": "Password123!",
        "target_role": "SDE",
        "experience_level": "fresher",
        "tech_focus_areas": ["Python", "FastAPI", "React"]
    }
    res = client.post("/api/v1/auth/register", json=register_payload)
    print("Registration status:", res.status_code, flush=True)
    assert res.status_code == 201, res.text
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "candidate@example.com"
    assert data["user"]["full_name"] == "Alex Candidate"
    assert data["user"]["profile"]["target_role"] == "SDE"
    assert "Python" in data["user"]["profile"]["tech_focus_areas"]

    access_token = data["access_token"]
    refresh_token = data["refresh_token"]

    print("--- STEP 2: Duplicate Registration ---", flush=True)
    dup_res = client.post("/api/v1/auth/register", json=register_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    print("--- STEP 3: Login ---", flush=True)
    login_res = client.post("/api/v1/auth/login", json={
        "email": "candidate@example.com",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data

    print("--- STEP 4: Bad Login ---", flush=True)
    bad_login = client.post("/api/v1/auth/login", json={
        "email": "candidate@example.com",
        "password": "IncorrectPassword"
    })
    assert bad_login.status_code == 401

    print("--- STEP 5: Auth Me ---", flush=True)
    headers = {"Authorization": f"Bearer {access_token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "candidate@example.com"
    assert me_data["profile"]["target_role"] == "SDE"

    print("--- STEP 6: Refresh Token ---", flush=True)
    refresh_res = client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()

    print("--- STEP 7: Update Profile ---", flush=True)
    update_res = client.put("/api/v1/auth/profile", json={
        "target_role": "Backend Developer",
        "experience_level": "0-2 yrs",
        "tech_focus_areas": ["Python", "PostgreSQL", "Docker"],
        "bio": "Aspiring backend engineer"
    }, headers=headers)
    assert update_res.status_code == 200
    updated_profile = update_res.json()
    assert updated_profile["target_role"] == "Backend Developer"
    assert updated_profile["experience_level"] == "0-2 yrs"
    assert "PostgreSQL" in updated_profile["tech_focus_areas"]
    print("--- ALL STEPS PASSED ---", flush=True)
