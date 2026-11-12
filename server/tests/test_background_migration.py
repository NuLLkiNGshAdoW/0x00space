import io
import json

import pytest
from botocore.exceptions import ClientError

from app.config import get_settings
from app.services import background_storage
from scripts.migrate_backgrounds_to_s3 import apply_plan, build_plan


class FakeS3Client:
    def __init__(self):
        self.objects = {}
        self.upload_count = 0

    def head_object(self, Bucket, Key):
        if Key not in self.objects:
            raise ClientError({"Error": {"Code": "404"}}, "HeadObject")
        return {"ContentLength": len(self.objects[Key])}

    def upload_fileobj(self, file_obj, bucket, key, ExtraArgs):
        self.objects[key] = file_obj.read()
        self.upload_count += 1

    def get_object(self, Bucket, Key):
        if Key not in self.objects:
            raise ClientError({"Error": {"Code": "NoSuchKey"}}, "GetObject")
        return {"Body": io.BytesIO(self.objects[Key])}

    def put_object(self, Bucket, Key, Body, ContentType=None):
        self.objects[Key] = Body.read() if hasattr(Body, "read") else Body


def _create_local_catalog(tmp_path):
    filename = "a" * 32 + ".png"
    content = b"\x89PNG\r\n\x1a\nvalid-image"
    (tmp_path / filename).write_bytes(content)
    item = {
        "id": "background-1",
        "filename": filename,
        "name": "Forest",
        "url": f"/media/backgrounds/{filename}",
        "type": "image",
    }
    catalog = {"active": item, "items": [item], "settings": {"shade": 0.5}}
    metadata_file = tmp_path / "metadata.json"
    metadata_file.write_text(json.dumps(catalog), encoding="utf-8")
    return filename, content, metadata_file


def test_migration_plan_preserves_catalog_and_rewrites_public_urls(tmp_path):
    filename, content, metadata_file = _create_local_catalog(tmp_path)

    plan = build_plan(tmp_path, metadata_file, "https://media.example.test")
    migrated_catalog = json.loads(plan.catalog_contents)

    assert plan.transfers[0].filename == filename
    assert plan.transfers[0].size == len(content)
    assert migrated_catalog["items"][0]["url"] == f"https://media.example.test/{filename}"
    assert migrated_catalog["active"]["url"] == f"https://media.example.test/{filename}"
    assert migrated_catalog["settings"] == {"shade": 0.5}


def test_migration_plan_rejects_missing_local_files(tmp_path):
    metadata_file = tmp_path / "metadata.json"
    metadata_file.write_text(
        json.dumps({"active": None, "items": [{"filename": "b" * 32 + ".png"}]}),
        encoding="utf-8",
    )

    with pytest.raises(FileNotFoundError, match="missing or unsafe"):
        build_plan(tmp_path, metadata_file, "https://media.example.test")


def test_apply_migration_uploads_verifies_and_is_idempotent(monkeypatch, tmp_path):
    filename, content, metadata_file = _create_local_catalog(tmp_path)
    monkeypatch.setenv("BACKGROUND_STORAGE_BACKEND", "s3")
    monkeypatch.setenv("BACKGROUND_S3_ENDPOINT_URL", "https://account.r2.cloudflarestorage.com")
    monkeypatch.setenv("BACKGROUND_S3_BUCKET", "backgrounds")
    monkeypatch.setenv("BACKGROUND_S3_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setenv("BACKGROUND_S3_SECRET_ACCESS_KEY", "test-secret-key")
    monkeypatch.setenv("BACKGROUND_PUBLIC_BASE_URL", "https://media.example.test")
    get_settings.cache_clear()
    fake_client = FakeS3Client()
    monkeypatch.setattr(background_storage, "get_s3_client", lambda: fake_client)
    plan = build_plan(tmp_path, metadata_file, "https://media.example.test")

    try:
        apply_plan(plan, "backgrounds")
        apply_plan(plan, "backgrounds")

        assert fake_client.upload_count == 1
        assert fake_client.objects[filename] == content
        assert fake_client.objects[background_storage.CATALOG_KEY] == plan.catalog_contents
    finally:
        get_settings.cache_clear()


def test_apply_migration_refuses_to_replace_a_different_catalog(monkeypatch, tmp_path):
    _, _, metadata_file = _create_local_catalog(tmp_path)
    monkeypatch.setenv("BACKGROUND_STORAGE_BACKEND", "s3")
    monkeypatch.setenv("BACKGROUND_S3_ENDPOINT_URL", "https://account.r2.cloudflarestorage.com")
    monkeypatch.setenv("BACKGROUND_S3_BUCKET", "backgrounds")
    monkeypatch.setenv("BACKGROUND_S3_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setenv("BACKGROUND_S3_SECRET_ACCESS_KEY", "test-secret-key")
    monkeypatch.setenv("BACKGROUND_PUBLIC_BASE_URL", "https://media.example.test")
    get_settings.cache_clear()
    fake_client = FakeS3Client()
    fake_client.objects[background_storage.CATALOG_KEY] = b'{"active":null,"items":[]}'
    monkeypatch.setattr(background_storage, "get_s3_client", lambda: fake_client)
    plan = build_plan(tmp_path, metadata_file, "https://media.example.test")

    try:
        with pytest.raises(RuntimeError, match="different background catalog"):
            apply_plan(plan, "backgrounds")
        assert fake_client.upload_count == 0
    finally:
        get_settings.cache_clear()
