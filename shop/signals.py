import logging

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from shop.models import Order

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Order)
def _cache_old_status(sender, instance, **kwargs):
    """Запам'ятовує попередній статус перед збереженням."""
    try:
        instance._old_status = Order.objects.get(pk=instance.pk).status
    except Order.DoesNotExist:
        instance._old_status = None


@receiver(post_save, sender=Order)
def _create_ttn_on_processing(sender, instance, created, **kwargs):
    """
    Автоматично формує ТТН при переході замовлення у статус 'В обробці'.
    Спрацьовує незалежно від того, звідки змінено статус
    (Django Admin, API, shell тощо).
    """
    old_status = getattr(instance, "_old_status", None)
    just_moved_to_processing = (
        not created
        and old_status != Order.StatusChoices.PROCESSING
        and instance.status == Order.StatusChoices.PROCESSING
    )
    if not just_moved_to_processing:
        return

    delivery = getattr(instance, "delivery", None)
    if not delivery:
        logger.warning("Order #%s: немає DeliveryInfo, ТТН не створено", instance.pk)
        return
    if not delivery.warehouse_ref:
        logger.warning("Order #%s: warehouse_ref порожній, ТТН не створено", instance.pk)
        return
    if delivery.tracking_number:
        return  # ТТН вже є

    try:
        from shop.nova_poshta import create_ttn
        ttn = create_ttn(delivery)
        if ttn:
            delivery.tracking_number = ttn
            delivery.save(update_fields=["tracking_number"])
            logger.info("Order #%s: ТТН %s успішно створено", instance.pk, ttn)
        else:
            logger.error("Order #%s: Nova Poshta не повернула ТТН", instance.pk)
    except Exception:
        logger.exception("Order #%s: помилка при створенні ТТН", instance.pk)


@receiver(post_save, sender=Order)
def _delete_ttn_on_cancel(sender, instance, created, **kwargs):
    """
    Автоматично скасовує ТТН у НП при переведенні замовлення у статус 'Скасовано'.
    Спрацьовує незалежно від того, звідки змінено статус.
    """
    old_status = getattr(instance, "_old_status", None)
    just_cancelled = (
        not created
        and old_status != Order.StatusChoices.CANCELLED
        and instance.status == Order.StatusChoices.CANCELLED
    )
    if not just_cancelled:
        return

    delivery = getattr(instance, "delivery", None)
    if not delivery or not delivery.tracking_number:
        return

    try:
        from shop.nova_poshta import delete_ttn
        deleted = delete_ttn(delivery.tracking_number)
        if deleted:
            delivery.tracking_number = ""
            delivery.save(update_fields=["tracking_number"])
            logger.info("Order #%s: ТТН видалено з НП після скасування", instance.pk)
    except Exception:
        logger.exception("Order #%s: помилка при видаленні ТТН з НП", instance.pk)
