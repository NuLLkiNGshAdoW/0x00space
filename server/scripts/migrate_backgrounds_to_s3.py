"""Safely copy the local background catalog and files to S3-compatible storage."""
import argparse
import hashlib
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from botocore.exceptions import ClientError

from app.config import get_settings
from app.services.background_files import (
    CONTENT_TYPES,
    FILE_NAME_RE,
    MAX_BACKGROUND_SIZE,
    has_valid_signature,
)
from app.services import background_storage


@dataclass(frozen=True)
class Transfer:
    filename: str
    path: Path
    size: int
    sha256: str
    content_type: str


@dataclass(frozen=True)
class MigrationPlan:
    upload_dir: Path
    metadata_file: Path
    original_metadata: bytes
    catalog_contents: bytes
    transfers: tuple[Transfer, ...]


def _filename_for_item(item: dict) -> str:
    filename = item.get("filename")
    if not filename:
        filename = Path(urlparse(item.get("url", "")).path).name
    if not isinstance(filename, str) or not FILE_NAME_RE.fullmatch(filename):
        raise ValueError(f"Background catalog contains an invalid filename: {filename!r}")
    return filename


def _hash_file(path: Path) -> tuple[int, str]:
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as source:
        header = source.read(16)
        digest.update(header)
        size = len(header)
        while chunk := source.read(1024 * 1024):
            size += len(chunk)
            digest.update(chunk)
    if size > MAX_BACKGROUND_SIZE:
        raise ValueError(f"Background file exceeds the 100 MiB limit: {path.name}")
    if not has_valid_signature(path.suffix.lower(), header):
        raise ValueError(f"Background file signature is invalid: {path.name}")
    return size, digest.hexdigest()


def build_plan(upload_dir: Path, metadata_file: Path, public_base_url: str) -> MigrationPlan:
    upload_dir = upload_dir.resolve()
    metadata_file = metadata_file.resolve()
    original_metadata = metadata_file.read_bytes()
    catalog = json.loads(original_metadata)
    if not isinstance(catalog, dict) or not isinstance(catalog.get("items", []), list):
        raise ValueError("Background metadata must be a JSON object with an items array.")

    transfers = {}
    updated_items = []
    for item in catalog.get("items", []):
        if not isinstance(item, dict):
            raise ValueError("Background catalog items must be JSON objects.")
        filename = _filename_for_item(item)
        source_path = (upload_dir / filename).resolve()
        if source_path.parent != upload_dir or not source_path.is_file():
            raise FileNotFoundError(f"Local background file is missing or unsafe: {filename}")
        size, digest = _hash_file(source_path)
        transfer = Transfer(
            filename=filename,
            path=source_path,
            size=size,
            sha256=digest,
            content_type=CONTENT_TYPES[source_path.suffix.lower()],
        )
        transfers[filename] = transfer
        updated_item = {**item, "filename": filename, "url": f"{public_base_url.rstrip('/')}/{filename}"}
        updated_items.append(updated_item)

    active = catalog.get("active")
    active_id = active.get("id") if isinstance(active, dict) else None
    catalog["items"] = updated_items
    catalog["active"] = next((item for item in updated_items if item.get("id") == active_id), None)
    catalog_contents = json.dumps(catalog, ensure_ascii=False, indent=2).encode("utf-8")
    return MigrationPlan(
        upload_dir=upload_dir,
        metadata_file=metadata_file,
        original_metadata=original_metadata,
        catalog_contents=catalog_contents,
        transfers=tuple(transfers.values()),
    )


def _is_missing_object(error: ClientError) -> bool:
    return error.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}


def _remote_sha256(client, bucket: str, filename: str) -> str:
    response = client.get_object(Bucket=bucket, Key=filename)
    body = response["Body"]
    digest = hashlib.sha256()
    try:
        while chunk := body.read(1024 * 1024):
            digest.update(chunk)
    finally:
        body.close()
    return digest.hexdigest()


def apply_plan(plan: MigrationPlan, bucket: str) -> None:
    if plan.metadata_file.read_bytes() != plan.original_metadata:
        raise RuntimeError("Local background catalog changed after planning; create a new plan.")

    try:
        existing_catalog = background_storage.read_catalog()
    except FileNotFoundError:
        existing_catalog = None
    if existing_catalog is not None and existing_catalog != plan.catalog_contents:
        raise RuntimeError(
            "The destination bucket already has a different background catalog; "
            "no files were uploaded."
        )

    client = background_storage.get_s3_client()
    for transfer in plan.transfers:
        try:
            response = client.head_object(Bucket=bucket, Key=transfer.filename)
        except ClientError as exc:
            if not _is_missing_object(exc):
                raise
            with transfer.path.open("rb") as source:
                background_storage.upload_object(transfer.filename, source, transfer.content_type)
            response = client.head_object(Bucket=bucket, Key=transfer.filename)

        if response.get("ContentLength") != transfer.size:
            raise RuntimeError(f"Uploaded file size does not match the source: {transfer.filename}")
        if _remote_sha256(client, bucket, transfer.filename) != transfer.sha256:
            raise RuntimeError(f"Uploaded file checksum does not match the source: {transfer.filename}")

    if plan.metadata_file.read_bytes() != plan.original_metadata:
        raise RuntimeError("Local background catalog changed during transfer; destination catalog was not updated.")

    if existing_catalog is None:
        background_storage.write_catalog(plan.catalog_contents)
    if background_storage.read_catalog() != plan.catalog_contents:
        raise RuntimeError("Destination catalog verification failed.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Upload files and publish the catalog; without this flag only print a dry-run plan.",
    )
    arguments = parser.parse_args()

    os.chdir(SERVER_ROOT)
    settings = get_settings()
    if settings.BACKGROUND_STORAGE_BACKEND != "s3":
        parser.error("Set BACKGROUND_STORAGE_BACKEND=s3 and configure its credentials before running.")

    upload_dir = Path(settings.BACKGROUND_UPLOAD_DIR)
    if not upload_dir.is_absolute():
        upload_dir = SERVER_ROOT / upload_dir
    metadata_file = upload_dir / "metadata.json"
    plan = build_plan(upload_dir, metadata_file, settings.BACKGROUND_PUBLIC_BASE_URL)
    total_size = sum(item.size for item in plan.transfers)
    print(f"Local files: {len(plan.transfers)} ({total_size / (1024 * 1024):.1f} MiB)")
    print(f"Destination catalog key: {background_storage.CATALOG_KEY}")
    if not arguments.apply:
        print("Dry run only. Re-run with --apply to upload and verify the data.")
        return 0

    apply_plan(plan, settings.BACKGROUND_S3_BUCKET)
    print("Background files and catalog were uploaded and verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
