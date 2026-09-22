"""API для публичного активного фона и защищённого управления им."""
import json
import re
import uuid
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, File, Header, HTTPException, Request, UploadFile

from app.services.admin_auth import authenticate
from app.config import get_settings
from app import schemas

router = APIRouter(prefix="/backgrounds", tags=["backgrounds"])
ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = Path(get_settings().BACKGROUND_UPLOAD_DIR)
if not UPLOAD_DIR.is_absolute():
    UPLOAD_DIR = ROOT / UPLOAD_DIR
META_FILE = UPLOAD_DIR / "metadata.json"
ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm"}
MAX_SIZE = 100 * 1024 * 1024
UPLOAD_CHUNK_SIZE = 1024 * 1024
MAX_DISPLAY_NAME_LENGTH = 255
FILE_NAME_RE = re.compile(r"^[a-f0-9]{32}\.(jpg|png|webp|mp4|webm)$")
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
    if not FILE_NAME_RE.fullmatch(filename):
        raise HTTPException(status_code=400, detail="Недопустимое имя файла")
    candidate = (UPLOAD_DIR / filename).resolve()
    upload_root = UPLOAD_DIR.resolve()
    if candidate.parent != upload_root or candidate.name != filename:
        raise HTTPException(status_code=400, detail="Недопустимое имя файла")
    return candidate


def _public_url(filename: str) -> str:
    base_url = get_settings().BACKGROUND_PUBLIC_BASE_URL.rstrip("/")
    if base_url:
        parsed = urlparse(base_url)
        if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
            raise HTTPException(status_code=500, detail="Некорректный публичный URL хранилища")
        return f"{base_url}/{filename}"
    return f"/media/backgrounds/{filename}"


def _check_admin(request: Request, token: str | None):
    authenticate(request, token)


@router.get("")
def get_backgrounds():
    data = _read_meta()
    return {"active": data.get("active"), "items": data.get("items", []), "settings": {**DEFAULT_SETTINGS, **data.get("settings", {})}}


@router.put("/settings", response_model=schemas.BackgroundSettings)
def update_settings(payload: schemas.BackgroundSettingsUpdate, request: Request, x_admin_token: str | None = Header(default=None)):
    _check_admin(request, x_admin_token)
    data = _read_meta()
    settings = {**DEFAULT_SETTINGS, **data.get("settings", {})}
    settings.update(payload.model_dump(exclude_unset=True))
    validated = schemas.BackgroundSettings.model_validate(settings)
    data["settings"] = validated.model_dump()
    _write_meta(data)
    return validated


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

    file_id = uuid.uuid4().hex
    filename = f"{file_id}{extension}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = _safe_file_path(filename)
    # Не держим весь upload в RAM: на Render Free это могло бы привести к
    # OOM при загрузке разрешённого файла размером до 100 МБ.
    total_size = 0
    header = bytearray()
    try:
        with file_path.open("wb") as destination:
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                total_size += len(chunk)
                if len(header) < 16:
                    header.extend(chunk[: 16 - len(header)])
                if total_size > MAX_SIZE:
                    raise HTTPException(status_code=413, detail="Файл слишком большой. Максимум 100 МБ")
                destination.write(chunk)
        if not _has_valid_signature(extension, bytes(header)):
            raise HTTPException(status_code=415, detail="Содержимое файла не соответствует заявленному формату")
    except Exception:
        file_path.unlink(missing_ok=True)
        raise
    display_name = (file.filename or filename).replace("\x00", "").strip()[:MAX_DISPLAY_NAME_LENGTH]
    item = {"id": file_id, "filename": filename, "name": display_name or filename, "url": _public_url(filename), "type": "video" if extension in {".mp4", ".webm"} else "image"}
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


def _has_valid_signature(extension: str, header: bytes) -> bool:
    signatures = {
        ".jpg": header.startswith(b"\xff\xd8\xff"),
        ".png": header.startswith(b"\x89PNG\r\n\x1a\n"),
        ".webp": header.startswith(b"RIFF") and header[8:12] == b"WEBP",
        ".mp4": len(header) >= 8 and header[4:8] == b"ftyp",
        ".webm": header.startswith(b"\x1a\x45\xdf\xa3"),
    }
    return signatures.get(extension, False)


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
