"""API для публичного активного фона и защищённого управления им."""
import json
import tempfile
import uuid
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.database import get_db
from app.services.admin_auth import authenticate
from app.config import get_settings
from app.services.background_files import (
    CONTENT_TYPES,
    FILE_NAME_RE,
    MAX_BACKGROUND_SIZE,
    has_valid_signature,
)
from app.services import background_storage
from app import schemas

router = APIRouter(prefix="/backgrounds", tags=["backgrounds"])
ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = Path(get_settings().BACKGROUND_UPLOAD_DIR)
if not UPLOAD_DIR.is_absolute():
    UPLOAD_DIR = ROOT / UPLOAD_DIR
META_FILE = UPLOAD_DIR / "metadata.json"
ALLOWED = {content_type: extension for extension, content_type in CONTENT_TYPES.items()}
MAX_SIZE = MAX_BACKGROUND_SIZE
UPLOAD_CHUNK_SIZE = 1024 * 1024
MAX_DISPLAY_NAME_LENGTH = 255
DEFAULT_SETTINGS = {"shade": 0.68, "blur": 0, "position": "center", "speed": 1, "rotation_minutes": 0}


def _read_meta():
    if background_storage.object_storage_enabled():
        try:
            return json.loads(background_storage.read_catalog())
        except FileNotFoundError:
            return {"active": None, "items": [], "settings": DEFAULT_SETTINGS.copy()}
    if not META_FILE.exists():
        return {"active": None, "items": [], "settings": DEFAULT_SETTINGS.copy()}
    try:
        return json.loads(META_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"active": None, "items": [], "settings": DEFAULT_SETTINGS.copy()}


def _write_meta(data):
    if background_storage.object_storage_enabled():
        background_storage.write_catalog(json.dumps(data, ensure_ascii=False).encode("utf-8"))
        return
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


def _item_filename(item: dict) -> str | None:
    filename = item.get("filename")
    if filename:
        return filename
    url = item.get("url", "")
    return Path(urlparse(url).path).name or None


def _item_has_file(item: dict) -> bool:
    """Check local availability without allowing metadata to escape the upload root."""
    if background_storage.object_storage_enabled():
        filename = _item_filename(item)
        return bool(filename and FILE_NAME_RE.fullmatch(filename))
    if get_settings().BACKGROUND_PUBLIC_BASE_URL:
        # An explicitly configured public base may point at an external store.
        return True
    filename = _item_filename(item)
    if not filename:
        return False
    try:
        return _safe_file_path(filename).is_file()
    except HTTPException:
        return False


def _available_items(data: dict) -> list[dict]:
    return [item for item in data.get("items", []) if _item_has_file(item)]


def _check_admin(request: Request, db: Session):
    return authenticate(request, db)


@router.get("")
def get_backgrounds():
    data = _read_meta()
    items = _available_items(data)
    active_id = (data.get("active") or {}).get("id")
    active = next((item for item in items if item.get("id") == active_id), None)
    return {"active": active, "items": items, "settings": {**DEFAULT_SETTINGS, **data.get("settings", {})}}


