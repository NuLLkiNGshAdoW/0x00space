"""Local and S3-compatible storage helpers for background media and its catalog."""
import logging
import uuid
from functools import lru_cache

from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)
CATALOG_KEY = ".background-catalog.json"


def object_storage_enabled() -> bool:
    return get_settings().BACKGROUND_STORAGE_BACKEND == "s3"


@lru_cache
def get_s3_client():
    import boto3

    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.BACKGROUND_S3_ENDPOINT_URL,
        aws_access_key_id=settings.BACKGROUND_S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.BACKGROUND_S3_SECRET_ACCESS_KEY,
        region_name=settings.BACKGROUND_S3_REGION,
    )


def read_catalog() -> bytes:
    settings = get_settings()
    try:
        response = get_s3_client().get_object(Bucket=settings.BACKGROUND_S3_BUCKET, Key=CATALOG_KEY)
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")
        if error_code in {"NoSuchKey", "404", "NotFound"}:
            raise FileNotFoundError(CATALOG_KEY) from exc
        raise
    return response["Body"].read()


def write_catalog(contents: bytes) -> None:
    settings = get_settings()
    get_s3_client().put_object(
        Bucket=settings.BACKGROUND_S3_BUCKET,
        Key=CATALOG_KEY,
        Body=contents,
        ContentType="application/json",
    )


def upload_object(filename: str, file_obj, content_type: str) -> None:
    settings = get_settings()
    get_s3_client().upload_fileobj(
        file_obj,
        settings.BACKGROUND_S3_BUCKET,
        filename,
        ExtraArgs={
            "ContentType": content_type,
            "CacheControl": "public, max-age=31536000, immutable",
        },
    )


def delete_object(filename: str) -> None:
    settings = get_settings()
    get_s3_client().delete_object(Bucket=settings.BACKGROUND_S3_BUCKET, Key=filename)


def check_object_storage() -> bool:
    settings = get_settings()
    client = get_s3_client()
    key = f".health/{uuid.uuid4().hex}"
    uploaded = False
    try:
        client.put_object(Bucket=settings.BACKGROUND_S3_BUCKET, Key=key, Body=b"health")
        uploaded = True
        response = client.get_object(Bucket=settings.BACKGROUND_S3_BUCKET, Key=key)
        if response["Body"].read() != b"health":
            return False
        return True
    except (BotoCoreError, ClientError):
        logger.exception("Background object storage health check failed")
        return False
    finally:
        if uploaded:
            try:
                client.delete_object(Bucket=settings.BACKGROUND_S3_BUCKET, Key=key)
            except (BotoCoreError, ClientError):
                logger.exception("Could not remove background storage health probe")
