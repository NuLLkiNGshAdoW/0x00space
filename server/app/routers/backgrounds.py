"""API для публичного активного фона и защищённого управления им."""
import json
import uuid
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, File, Header, HTTPException, Request, UploadFile

from app.services.admin_auth import authenticate
from app.config import get_settings

router = APIRouter(prefix="/backgrounds", tags=["backgrounds"])
ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = Path(get_settings().BACKGROUND_UPLOAD_DIR)
if not UPLOAD_DIR.is_absolute():
    UPLOAD_DIR = ROOT / UPLOAD_DIR
META_FILE = UPLOAD_DIR / "metadata.json"
ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm"}
MAX_SIZE = 100 * 1024 * 1024
DEFAULT_SETTINGS = {"shade": 0.68, "blur": 0, "position": "center", "speed": 1, "rotation_minutes": 0}


def _read_meta():
    if not META_FILE.exists():
        return {"active": None, "items": [], "settings": DEFAULT_SETTINGS.copy()}
    try:
        return json.loads(META_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"active": None, "items": [], "settings": DEFAULT_SETTINGS.copy()}


def _write_meta(data):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    temporary = META_FILE.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(META_FILE)


def _safe_file_path(filename: str) -> Path:
    """Return a path inside UPLOAD_DIR, rejecting traversal and directories."""
    candidate = (UPLOAD_DIR / filename).resolve()
    upload_root = UPLOAD_DIR.resolve()
    if candidate.parent != upload_root or candidate.name != filename:
        raise HTTPException(status_code=400, detail="Недопустимое имя файла")
    return candidate


def _public_url(filename: str) -> str:
    base_url = get_settings().BACKGROUND_PUBLIC_BASE_URL.rstrip("/")
    if base_url:
        parsed = urlparse(base_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise HTTPException(status_code=500, detail="Некорректный публичный URL хранилища")
        return f"{base_url}/{filename}"
    return f"/media/backgrounds/{filename}"


def _check_admin(request: Request, token: str | None):
    authenticate(request, token)


@router.get("")
def get_backgrounds():
    data = _read_meta()
    return {"active": data.get("active"), "items": data.get("items", []), "settings": {**DEFAULT_SETTINGS, **data.get("settings", {})}}


@router.put("/settings")
def update_settings(payload: dict, request: Request, x_admin_token: str | None = Header(default=None)):
    _check_admin(request, x_admin_token)
    data = _read_meta()
    settings = {**DEFAULT_SETTINGS, **data.get("settings", {})}
    for key in DEFAULT_SETTINGS:
        if key in payload:
            settings[key] = payload[key]
    settings["shade"] = max(0, min(0.72, float(settings["shade"])))
    settings["blur"] = max(0, min(20, float(settings["blur"])))
    settings["speed"] = max(0.25, min(2, float(settings["speed"])))
    settings["rotation_minutes"] = max(0, min(1440, int(settings["rotation_minutes"])))
    if settings["position"] not in {"center", "top", "bottom"}:
        settings["position"] = "center"
    data["settings"] = settings
    _write_meta(data)
    return settings


@router.post("/reset")
def reset_background(request: Request, x_admin_token: str | None = Header(default=None)):
    _check_admin(request, x_admin_token)
    data = _read_meta()
    data["active"] = None
    _write_meta(data)
    return {"active": None}


@router.post("/upload", status_code=201)
async def upload_background(request: Request, file: UploadFile = File(...), x_admin_token: str | None = Header(default=None)):
    _check_admin(request, x_admin_token)
    extension = ALLOWED.get(file.content_type or "")
    if not extension:
        raise HTTPException(status_code=415, detail="Разрешены JPG, PNG, WebP, MP4 и WebM")

    content = await file.read(MAX_SIZE + 1)
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Файл слишком большой. Максимум 100 МБ")

    file_id = uuid.uuid4().hex
    filename = f"{file_id}{extension}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = _safe_file_path(filename)
    file_path.write_bytes(content)
    item = {"id": file_id, "filename": filename, "name": file.filename or filename, "url": _public_url(filename), "type": "video" if extension in {".mp4", ".webm"} else "image"}
    data = _read_meta()
    data["items"] = [*data.get("items", []), item]
    # Новая загрузка сразу становится глобальным активным фоном. Раньше
    # preview был виден только в окне админки, потому что старый active
    # оставался включённым для всех остальных клиентов.
    data["active"] = item
    try:
        _write_meta(data)
    except Exception:
        file_path.unlink(missing_ok=True)
        raise
    return item


@router.post("/{background_id}/activate")
def activate_background(background_id: str, request: Request, x_admin_token: str | None = Header(default=None)):
    _check_admin(request, x_admin_token)
    data = _read_meta()
    item = next((entry for entry in data.get("items", []) if entry["id"] == background_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Фон не найден")
    data["active"] = item
    _write_meta(data)
    return item


@router.delete("/{background_id}")
def delete_background(background_id: str, request: Request, x_admin_token: str | None = Header(default=None)):
    _check_admin(request, x_admin_token)
    data = _read_meta()
    item = next((entry for entry in data.get("items", []) if entry["id"] == background_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Фон не найден")
    filename = item.get("filename") or Path(urlparse(item.get("url", "")).path).name
    _safe_file_path(filename).unlink(missing_ok=True)
    data["items"] = [entry for entry in data["items"] if entry["id"] != background_id]
    data["active"] = data["items"][0] if data.get("active", {}).get("id") == background_id and data["items"] else (None if data.get("active", {}).get("id") == background_id else data.get("active"))
    _write_meta(data)
    return {"ok": True}
