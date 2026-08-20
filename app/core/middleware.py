"""Middleware lintas request: correlation id, timing, header keamanan, batas body."""

from __future__ import annotations

import time
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.config import Settings
from app.core.errors import problem
from app.core.logging import request_id_ctx

REQUEST_ID_HEADER = "X-Request-ID"

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), payment=()",
    # API murni JSON: matikan semua sumber daya aktif.
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
}


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Pasang request id, catat durasi, dan tempelkan header keamanan."""

    async def dispatch(self, request: Request, call_next) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        # Jangan percaya nilai kiriman klien mentah-mentah: batasi bentuk dan panjangnya.
        request_id = incoming if incoming.isalnum() and len(incoming) <= 64 else uuid.uuid4().hex
        token = request_id_ctx.set(request_id)
        request.state.request_id = request_id
        started = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
        elapsed_ms = (time.perf_counter() - started) * 1000
        response.headers[REQUEST_ID_HEADER] = request_id
        response.headers["X-Response-Time-ms"] = f"{elapsed_ms:.1f}"
        for key, value in SECURITY_HEADERS.items():
            response.headers.setdefault(key, value)
        logger.bind(request_id=request_id).info(
            "{} {} -> {} ({:.1f} ms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response


class BodySizeLimitMiddleware:
    """Tolak body kelebihan ukuran lebih awal (ASGI murni, tanpa membaca isi)."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = dict(scope.get("headers") or [])
        raw_length = headers.get(b"content-length")
        if raw_length is not None:
            try:
                if int(raw_length) > self.max_bytes:
                    response = problem(413, "payload_too_large", "Body permintaan terlalu besar.")
                    await response(scope, receive, send)
                    return
            except ValueError:
                pass

        received = 0
        max_bytes = self.max_bytes

        async def guarded_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > max_bytes:
                    raise ValueError("body melebihi batas")
            return message

        await self.app(scope, guarded_receive, send)


def register_middleware(app: FastAPI, settings: Settings) -> None:
    # Urutan pendaftaran = kebalikan urutan eksekusi.
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_request_body_bytes)
    app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=5)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", REQUEST_ID_HEADER, "If-None-Match"],
            expose_headers=[REQUEST_ID_HEADER, "X-Response-Time-ms", "ETag"],
            max_age=600,
        )
    app.add_middleware(RequestContextMiddleware)
