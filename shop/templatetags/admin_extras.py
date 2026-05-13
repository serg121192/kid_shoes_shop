from django import template

from shop.models import Order

register = template.Library()


@register.simple_tag
def pending_orders_count():
    try:
        return Order.objects.filter(status=Order.StatusChoices.PENDING).count()
    except Exception:
        return 0
