from django.core import signing

VIDEO_UPLOAD_SALT = "product-video-upload"
VIDEO_UPLOAD_MAX_AGE = 7200


def make_video_upload_token(product_id: int) -> str:
    return signing.dumps({"pid": product_id}, salt=VIDEO_UPLOAD_SALT)


def verify_video_upload_token(token: str, product_id: int) -> bool:
    if not token:
        return False
    try:
        data = signing.loads(token, salt=VIDEO_UPLOAD_SALT, max_age=VIDEO_UPLOAD_MAX_AGE)
    except signing.BadSignature:
        return False
    return data.get("pid") == product_id
