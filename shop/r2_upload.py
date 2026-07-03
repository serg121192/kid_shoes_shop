import os
import uuid
from typing import Any

import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from slugify import slugify as py_slugify

from shop.models import Product

CONTENT_TYPE_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

VIDEO_CONTENT_TYPE_EXT = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
}

ALLOWED_VIDEO_EXT = {".mp4", ".webm", ".mov", ".avi"}


def _r2_cfg(django_attr: str, env_name: str) -> str:
    return str(getattr(settings, django_attr, "") or os.getenv(env_name, "") or "")


def is_r2_direct_upload_enabled() -> bool:
    return bool(
        _r2_cfg("AWS_STORAGE_BUCKET_NAME", "R2_BUCKET_NAME")
        and _r2_cfg("AWS_S3_ENDPOINT_URL", "R2_ENDPOINT_URL")
        and _r2_cfg("AWS_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID")
        and _r2_cfg("AWS_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY")
    )


def _gallery_slug(product: Product) -> str:
    return py_slugify(f"{product.vendor.name} {product.model_name}")


def build_gallery_key(product: Product, content_type: str) -> str:
    ext = CONTENT_TYPE_EXT.get(content_type.lower(), ".jpg")
    slug = _gallery_slug(product)
    return f"products/gallery/{slug}-{uuid.uuid4()}{ext}"


def validate_gallery_key(key: str, product: Product) -> bool:
    if not key or ".." in key:
        return False
    if not key.startswith("products/gallery/"):
        return False
    slug = _gallery_slug(product)
    return key.startswith(f"products/gallery/{slug}-")


def video_ext(content_type: str, filename: str = "") -> str:
    ext = VIDEO_CONTENT_TYPE_EXT.get(content_type.lower())
    if ext:
        return ext
    if filename:
        import os

        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext in ALLOWED_VIDEO_EXT:
            return file_ext
    return ".mp4"


def build_video_key(
    product: Product, content_type: str, filename: str = ""
) -> str:
    ext = video_ext(content_type, filename)
    slug = _gallery_slug(product)
    return f"products/videos/{slug}-{uuid.uuid4()}{ext}"


def validate_video_key(key: str, product: Product) -> bool:
    if not key or ".." in key:
        return False
    if not key.startswith("products/videos/"):
        return False
    slug = _gallery_slug(product)
    return key.startswith(f"products/videos/{slug}-")


def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=_r2_cfg("AWS_S3_ENDPOINT_URL", "R2_ENDPOINT_URL"),
        aws_access_key_id=_r2_cfg("AWS_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID"),
        aws_secret_access_key=_r2_cfg("AWS_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY"),
        region_name=getattr(settings, "AWS_S3_REGION_NAME", "auto"),
    )


def presign_put_url(key: str, content_type: str, expires: int = 3600) -> str:
    client = get_r2_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": _r2_cfg("AWS_STORAGE_BUCKET_NAME", "R2_BUCKET_NAME"),
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires,
    )


def object_exists(key: str) -> bool:
    client = get_r2_client()
    try:
        client.head_object(
            Bucket=_r2_cfg("AWS_STORAGE_BUCKET_NAME", "R2_BUCKET_NAME"),
            Key=key,
        )
        return True
    except ClientError:
        return False


def public_url_for_key(key: str) -> str | None:
    domain = (
        getattr(settings, "AWS_S3_CUSTOM_DOMAIN", None)
        or os.getenv("R2_PUBLIC_DOMAIN", "")
    )
    if not domain:
        return None
    domain = str(domain).removeprefix("https://").removeprefix("http://")
    return f"https://{domain}/{key}"


def presign_gallery_uploads(
    product: Product, items: list[dict[str, Any]], expires: int = 3600
) -> list[dict[str, Any]]:
    uploads: list[dict[str, Any]] = []
    for item in items:
        content_type = item.get("content_type") or "image/jpeg"
        key = build_gallery_key(product, content_type)
        uploads.append(
            {
                "key": key,
                "upload_url": presign_put_url(key, content_type, expires=expires),
                "content_type": content_type,
                "public_url": public_url_for_key(key),
            }
        )
    return uploads


def presign_video_upload(
    product: Product,
    content_type: str,
    filename: str = "",
    expires: int = 7200,
) -> dict[str, Any]:
    ctype = content_type or "video/mp4"
    key = build_video_key(product, ctype, filename)
    return {
        "key": key,
        "upload_url": presign_put_url(key, ctype, expires=expires),
        "content_type": ctype,
        "public_url": public_url_for_key(key),
    }
