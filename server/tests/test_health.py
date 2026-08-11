from fastapi.testclient import TestClient

from duo_server.config import settings
from duo_server.main import app

client = TestClient(app)


def test_health_returns_ok_and_model():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["model"] == settings.duo_model
