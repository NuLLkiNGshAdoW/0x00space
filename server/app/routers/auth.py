from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from app import models
from app.config import get_settings
from app.database import get_db
from app.services.monitoring import capture_exception
from app.services.admin_auth import (
    COOKIE_NAME,
    authenticate,
    clear_failures,
    create_session,
    login_allowed,
    record_failure,
)
from app.services.client_ip import get_client_ip
from app.services.admin_credentials import DUMMY_PASSWORD_HASH, normalize_username, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginPayload(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=1, max_length=512)

    @field_validator("username", mode="before")
    @classmethod
    def normalize_login_username(cls, value):
        if not isinstance(value, str):
            return value
        return normalize_username(value)


@router.post("/login")
def login(
    payload: LoginPayload,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    settings = get_settings()
    ip = get_client_ip(request)
    if not settings.ADMIN_SESSION_SECRET:
        raise HTTPException(status_code=503, detail="Админ-аутентификация не настроена: отсутствует session secret")
    try:
        allowed = login_allowed(ip)
    except RedisError as exc:
        _raise_rate_limit_unavailable(exc)
    if not allowed:
        raise HTTPException(status_code=429, detail="Слишком много неудачных попыток. Попробуйте позже.")
    user = db.query(models.AdminUser).filter(models.AdminUser.username == payload.username).first()
    password_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    password_matches = verify_password(payload.password, password_hash)
    if not user or not user.is_active or not password_matches:
        try:
            record_failure(ip)
        except RedisError as exc:
            _raise_rate_limit_unavailable(exc)
        raise HTTPException(status_code=401, detail="Неверный логин или пароль администратора")
    try:
        clear_failures(ip)
    except RedisError as exc:
        _raise_rate_limit_unavailable(exc)
    # Vercel и Render имеют разные домены, поэтому production-cookie должна
    # отправляться в cross-site fetch. Secure=True требует SameSite=None.
    same_site = "none" if settings.COOKIE_SECURE else "lax"
    response.set_cookie(
        COOKIE_NAME,
        create_session(user),
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=same_site,
        max_age=settings.ADMIN_SESSION_TTL_SECONDS,
        path="/",
    )
    return {"authenticated": True, "username": user.username}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"authenticated": False}


@router.get("/check")
def check(request: Request, db: Session = Depends(get_db)):
    admin = authenticate(request, db)
    return {"authenticated": True, "username": admin.username}


def _raise_rate_limit_unavailable(error: RedisError) -> None:
    capture_exception(error, source="admin_login_rate_limit")
    raise HTTPException(
        status_code=503,
        detail="Ограничитель попыток входа временно недоступен.",
    ) from error
