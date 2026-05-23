import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env to get the public URL (single source of truth)
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL is required"


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(email: str, password: str = "password123") -> str:
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=20,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def alex_token() -> str:
    return _login("alex.demo@huddle.app")


@pytest.fixture(scope="session")
def maya_token() -> str:
    return _login("maya.demo@huddle.app")


@pytest.fixture
def alex_headers(alex_token):
    return {"Authorization": f"Bearer {alex_token}", "Content-Type": "application/json"}


@pytest.fixture
def maya_headers(maya_token):
    return {"Authorization": f"Bearer {maya_token}", "Content-Type": "application/json"}
