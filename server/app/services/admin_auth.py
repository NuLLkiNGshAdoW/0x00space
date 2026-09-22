"""Short-lived signed admin sessions and a small in-process login limiter."""
import base64
import binascii
import hashlib
import hmac
import json
import threading
import time

from fastapi import HTTPException, Request

from app.config import get_settings, is_production

COOKIE_NAME = "admin_session"
_failures: dict[str, list[float]] = {}
_lock = threading.Lock()


def configured_secret() -> str:
    settings = get_settings()
    if settings.ADMIN_SESSION_SECRET:
        return settings.ADMIN_SESSION_SECRET
    if not is_production(settings):
        return settings.ADMIN_PASSWORD or settings.ADMIN_TOKEN
    return ""


def _sign(value: str, secret: str) -> str:
    return hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def create_session() -> str:
    settings = get_settings()
    payload = base64.urlsafe_b64encode(json.dumps({"exp": int(time.time()) + settings.ADMIN_SESSION_TTL_SECONDS}, separators=(",", ":")).encode()).decode().rstrip("=")
    return f"{payload}.{_sign(payload, configured_secret())}"


def valid_session(value: str | None) -> bool:
    secret = configured_secret()
    if not value or not secret or "." not in value:
        return False
    payload, signature = value.rsplit(".", 1)
    if not hmac.compare_digest(signature, _sign(payload, secret)):
        return False
    try:
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        return int(data["exp"]) >= int(time.time())
    except (ValueError, KeyError, TypeError, json.JSONDecodeError, binascii.Error):
        return False


def login_allowed(ip: str) -> bool:
    now = time.monotonic()
    with _lock:
        values = [stamp for stamp in _failures.get(ip, []) if now - stamp < get_settings().ADMIN_LOGIN_WINDOW_SECONDS]
        _failures[ip] = values
        return len(values) < get_settings().ADMIN_LOGIN_MAX_FAILURES


def record_failure(ip: str) -> None:
    with _lock:
        _failures.setdefault(ip, []).append(time.monotonic())


def authenticate(request: Request, legacy_token: str | None = None) -> None:
    settings = get_settings()
    configured = settings.ADMIN_PASSWORD or settings.ADMIN_TOKEN
    if is_production(settings) and not settings.ADMIN_SESSION_SECRET:
        raise HTTPException(status_code=503, detail="Админ-аутентификация не настроена: отсутствует session secret")
    if not configured:
        raise HTTPException(status_code=503, detail="Админ-аутентификация не настроена")
    if valid_session(request.cookies.get(COOKIE_NAME)):
        # Production-cookie is SameSite=None because Vercel and Render use
        # different sites.  Check Origin for cookie-authenticated mutations so
        # another site cannot submit an admin action on the user's behalf.
        origin = request.headers.get("origin")
        if origin and origin not in settings.CORS_ORIGINS:
            raise HTTPException(status_code=403, detail="Недопустимый источник запроса")
        return
    if legacy_token and hmac.compare_digest(legacy_token, configured):
        return
    raise HTTPException(status_code=401, detail="Неверный пароль администратора")
