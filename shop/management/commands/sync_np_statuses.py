"""
Management command: sync_np_statuses
-------------------------------------
Автоматично оновлює статуси замовлень у системі на основі даних Нової Пошти.
Перевіряє всі активні замовлення з ТТН (статус: processing або completed).

Запуск вручну:
    python manage.py sync_np_statuses

Через Railway Cron (кожні 30 хв):
    python manage.py sync_np_statuses
"""

import logging

from django.core.management.base import BaseCommand

from shop.models import Order, DeliveryInfo
from shop.nova_poshta import get_tracking_status
from shop.emails import send_order_status_update

logger = logging.getLogger(__name__)

# Коди НП → статус у системі
RECEIVED_CODES = {"9"}                          # Вручено отримувачу
REFUSED_CODES  = {"10", "11", "14", "101", "102"}  # Відмова / повернення

# Замовлення в цих статусах мають активну доставку — їх потрібно відстежувати
TRACKABLE_STATUSES = [
    Order.StatusChoices.PROCESSING,
    Order.StatusChoices.COMPLETED,
]


class Command(BaseCommand):
    help = "Синхронізує статуси замовлень із Новою Поштою"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Показати що буде змінено, але не зберігати",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        orders = (
            Order.objects
            .filter(status__in=TRACKABLE_STATUSES)
            .select_related("delivery", "user")
            .exclude(delivery__tracking_number="")
            .exclude(delivery__tracking_number__isnull=True)
        )

        total = orders.count()
        updated = 0
        errors = 0

        self.stdout.write(f"Знайдено {total} замовлень для перевірки...")

        for order in orders:
            ttn = order.delivery.tracking_number
            try:
                np_data = get_tracking_status(ttn)
                if not np_data:
                    self.stdout.write(self.style.WARNING(
                        f"  Order #{order.id} TTN {ttn}: НП не відповіла"
                    ))
                    errors += 1
                    continue

                np_code = str(np_data.get("StatusCode", ""))
                np_status = np_data.get("Status", "")
                new_status = None

                if np_code in RECEIVED_CODES:
                    new_status = Order.StatusChoices.RECEIVED
                elif np_code in REFUSED_CODES:
                    new_status = Order.StatusChoices.REFUSED

                if new_status and order.status != new_status:
                    if dry_run:
                        self.stdout.write(
                            f"  [DRY RUN] Order #{order.id}: {order.status} → {new_status} "
                            f"(НП: {np_code} — {np_status})"
                        )
                    else:
                        order.status = new_status
                        order.save(update_fields=["status"])
                        send_order_status_update(order)
                        self.stdout.write(self.style.SUCCESS(
                            f"  ✓ Order #{order.id}: {order.status} (НП: {np_code} — {np_status})"
                        ))
                    updated += 1
                else:
                    self.stdout.write(
                        f"  Order #{order.id} TTN {ttn}: без змін (НП: {np_code})"
                    )

            except Exception as exc:
                logger.exception("sync_np_statuses: помилка для order #%s", order.id)
                self.stdout.write(self.style.ERROR(
                    f"  ✗ Order #{order.id}: {exc}"
                ))
                errors += 1

        mode = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{mode}Готово: {total} перевірено, {updated} оновлено, {errors} помилок"
            )
        )
