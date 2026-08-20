"""Penanganan error terpusat dengan format Problem Details (RFC 9457).

Prinsipnya: klien selalu menerima bentuk error yang sama dan bisa diprediksi,
sementara detail internal (stack trace, pesan driver DB) tidak pernah bocor.
"""

from __future__ import annotations

from typing import Any

import orjson
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import Response
from loguru import logger
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_ctx

PROBLEM_CONTENT_TYPE = "application/problem+json"


class AppError(Exception):
    """Error domain yang aman ditampilkan ke klien."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "bad_request"
    message: str = "Permintaan tidak valid."

    def __init__(self, message: str | None = None, *, detail: dict[str, Any] | None = None):
        super().__init__(message or self.message)
        self.message = message or self.message
        self.detail = detail or {}


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"
    message = "Data tidak ditemukan."


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"
    message = "Data sudah ada."


class AuthenticationError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "unauthenticated"
    message = "Kredensial tidak valid."


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"
    message = "Tidak punya izin untuk aksi ini."


class RateLimitError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "rate_limited"
    message = "Terlalu banyak permintaan. Coba lagi sebentar lagi."


class SessionExpiredError(AppError):
    status_code = status.HTTP_410_GONE
    code = "session_expired"
    message = "Sesi sudah berakhir. Mulai scan ulang."


class DependencyUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "dependency_unavailable"
    message = "Layanan pendukung sedang tidak tersedia."


def problem(
    status_code: int,
    code: str,
    message: str,
    detail: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> Response:
    body: dict[str, Any] = {
        "type": f"https://docs.coba.id/errors/{code}",
        "title": code,
        "status": status_code,
        "detail": message,
        "request_id": request_id_ctx.get(),
    }
    if detail:
        body["errors"] = detail
    return Response(
        content=orjson.dumps(body),
        status_code=status_code,
        headers=headers,
        media_type=PROBLEM_CONTENT_TYPE,
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> Response:
        headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
        return problem(exc.status_code, exc.code, exc.message, exc.detail, headers)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> Response:
        code = {401: "unauthenticated", 403: "forbidden", 404: "not_found"}.get(
            exc.status_code, "http_error"
        )
        return problem(exc.status_code, code, str(exc.detail), headers=dict(exc.headers or {}))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> Response:
        fields = [
            {"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]}
            for e in exc.errors()
        ]
        return problem(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "validation_error",
            "Isian tidak valid.",
            {"fields": fields},
        )

    @app.exception_handler(IntegrityError)
    async def _integrity_error(_: Request, exc: IntegrityError) -> Response:
        # Pesan asli bisa memuat nama constraint dan nilai kolom, jadi hanya masuk log.
        logger.warning("integrity error: {}", exc.orig)
        return problem(
            status.HTTP_409_CONFLICT, "conflict", "Data melanggar batasan keunikan atau relasi."
        )

    @app.exception_handler(SQLAlchemyError)
    async def _db_error(_: Request, exc: SQLAlchemyError) -> Response:
        logger.exception("database error: {}", type(exc).__name__)
        return problem(
            status.HTTP_503_SERVICE_UNAVAILABLE, "database_unavailable", "Database bermasalah."
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> Response:
        logger.exception("unhandled error: {}", type(exc).__name__)
        return problem(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "internal_error",
            "Terjadi kesalahan internal.",
        )
