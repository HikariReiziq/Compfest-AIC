"""Logging terstruktur berbasis loguru.

Output JSON di non-lokal supaya bisa langsung dicerna log aggregator, dan
human-readable saat ngoding. `request_id` diikat lewat contextvar sehingga
setiap baris log otomatis bisa ditelusuri ke satu request.
"""

from __future__ import annotations

import logging
import sys
from contextvars import ContextVar

from loguru import logger

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


class _InterceptHandler(logging.Handler):
    """Alihkan log stdlib (uvicorn, sqlalchemy) ke loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level: str | int = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1
        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def _patch_request_id(record: dict) -> None:
    record["extra"].setdefault("request_id", request_id_ctx.get())


def setup_logging(*, level: str = "INFO", json_logs: bool = False) -> None:
    logger.remove()
    logger.configure(patcher=_patch_request_id)

    if json_logs:
        logger.add(sys.stdout, level=level, serialize=True, backtrace=False, diagnose=False)
    else:
        logger.add(
            sys.stdout,
            level=level,
            colorize=True,
            backtrace=True,
            # diagnose=False: jangan bocorkan nilai variabel (bisa berisi kredensial).
            diagnose=False,
            format=(
                "<green>{time:HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | "
                "<cyan>{extra[request_id]}</cyan> | "
                "<cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
            ),
        )

    logging.basicConfig(handlers=[_InterceptHandler()], level=0, force=True)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "sqlalchemy.engine"):
        stdlib = logging.getLogger(name)
        stdlib.handlers = [_InterceptHandler()]
        stdlib.propagate = False
