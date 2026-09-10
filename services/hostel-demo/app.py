"""Small public inference API. No review text is logged or persisted by the app."""
import asyncio
from collections import deque
from contextlib import asynccontextmanager
import os
from pathlib import Path
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

MAX_CHARACTERS = 1200
MAX_BODY_BYTES = 8192


def create_app(model_factory=None, *, origins=None, requests_per_minute=30):
    if model_factory is None:
        def model_factory():
            from model import SocialModel
            return SocialModel(os.getenv("ARTIFACT_DIR", str(Path(__file__).parent / "artifacts")))

    @asynccontextmanager
    async def lifespan(app):
        app.state.model = await asyncio.to_thread(model_factory)
        # Compile UMAP's transform before accepting traffic (cold starts).
        await asyncio.to_thread(app.state.model.classify, "The room was clean and the bed was comfortable.")
        app.state.busy = False
        app.state.recent = deque()
        yield

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    allowed = origins if origins is not None else os.getenv("ALLOWED_ORIGINS", "https://imcmurry.github.io").split(",")
    allowed = [origin.strip() for origin in allowed if origin.strip()]
    if "*" in allowed:
        raise ValueError("Use explicit allowed origins")
    app.add_middleware(CORSMiddleware, allow_origins=allowed, allow_methods=["POST", "GET"], allow_headers=["Content-Type"], allow_credentials=False, max_age=600)

    @app.middleware("http")
    async def response_headers(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.get("/healthz")
    async def health():
        return {"status": "ready", "version": app.state.model.version}

    @app.post("/v1/classify")
    async def classify(request: Request):
        origin = request.headers.get("origin")
        if origin and origin not in allowed:
            return JSONResponse({"error": "Origin not allowed"}, status_code=403)
        if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
            return JSONResponse({"error": "Send application/json"}, status_code=415)
        now = time.monotonic()
        recent = app.state.recent
        while recent and recent[0] <= now - 60:
            recent.popleft()
        if app.state.busy or len(recent) >= requests_per_minute:
            return JSONResponse({"error": "Please try again shortly"}, status_code=429, headers={"Retry-After": "60"})
        recent.append(now)
        # Claim the single inference slot before awaiting body reads.
        app.state.busy = True
        try:
            body = bytearray()
            try:
                async with asyncio.timeout(10):
                    async for chunk in request.stream():
                        body.extend(chunk)
                        if len(body) > MAX_BODY_BYTES:
                            return JSONResponse({"error": "Review is too long"}, status_code=413)
            except TimeoutError:
                return JSONResponse({"error": "Request timed out"}, status_code=408)
            import json
            try:
                payload = json.loads(body)
            except (ValueError, UnicodeError):
                return JSONResponse({"error": "Invalid JSON"}, status_code=400)
            if not isinstance(payload, dict) or set(payload) != {"text"} or not isinstance(payload["text"], str):
                return JSONResponse({"error": "Send a text field"}, status_code=422)
            text = payload["text"].strip()
            if not 10 <= len(text) <= MAX_CHARACTERS:
                return JSONResponse({"error": "Use 10–1,200 characters"}, status_code=422)
            from model import ReviewTooLong
            try:
                # Keep the slot until the worker finishes, even after a disconnect.
                task = asyncio.create_task(asyncio.to_thread(app.state.model.classify, text))
                try:
                    result = await asyncio.shield(task)
                except asyncio.CancelledError:
                    await task
                    raise
                return result
            except ReviewTooLong:
                return JSONResponse({"error": "Use a few short sentences"}, status_code=422)
            except Exception:
                # Do not echo input or exception messages into responses or logs.
                return JSONResponse({"error": "Model temporarily unavailable"}, status_code=503)
        finally:
            app.state.busy = False

    return app


app = create_app()
