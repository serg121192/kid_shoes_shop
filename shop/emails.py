"""
Email notifications for orders.

Functions:
  send_order_confirmation  — to customer after order is placed
  send_order_status_update — to customer when manager changes order status
  send_new_order_alert     — to manager when a new order arrives
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

# ── Helpers ────────────────────────────────────────────────────────────────────

STATUS_LABELS = {
    "pending":    "Очікує підтвердження",
    "processing": "В обробці",
    "completed":  "Виконано (передано в НП)",
    "received":   "Отримано покупцем",
    "refused":    "Відмова",
    "cancelled":  "Скасовано",
}

DELIVERY_LABELS = {
    "np_warehouse": "Нова Пошта: відділення",
    "np_postamat":  "Нова Пошта: поштомат",
    "np_address":   "Нова Пошта: адресна доставка",
    "pickup":       "Самовивіз з магазину",
}

STORE_ADDRESS = (
    'м. Чернігів, проспект Левка Лук\'яненка 78, '
    '2-й поверх (поряд з ТРЦ "Hollywood")'
)


def _delivery_lines(delivery) -> str:
    dtype = delivery.delivery_type
    label = DELIVERY_LABELS.get(dtype, dtype)

    if dtype == "pickup":
        return f"<b>Спосіб отримання:</b> {label}<br>{STORE_ADDRESS}"

    parts = [f"<b>Доставка:</b> {label}"]
    if delivery.city_name:
        parts.append(f"<b>Місто:</b> {delivery.city_name}")
    if delivery.warehouse_address:
        parts.append(f"<b>Відділення:</b> {delivery.warehouse_address}")
    if delivery.street:
        addr = delivery.street
        if delivery.building_number:
            addr += f", буд. {delivery.building_number}"
        if delivery.apartment:
            addr += f", кв. {delivery.apartment}"
        parts.append(f"<b>Адреса:</b> {addr}")
    if delivery.tracking_number:
        parts.append(f"<b>ТТН:</b> {delivery.tracking_number}")
    return "<br>".join(parts)


def _items_table(order) -> str:
    rows = ""
    for item in order.items.select_related("product_size__product__vendor").all():
        product = item.product_size.product
        vendor = product.vendor.name if product.vendor else "—"
        size = item.product_size.size
        rows += (
            f"<tr>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee'>{vendor} {product.model_name}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:center'>{size}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:center'>{item.quantity}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:right'>{item.price} грн</td>"
            f"</tr>"
        )
    return f"""
    <table style='width:100%;border-collapse:collapse;margin-top:12px'>
      <thead>
        <tr style='background:#f0fdfa'>
          <th style='padding:8px 10px;text-align:left;border-bottom:2px solid #2dd4bf'>Товар</th>
          <th style='padding:8px 10px;text-align:center;border-bottom:2px solid #2dd4bf'>Розмір</th>
          <th style='padding:8px 10px;text-align:center;border-bottom:2px solid #2dd4bf'>Кіл-ть</th>
          <th style='padding:8px 10px;text-align:right;border-bottom:2px solid #2dd4bf'>Ціна</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
    """


def _base_html(title: str, body: str) -> str:
    site_url = settings.FRONTEND_URL.rstrip("/")
    return f"""<!DOCTYPE html>
<html lang="uk">
<head><meta charset="utf-8"><title>{title}</title></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#0d9488;padding:20px 30px">
      <h1 style="margin:0;color:#fff;font-size:22px">👟 ТАК і ТАК</h1>
      <p style="margin:4px 0 0;color:#ccfbf1;font-size:13px">Магазин дитячого взуття</p>
    </div>
    <div style="padding:24px 30px">
      {body}
    </div>
    <div style="padding:14px 30px;background:#f0fdfa;text-align:center;font-size:12px;color:#6b7280">
      ТАК і ТАК · <a href="{site_url}" style="color:#0d9488">{site_url.replace("https://", "")}</a>
    </div>
  </div>
