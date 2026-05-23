"""
Backend regression tests for Huddle sports community app.
Covers: health, auth (register/login/me), profile update, discover, swipe,
matches (CRUD/join/leave/capacity), teams (create/list/invite/regen/join),
messages (REST), and WebSocket chat broadcast.
"""
import asyncio
import json
import time
import uuid
import requests
import pytest


# ---------- Health ----------
def test_health(base_url):
    r = requests.get(f"{base_url}/api/", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("ok") is True
    assert body.get("service") == "sports-community"


# ---------- Auth ----------
class TestAuth:
    def test_register_returns_jwt(self, base_url):
        email = f"TEST_{uuid.uuid4().hex[:8]}@huddle.app"
        r = requests.post(
            f"{base_url}/api/auth/register",
            json={"email": email, "password": "password123", "display_name": "Test User"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and isinstance(body["token"], str) and len(body["token"]) > 20
        assert body["user"]["email"] == email.lower()
        assert body["user"]["auth_provider"] == "email"

    def test_register_duplicate_rejected(self, base_url):
        r = requests.post(
            f"{base_url}/api/auth/register",
            json={"email": "alex.demo@huddle.app", "password": "password123", "display_name": "Dup"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_login_seeded_user(self, base_url):
        r = requests.post(
            f"{base_url}/api/auth/login",
            json={"email": "alex.demo@huddle.app", "password": "password123"},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["display_name"] == "Alex Rivera"
        assert body["user"]["user_id"] == "user_seed_alex01"

    def test_login_wrong_password(self, base_url):
        r = requests.post(
            f"{base_url}/api/auth/login",
            json={"email": "alex.demo@huddle.app", "password": "wrong"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_me_with_bearer(self, base_url, alex_headers):
        r = requests.get(f"{base_url}/api/auth/me", headers=alex_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == "alex.demo@huddle.app"

    def test_me_missing_token(self, base_url):
        r = requests.get(f"{base_url}/api/auth/me", timeout=15)
        assert r.status_code == 401


# ---------- Users ----------
class TestUsers:
    def test_update_profile_and_verify(self, base_url, alex_headers):
        new_bio = f"Updated bio {uuid.uuid4().hex[:6]}"
        r = requests.put(
            f"{base_url}/api/users/me",
            headers=alex_headers,
            json={
                "preferred_sports": ["Basketball", "Tennis"],
                "skill_level": "Intermediate",
                "location_name": "Brooklyn, NY",
                "bio": new_bio,
            },
            timeout=15,
        )
        assert r.status_code == 200
        # verify via /auth/me
        me = requests.get(f"{base_url}/api/auth/me", headers=alex_headers, timeout=15).json()["user"]
        assert me["bio"] == new_bio
        assert "Basketball" in me["preferred_sports"]
        assert me["location_name"] == "Brooklyn, NY"

    def test_discover_excludes_self(self, base_url, alex_headers):
        r = requests.get(f"{base_url}/api/users/discover", headers=alex_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert isinstance(items, list)
        assert len(items) >= 1
        for u in items:
            assert u["user_id"] != "user_seed_alex01"

    def test_swipe_and_mutual_match(self, base_url, alex_headers, maya_headers):
        # alex -> maya right
        r1 = requests.post(
            f"{base_url}/api/users/swipe",
            headers=alex_headers,
            json={"target_user_id": "user_seed_maya02", "direction": "right"},
            timeout=15,
        )
        assert r1.status_code == 200
        # maya -> alex right => matched True
        r2 = requests.post(
            f"{base_url}/api/users/swipe",
            headers=maya_headers,
            json={"target_user_id": "user_seed_alex01", "direction": "right"},
            timeout=15,
        )
        assert r2.status_code == 200
        assert r2.json()["matched"] is True


# ---------- Matches ----------
class TestMatches:
    created_match_id = None

    def test_create_match(self, base_url, alex_headers):
        future = "2030-01-15T18:00:00Z"
        r = requests.post(
            f"{base_url}/api/matches",
            headers=alex_headers,
            json={
                "sport": "Basketball",
                "title": "TEST_Pickup Game",
                "location_name": "Brooklyn Court",
                "date_time": future,
                "max_players": 4,
                "skill_level": "Intermediate",
                "description": "Test match",
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        m = r.json()["match"]
        assert m["id"].startswith("match_")
        assert m["creator_id"] == "user_seed_alex01"
        assert "user_seed_alex01" in m["participants"]
        TestMatches.created_match_id = m["id"]

    def test_list_matches_has_seeds(self, base_url, alex_headers):
        r = requests.get(f"{base_url}/api/matches", headers=alex_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 3, f"Expected >=3 matches, got {len(items)}"

    def test_list_mine_filter(self, base_url, alex_headers):
        r = requests.get(f"{base_url}/api/matches?mine=true", headers=alex_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        for m in items:
            assert "user_seed_alex01" in m["participants"]

    def test_get_match_detail(self, base_url, alex_headers):
        assert TestMatches.created_match_id
        r = requests.get(
            f"{base_url}/api/matches/{TestMatches.created_match_id}",
            headers=alex_headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["match"]["id"] == TestMatches.created_match_id

    def test_join_match_idempotent(self, base_url, maya_headers, alex_headers):
        assert TestMatches.created_match_id
        mid = TestMatches.created_match_id
        # maya joins
        r1 = requests.post(f"{base_url}/api/matches/{mid}/join", headers=maya_headers, timeout=15)
        assert r1.status_code == 200
        assert "user_seed_maya02" in r1.json()["match"]["participants"]
        # join again -> already_joined True
        r2 = requests.post(f"{base_url}/api/matches/{mid}/join", headers=maya_headers, timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("already_joined") is True

    def test_leave_match(self, base_url, maya_headers):
        assert TestMatches.created_match_id
        mid = TestMatches.created_match_id
        r = requests.post(f"{base_url}/api/matches/{mid}/leave", headers=maya_headers, timeout=15)
        assert r.status_code == 200
        assert "user_seed_maya02" not in r.json()["match"]["participants"]

    def test_capacity_enforced(self, base_url, alex_headers, maya_headers):
        # create a 2-player match with alex; fill to capacity then try maya join
        r = requests.post(
            f"{base_url}/api/matches",
            headers=alex_headers,
            json={
                "sport": "Tennis", "title": "TEST_Cap", "location_name": "X",
                "date_time": "2030-02-02T12:00:00Z", "max_players": 2,
            },
            timeout=15,
        )
        assert r.status_code == 200
        mid = r.json()["match"]["id"]
        # register a 3rd user
        email = f"TEST_cap_{uuid.uuid4().hex[:6]}@huddle.app"
        tok3 = requests.post(
            f"{base_url}/api/auth/register",
            json={"email": email, "password": "password123", "display_name": "Cap3"},
            timeout=15,
        ).json()["token"]
        h3 = {"Authorization": f"Bearer {tok3}", "Content-Type": "application/json"}
        # maya joins (now 2/2)
        rj = requests.post(f"{base_url}/api/matches/{mid}/join", headers=maya_headers, timeout=15)
        assert rj.status_code == 200
        # user3 should be rejected
        rf = requests.post(f"{base_url}/api/matches/{mid}/join", headers=h3, timeout=15)
        assert rf.status_code == 400


# ---------- Teams ----------
class TestTeams:
    team_id = None
    invite_code = None

    def test_create_team(self, base_url, alex_headers):
        r = requests.post(
            f"{base_url}/api/teams",
            headers=alex_headers,
            json={"team_name": f"TEST_Team_{uuid.uuid4().hex[:5]}", "sport": "Basketball", "description": "x"},
            timeout=15,
        )
        assert r.status_code == 200
        t = r.json()["team"]
        assert t["id"].startswith("team_")
        assert t["invite_code"] and len(t["invite_code"]) >= 6
        assert "user_seed_alex01" in t["members"]
        TestTeams.team_id = t["id"]
        TestTeams.invite_code = t["invite_code"]

    def test_list_my_teams(self, base_url, alex_headers):
        r = requests.get(f"{base_url}/api/teams?mine=true", headers=alex_headers, timeout=15)
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()["items"]]
        assert TestTeams.team_id in ids

    def test_regenerate_invite_only_creator(self, base_url, alex_headers, maya_headers):
        # maya (not creator) -> 403
        r_forbid = requests.post(
            f"{base_url}/api/teams/{TestTeams.team_id}/regenerate-invite",
            headers=maya_headers, timeout=15,
        )
        assert r_forbid.status_code == 403
        # alex (creator) -> 200, new code
        r_ok = requests.post(
            f"{base_url}/api/teams/{TestTeams.team_id}/regenerate-invite",
            headers=alex_headers, timeout=15,
        )
        assert r_ok.status_code == 200
        new_code = r_ok.json()["team"]["invite_code"]
        assert new_code != TestTeams.invite_code
        TestTeams.invite_code = new_code

    def test_join_team_by_invite(self, base_url, maya_headers):
        r = requests.post(
            f"{base_url}/api/teams/join/{TestTeams.invite_code}",
            headers=maya_headers, timeout=15,
        )
        assert r.status_code == 200
        assert "user_seed_maya02" in r.json()["team"]["members"]

    def test_join_team_invalid_code(self, base_url, maya_headers):
        r = requests.post(f"{base_url}/api/teams/join/nope_invalid_code_xyz", headers=maya_headers, timeout=15)
        assert r.status_code == 404


# ---------- Messages (REST) ----------
class TestMessages:
    def test_post_and_list_messages_in_order(self, base_url, alex_headers):
        # use the match created in TestMatches if available, else create one
        mid = TestMatches.created_match_id
        if not mid:
            r = requests.post(
                f"{base_url}/api/matches",
                headers=alex_headers,
                json={"sport": "Basketball", "title": "TEST_msg", "location_name": "X",
                      "date_time": "2030-03-03T10:00:00Z", "max_players": 4},
                timeout=15,
            )
            mid = r.json()["match"]["id"]
        for i in range(3):
            r = requests.post(
                f"{base_url}/api/matches/{mid}/messages",
                headers=alex_headers,
                json={"text": f"hello {i}"},
                timeout=15,
            )
            assert r.status_code == 200
        r = requests.get(f"{base_url}/api/matches/{mid}/messages", headers=alex_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        texts = [m["text"] for m in items]
        # at least the 3 hellos should appear in order
        idxs = [i for i, t in enumerate(texts) if t.startswith("hello ")]
        assert texts[idxs[0]:idxs[0]+3] == ["hello 0", "hello 1", "hello 2"]


# ---------- WebSocket chat ----------
def _ws_url(base_url: str) -> str:
    if base_url.startswith("https://"):
        return "wss://" + base_url[len("https://"):]
    if base_url.startswith("http://"):
        return "ws://" + base_url[len("http://"):]
    return base_url


@pytest.mark.asyncio
async def test_websocket_chat_broadcast(base_url, alex_token, maya_token):
    try:
        import websockets
    except ImportError:
        pytest.skip("websockets package not installed")

    # Create a fresh match for this test
    r = requests.post(
        f"{base_url}/api/matches",
        headers={"Authorization": f"Bearer {alex_token}", "Content-Type": "application/json"},
        json={"sport": "Basketball", "title": "TEST_ws", "location_name": "X",
              "date_time": "2030-04-04T10:00:00Z", "max_players": 4},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    mid = r.json()["match"]["id"]

    ws_base = _ws_url(base_url)
    url_a = f"{ws_base}/api/ws/chat/{mid}?token={alex_token}"
    url_m = f"{ws_base}/api/ws/chat/{mid}?token={maya_token}"

    async with websockets.connect(url_a) as wa, websockets.connect(url_m) as wm:
        await asyncio.sleep(0.5)
        await wa.send(json.dumps({"text": "hi from alex"}))
        # maya should receive
        msg = await asyncio.wait_for(wm.recv(), timeout=5)
        payload = json.loads(msg)
        assert payload.get("type") == "message"
        assert payload["data"]["text"] == "hi from alex"
        assert payload["data"]["sender_id"] == "user_seed_alex01"


@pytest.mark.asyncio
async def test_websocket_rejects_invalid_token(base_url):
    try:
        import websockets
    except ImportError:
        pytest.skip("websockets package not installed")
    ws_base = _ws_url(base_url)
    bad_url = f"{ws_base}/api/ws/chat/any_match_id?token=invalid_token"
    with pytest.raises(Exception):
        async with websockets.connect(bad_url) as ws:
            await asyncio.wait_for(ws.recv(), timeout=3)
