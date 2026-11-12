"""Shared validation helpers for uploaded background media."""
import re

CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
}
MAX_BACKGROUND_SIZE = 100 * 1024 * 1024
FILE_NAME_RE = re.compile(r"^[a-f0-9]{32}\.(jpg|png|webp|mp4|webm)$")


def has_valid_signature(extension: str, header: bytes) -> bool:
    signatures = {
        ".jpg": header.startswith(b"\xff\xd8\xff"),
        ".png": header.startswith(b"\x89PNG\r\n\x1a\n"),
        ".webp": header.startswith(b"RIFF") and header[8:12] == b"WEBP",
        ".mp4": len(header) >= 8 and header[4:8] == b"ftyp",
        ".webm": header.startswith(b"\x1a\x45\xdf\xa3"),
    }
    return signatures.get(extension, False)
