import secrets

from fastapi import APIRouter, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.admin_auth import COOKIE_NAME, authenticate, create_session, login_allowed, record_failure

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginPayload(BaseModel):
    password: str = Field(..., min_length=1, max_length=512)


@router.post("/login")
def login(payload: LoginPayload, request: Request, response: Response):
    settings = get_settings()
    ip = request.client.host if request.client else "unknown"
    configured = settings.ADMIN_PASSWORD or settings.ADMIN_TOKEN
    if not configured or not login_allowed(ip):
        raise HTTPException(status_code=429, detail="Слишком много неудачных попыток. Попробуйте позже.")
    if not secrets.compare_digest(payload.password, configured):
        record_failure(ip)
        raise HTTPException(status_code=401, detail="Неверный пароль администратора")
    # Vercel и Render имеют разные домены, поэтому production-cookie должна
    # отправляться в cross-site fetch. Secure=True требует SameSite=None.
    same_site = "none" if settings.COOKIE_SECURE else "lax"
    response.set_cookie(COOKIE_NAME, create_session(), httponly=True, secure=settings.COOKIE_SECURE, samesite=same_site, max_age=settings.ADMIN_SESSION_TTL_SECONDS, path="/")
    return {"authenticated": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"authenticated": False}


@router.get("/check")
def check(request: Request, x_admin_token: str | None = Header(default=None)):
    authenticate(request, x_admin_token)
    return {"authenticated": True}