</body>
</html>"""


def _send(subject: str, message: str, html_message: str, recipients: list[str]) -> None:
    if not recipients:
        return
    try:
        sent = send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            html_message=html_message,
            fail_silently=False,
        )
        if sent:
            logger.info("Email sent: %s → %s", subject, ", ".join(recipients))
        else:
            logger.warning("Email not sent (send_mail returned 0): %s → %s", subject, recipients)
    except Exception:
        logger.exception("Email failed: %s → %s", subject, ", ".join(recipients))


# ── Public API ─────────────────────────────────────────────────────────────────

def send_order_confirmation(order) -> None:
    """Send booking confirmation email to the customer."""
    customer_email = order.user.email
    if not customer_email:
        logger.warning("Order #%s: no customer email, skip confirmation", order.pk)
        return

    delivery = getattr(order, "delivery", None)
    delivery_block = _delivery_lines(delivery) if delivery else ""

    body = f"""
    <h2 style="color:#0d9488;margin-top:0">Ваше бронювання прийнято!</h2>
    <p>Дякуємо за замовлення, <b>{order.user.get_full_name() or order.user.email}</b>!</p>
    <p>Ми зв'яжемося з вами для підтвердження.</p>

    <p style="margin-top:16px">
      <b>Замовлення № {order.id}</b><br>
      {delivery_block}
    </p>

    {_items_table(order)}

    <p style="margin-top:16px;font-size:15px">
      <b>До сплати: {order.total_price} грн</b>
    </p>

    <p style="color:#6b7280;font-size:13px;margin-top:20px">
      Слідкуйте за статусом на сайті —
      <a href="{settings.FRONTEND_URL}/orders/{order.id}" style="color:#0d9488">переглянути замовлення</a>
    </p>
    """

    _send(
        subject=f"Замовлення № {order.id} — ТАК і ТАК",
        message=f"Замовлення № {order.id} прийнято. Деталі: {settings.FRONTEND_URL}/orders/{order.id}",
        html_message=_base_html(f"Замовлення № {order.id}", body),
        recipients=[customer_email],
    )


def send_order_status_update(order) -> None:
    """Notify customer about order status change."""
    customer_email = order.user.email
    if not customer_email:
        return

    status_label = STATUS_LABELS.get(order.status, order.status)
    delivery = getattr(order, "delivery", None)
    tracking_block = ""
    if delivery and delivery.tracking_number:
        tracking_block = f"""
        <p style="background:#f0fdfa;border-left:4px solid #0d9488;padding:10px 16px;border-radius:4px">
          <b>Номер відстеження НП:</b> {delivery.tracking_number}
        </p>
        """

    body = f"""
    <h2 style="color:#0d9488;margin-top:0">Статус вашого замовлення змінився</h2>
    <p>Замовлення <b>№ {order.id}</b></p>

    <p style="font-size:16px">
      Новий статус: <b style="color:#0d9488">{status_label}</b>
    </p>

    {tracking_block}

    <p>
      <a href="{settings.FRONTEND_URL}/orders/{order.id}" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
        Переглянути замовлення
      </a>
    </p>

    <p style="color:#6b7280;font-size:13px;margin-top:20px">
      Якщо у вас є питання — зателефонуйте нам або напишіть у чат.
    </p>
    """

    _send(
        subject=f"Замовлення № {order.id}: {status_label}",
        message=f"Статус замовлення № {order.id} змінено на «{status_label}». {settings.FRONTEND_URL}/orders/{order.id}",
        html_message=_base_html(f"Статус замовлення № {order.id}", body),
        recipients=[customer_email],
    )


def send_new_order_alert(order) -> None:
    """Notify the manager about a newly placed order."""
    manager_email = getattr(settings, "MANAGER_EMAIL", "")
    if not manager_email:
        logger.warning("MANAGER_EMAIL not set — skip manager alert for order #%s", order.pk)
        return

    delivery = getattr(order, "delivery", None)
    delivery_block = _delivery_lines(delivery) if delivery else ""
    customer = order.user

    body = f"""
    <h2 style="color:#0d9488;margin-top:0">Нове замовлення № {order.id}!</h2>
    <p>
      <b>Покупець:</b> {customer.get_full_name() or "—"}<br>
      <b>Email:</b> {customer.email}<br>
      {delivery_block}
    </p>

    {_items_table(order)}

    <p style="margin-top:16px;font-size:15px">
      <b>Сума: {order.total_price} грн</b>
    </p>

    <p>
      <a href="{settings.FRONTEND_URL}/manager/orders"
         style="display:inline-block;background:#0d9488;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
        Відкрити панель менеджера
      </a>
    </p>
    """

    _send(
        subject=f"[ТАК і ТАК] Нове замовлення № {order.id}",
        message=f"Нове замовлення № {order.id} від {customer.email}. Сума: {order.total_price} грн.",
        html_message=_base_html(f"Нове замовлення № {order.id}", body),
        recipients=[manager_email],
    )
