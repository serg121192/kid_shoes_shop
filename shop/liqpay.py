import base64
import hashlib
import json
from django.conf import settings


def _sign(data_str: str) -> str:
    raw = settings.LIQPAY_PRIVATE_KEY + data_str + settings.LIQPAY_PRIVATE_KEY
    return base64.b64encode(hashlib.sha1(raw.encode()).digest()).decode()


def build_payment_params(order_id: int, amount: float, description: str) -> dict:
    payload = {
        "version":    3,
        "public_key": settings.LIQPAY_PUBLIC_KEY,
        "action":     "pay",
        "amount":     round(amount, 2),
        "currency":   "UAH",
        "description": description,
        "order_id":   f"order_{order_id}",
        "result_url": f"{settings.FRONTEND_URL}/orders/{order_id}",
        "server_url": f"{settings.BACKEND_URL}/api/shop/liqpay/callback/",
        "sandbox":    1,
    }
    data = base64.b64encode(json.dumps(payload).encode()).decode()
    return {"data": data, "signature": _sign(data)}


def verify_callback(data: str, signature: str) -> dict | None:
    if _sign(data) != signature:
        return None
    try:
        return json.loads(base64.b64decode(data).decode())
    except Exception:
        return None
