from app.main import app


def test_openapi_contract_exposes_health_and_auth_routes():
    paths = app.openapi()["paths"]
    assert "/api/health" in paths
    assert "/api/auth/login" in paths
    assert "/api/auth/logout" in paths
