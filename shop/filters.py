import django_filters

from shop.models import Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="full_price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="full_price", lookup_expr="lte")
    has_discount = django_filters.BooleanFilter(
        field_name="discount", method="filter_has_discount"
    )
    has_price = django_filters.BooleanFilter(method="filter_has_price")
    is_published = django_filters.BooleanFilter(field_name="is_published")
    size = django_filters.NumberFilter(field_name="sizes__size", lookup_expr="exact", distinct=True)

    def filter_has_discount(self, queryset, name, value):
        if value:
            return queryset.filter(discount__gt=0)
        return queryset.filter(discount=0)

    def filter_has_price(self, queryset, name, value):
        if value:
            return queryset.filter(full_price__gt=0)
        return queryset.filter(full_price__lte=0)

    class Meta:
        model = Product
        fields = {
            "vendor": ["exact"],
            "prod_type": ["exact"],
            "gender": ["exact"],
            "season": ["exact"],
        }
