import pytest
pytestmark = pytest.mark.django_db

def test_valid_login_starts_the_implemented_otp_flow(api_client, manager):
    r = api_client.post("/api/v1/auth/login/", {"email": manager.email, "password": "SafeTestPass123!"}, format="json")
    # Tender managers use OTP; this test intentionally does not consume the code.
    assert r.status_code == 200 and r.data["otp_required"] is True and r.data["temp_token"]
    assert "tokens" not in r.data

def test_invalid_login_is_rejected(api_client, manager):
    assert api_client.post("/api/v1/auth/login/", {"email": manager.email, "password": "bad"}, format="json").status_code == 401

def test_missing_login_credentials_are_rejected(api_client):
    assert api_client.post("/api/v1/auth/login/", {}, format="json").status_code == 400

def test_invalid_token_cannot_access_documents(api_client):
    api_client.credentials(HTTP_AUTHORIZATION="Bearer not-a-token")
    assert api_client.get("/api/v1/documents/").status_code == 401
