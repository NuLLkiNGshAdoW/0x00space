"""Named-admin sessions and an in-process login failure limiter."""
import base64
import binascii
import hashlib
import hmac
import json
import time
from dataclasses import dataclass

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app import models
from app.config import get_settings
from app.services.rate_limit import (
    InMemoryLoginFailureLimiter,
    RedisLoginFailureLimiter,
    create_redis_client,
)

COOKIE_NAME = "admin_session"
_settings = get_settings()
if _settings.RATE_LIMIT_REDIS_URL:
    _login_failure_limiter = RedisLoginFailureLimiter(
        create_redis_client(_settings.RATE_LIMIT_REDIS_URL),
        _settings.ADMIN_LOGIN_MAX_FAILURES,
        _settings.ADMIN_LOGIN_WINDOW_SECONDS,
    )
else:
    _login_failure_limiter = InMemoryLoginFailureLimiter(
        _settings.ADMIN_LOGIN_MAX_FAILURES,
        _settings.ADMIN_LOGIN_WINDOW_SECONDS,
    )


@dataclass(frozen=True)
class AdminIdentity:
    id: str
    username: str


def configured_secret() -> str:
    return get_settings().ADMIN_SESSION_SECRET


def _sign(value: str, secret: str) -> str:
    return hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def create_session(user: models.AdminUser) -> str:
    settings = get_settings()
    secret = configured_secret()
    if not secret:
        raise RuntimeError("ADMIN_SESSION_SECRET is required")
    payload = base64.urlsafe_b64encode(
        json.dumps(
            {
                "sub": user.id,
                "ver": user.session_version,
                "exp": int(time.time()) + settings.ADMIN_SESSION_TTL_SECONDS,
            },
            separators=(",", ":"),
        ).encode()
    ).decode().rstrip("=")
    return f"{payload}.{_sign(payload, secret)}"


def _read_session(value: str | None) -> tuple[str, int] | None:
    secret = configured_secret()
    if not value or not secret or "." not in value:
        return None
    payload, signature = value.rsplit(".", 1)
    if not hmac.compare_digest(signature, _sign(payload, secret)):
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if not isinstance(data, dict):
            return None
        user_id = data.get("sub")
        version = data.get("ver")
        expires_at = data.get("exp")
        if (
            not isinstance(user_id, str)
            or not user_id
            or isinstance(version, bool)
            or not isinstance(version, int)
            or isinstance(expires_at, bool)
            or not isinstance(expires_at, int)
            or expires_at <= int(time.time())
        ):
            return None
        return user_id, version
    except (ValueError, KeyError, TypeError, json.JSONDecodeError, binascii.Error):
        return None


def valid_session(value: str | None) -> bool:
    return _read_session(value) is not None


def login_allowed(ip: str) -> bool:
    return _login_failure_limiter.login_allowed(ip)


def record_failure(ip: str) -> None:
    _login_failure_limiter.record_failure(ip)


def clear_failures(ip: str) -> None:
    _login_failure_limiter.clear_failures(ip)


def authenticate(request: Request, db: Session) -> AdminIdentity:
    settings = get_settings()
    if not settings.ADMIN_SESSION_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Админ-аутентификация не настроена: отсутствует session secret",
        )

    session = _read_session(request.cookies.get(COOKIE_NAME))
    if session:
        user_id, version = session
        user = db.get(models.AdminUser, user_id)
        if user and user.is_active and user.session_version == version:
            origin = request.headers.get("origin")
            if origin and origin not in settings.CORS_ORIGINS:
                raise HTTPException(status_code=403, detail="Недопустимый источник запроса")
            return AdminIdentity(id=user.id, username=user.username)
    raise HTTPException(status_code=401, detail="Неверная или истёкшая сессия администратора")
