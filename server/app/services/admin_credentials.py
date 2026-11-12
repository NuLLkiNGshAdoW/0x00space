"""Username normalization and password hashing for administrator accounts."""
import base64
import binascii
import hashlib
import re
import secrets
import hmac

USERNAME_RE = re.compile(r"^[a-z0-9._-]{3,64}$")
PASSWORD_SCHEME = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 600_000
PASSWORD_MIN_LENGTH = 12
PASSWORD_MAX_LENGTH = 256
PASSWORD_SALT_BYTES = 16
PASSWORD_HASH_BYTES = 32


def normalize_username(value: str) -> str:
    username = value.strip().lower()
    if not USERNAME_RE.fullmatch(username):
        raise ValueError("Username must be 3-64 characters: letters, digits, '.', '_' or '-'")
    return username


def hash_password(password: str) -> str:
    if not PASSWORD_MIN_LENGTH <= len(password) <= PASSWORD_MAX_LENGTH:
        raise ValueError(f"Password must be {PASSWORD_MIN_LENGTH}-{PASSWORD_MAX_LENGTH} characters")
    salt = secrets.token_bytes(PASSWORD_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS, dklen=PASSWORD_HASH_BYTES
    )
    salt_text = base64.urlsafe_b64encode(salt).decode("ascii").rstrip("=")
    digest_text = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return f"{PASSWORD_SCHEME}${PASSWORD_ITERATIONS}${salt_text}${digest_text}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        scheme, iterations_text, salt_text, digest_text = stored_hash.split("$")
        iterations = int(iterations_text)
        if scheme != PASSWORD_SCHEME or iterations != PASSWORD_ITERATIONS:
            return False
        salt = base64.urlsafe_b64decode(salt_text + "=" * (-len(salt_text) % 4))
        expected = base64.urlsafe_b64decode(digest_text + "=" * (-len(digest_text) % 4))
    except (ValueError, binascii.Error):
        return False
    if len(salt) != PASSWORD_SALT_BYTES or len(expected) != PASSWORD_HASH_BYTES:
        return False
    actual = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations, dklen=PASSWORD_HASH_BYTES
    )
    return hmac.compare_digest(actual, expected)


DUMMY_PASSWORD_HASH = hash_password("constant-time placeholder")
