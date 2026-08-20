"""Endpoint autentikasi penjual."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.deps import CurrentUser, DbSession, RateLimit
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserRead,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RateLimit("register", per_minute=5))],
)
async def register(payload: RegisterRequest, db: DbSession) -> UserRead:
    user = await auth_service.register(
        db, email=payload.email, password=payload.password, full_name=payload.full_name
    )
    return UserRead.model_validate(user)


@router.post(
    "/login",
    response_model=TokenPair,
    # Batas ketat khusus login: ini sasaran utama serangan tebak password.
    dependencies=[Depends(RateLimit("login", per_minute=5))],
)
async def login(payload: LoginRequest, request: Request, db: DbSession) -> TokenPair:
    user = await auth_service.authenticate(db, email=payload.email, password=payload.password)
    return await auth_service.issue_token_pair(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        client_ip=request.client.host if request.client else None,
    )


@router.post(
    "/refresh",
    response_model=TokenPair,
    dependencies=[Depends(RateLimit("refresh", per_minute=30))],
)
async def refresh(payload: RefreshRequest, request: Request, db: DbSession) -> TokenPair:
    return await auth_service.rotate_refresh_token(
        db,
        payload.refresh_token,
        user_agent=request.headers.get("user-agent"),
        client_ip=request.client.host if request.client else None,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest, db: DbSession) -> Response:
    await auth_service.revoke_one(db, payload.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserRead)
async def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)
