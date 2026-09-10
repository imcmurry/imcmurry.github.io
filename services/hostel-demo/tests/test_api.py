from concurrent.futures import ThreadPoolExecutor
import threading

from fastapi.testclient import TestClient

from app import create_app
from model import ReviewTooLong


class FakeModel:
    version = "test-version"

    def classify(self, text):
        if text == "Token overflow fixture":
            raise ReviewTooLong()
        if text == "Internal error fixture":
            raise RuntimeError("Sensitive input must not be echoed")
        return {"version": self.version, "probability": .7, "threshold": .5405342781281611, "label": "social", "point": [1., 2.]}


def test_valid_request_cors_and_no_store():
    with TestClient(create_app(FakeModel)) as client:
        response = client.post("/v1/classify", json={"text": "We met other guests over dinner."}, headers={"Origin": "https://imcmurry.github.io"})
        assert response.status_code == 200
        assert response.json()["label"] == "social"
        assert response.headers["access-control-allow-origin"] == "https://imcmurry.github.io"
        assert response.headers["cache-control"] == "no-store"
        assert client.get("/healthz").json()["version"] == "test-version"
        preflight = client.options("/v1/classify", headers={"Origin": "https://imcmurry.github.io", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
        assert preflight.status_code == 200


def test_rejects_invalid_input_without_echoing_it():
    with TestClient(create_app(FakeModel)) as client:
        for payload in [{"text": "  "}, {"text": "x" * 1201}, {"text": 123}, ["review"], {"text": "A real review", "extra": True}]:
            assert client.post("/v1/classify", json=payload).status_code == 422
        assert client.post("/v1/classify", content=b"{", headers={"Content-Type": "application/json"}).status_code == 400
        assert client.post("/v1/classify", content=b"x" * 8193, headers={"Content-Type": "application/json"}).status_code == 413
        assert client.post("/v1/classify", content="a review").status_code == 415
        assert client.post("/v1/classify", json={"text": "Token overflow fixture"}).status_code == 422
        response = client.post("/v1/classify", json={"text": "Internal error fixture"})
        assert response.status_code == 503
        assert "Sensitive" not in response.text and "Internal error fixture" not in response.text


def test_disallowed_origins_and_rate_limits():
    with TestClient(create_app(FakeModel, requests_per_minute=1)) as client:
        assert client.post("/v1/classify", json={"text": "A valid review"}, headers={"Origin": "https://example.com"}).status_code == 403
        assert client.post("/v1/classify", json={"text": "A valid review"}).status_code == 200
        response = client.post("/v1/classify", json={"text": "Another review"})
        assert response.status_code == 429
        assert response.headers["retry-after"] == "60"
        client.app.state.recent.clear()
        assert client.post("/v1/classify", json={"text": "Another review"}).status_code == 200


def test_only_one_inference_at_a_time():
    entered, release = threading.Event(), threading.Event()

    class SlowModel(FakeModel):
        def classify(self, text):
            if text == "A slow review":
                entered.set()
                assert release.wait(5)
            return super().classify(text)

    with TestClient(create_app(SlowModel)) as client, ThreadPoolExecutor() as pool:
        first = pool.submit(client.post, "/v1/classify", json={"text": "A slow review"})
        assert entered.wait(5)
        assert client.post("/v1/classify", json={"text": "Another review"}).status_code == 429
        release.set()
        assert first.result(timeout=5).status_code == 200
        assert client.post("/v1/classify", json={"text": "Another review"}).status_code == 200
