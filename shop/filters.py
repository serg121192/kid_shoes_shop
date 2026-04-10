import django_filters

from shop.models import Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(
        field_name="full_price", lookup_expr="gte"
    )
    max_price = django_filters.NumberFilter(
        field_name="full_price", lookup_expr="lte"
    )
    has_discount = django_filters.BooleanFilter(
        field_name="discount", method="filter_has_discount"
    )

    def filter_has_discount(self, queryset, name, value):
        if value:
            return queryset.filter(discount__gt=0)
        return queryset.filter(discount=0)

    class Meta:
        model = Product
        fields = {
            "vendor": ["exact"],
            "prod_type": ["exact"],
            "gender": ["exact"],
            "season": ["exact"],
            "size": ["exact"],
        }