@router.put("/settings", response_model=schemas.BackgroundSettings)
def update_settings(
    payload: schemas.BackgroundSettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    _check_admin(request, db)
    data = _read_meta()
    settings = {**DEFAULT_SETTINGS, **data.get("settings", {})}
    settings.update(payload.model_dump(exclude_unset=True))
    validated = schemas.BackgroundSettings.model_validate(settings)
    data["settings"] = validated.model_dump()
    _write_meta(data)
    return validated


@router.post("/reset")
def reset_background(request: Request, db: Session = Depends(get_db)):
    _check_admin(request, db)
    data = _read_meta()
    data["active"] = None
    _write_meta(data)
    return {"active": None}


@router.post("/upload", status_code=201)
async def upload_background(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    _check_admin(request, db)
    extension = ALLOWED.get(file.content_type or "")
    if not extension:
        raise HTTPException(status_code=415, detail="Разрешены JPG, PNG, WebP, MP4 и WebM")

    file_id = uuid.uuid4().hex
    filename = f"{file_id}{extension}"
    total_size = 0
    header = bytearray()
    use_object_storage = background_storage.object_storage_enabled()
    file_path = None if use_object_storage else _safe_file_path(filename)
    if file_path is not None:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    # Keep uploads bounded in memory even when the object store is enabled.
    temporary_file = tempfile.SpooledTemporaryFile(max_size=UPLOAD_CHUNK_SIZE)
    try:
        while chunk := await file.read(UPLOAD_CHUNK_SIZE):
            total_size += len(chunk)
            if len(header) < 16:
                header.extend(chunk[: 16 - len(header)])
            if total_size > MAX_SIZE:
                raise HTTPException(status_code=413, detail="Файл слишком большой. Максимум 100 МБ")
            temporary_file.write(chunk)
        if not has_valid_signature(extension, bytes(header)):
            raise HTTPException(status_code=415, detail="Содержимое файла не соответствует заявленному формату")
        temporary_file.seek(0)
        if use_object_storage:
            await run_in_threadpool(background_storage.upload_object, filename, temporary_file, file.content_type)
        else:
            with file_path.open("wb") as destination:
                while chunk := temporary_file.read(UPLOAD_CHUNK_SIZE):
                    destination.write(chunk)
    except Exception:
        temporary_file.close()
        if file_path is not None:
            file_path.unlink(missing_ok=True)
        raise
    temporary_file.close()
    try:
        display_name = (file.filename or filename).replace("\x00", "").strip()[:MAX_DISPLAY_NAME_LENGTH]
        item = {"id": file_id, "filename": filename, "name": display_name or filename, "url": _public_url(filename), "type": "video" if extension in {".mp4", ".webm"} else "image"}
        data = await run_in_threadpool(_read_meta) if use_object_storage else _read_meta()
        data["items"] = [*data.get("items", []), item]
        # Новая загрузка сразу становится глобальным активным фоном. Раньше
        # preview был виден только в окне админки, потому что старый active
        # оставался включённым для всех остальных клиентов.
        data["active"] = item
        if use_object_storage:
            await run_in_threadpool(_write_meta, data)
        else:
            _write_meta(data)
    except Exception:
        if use_object_storage:
            await run_in_threadpool(background_storage.delete_object, filename)
        else:
            file_path.unlink(missing_ok=True)
        raise
    return item


@router.post("/{background_id}/activate")
def activate_background(background_id: str, request: Request, db: Session = Depends(get_db)):
    _check_admin(request, db)
    data = _read_meta()
    item = next((entry for entry in data.get("items", []) if entry["id"] == background_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Фон не найден")
    if not _item_has_file(item):
        raise HTTPException(status_code=409, detail="Файл фона недоступен; загрузите его снова")
    data["active"] = item
    _write_meta(data)
    return item


@router.delete("/{background_id}")
def delete_background(background_id: str, request: Request, db: Session = Depends(get_db)):
    _check_admin(request, db)
    data = _read_meta()
    item = next((entry for entry in data.get("items", []) if entry["id"] == background_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Фон не найден")
    filename = _item_filename(item)
    if filename:
        # A valid but already-missing file is fine; an invalid metadata path is
        # still rejected so corruption cannot weaken traversal protection.
        if background_storage.object_storage_enabled():
            if not FILE_NAME_RE.fullmatch(filename):
                raise HTTPException(status_code=400, detail="Недопустимое имя файла")
            background_storage.delete_object(filename)
        else:
            _safe_file_path(filename).unlink(missing_ok=True)
    data["items"] = [entry for entry in data["items"] if entry["id"] != background_id]
    if data.get("active", {}).get("id") == background_id:
        remaining = _available_items(data)
        data["active"] = remaining[0] if remaining else None
    _write_meta(data)
    return {"ok": True}
