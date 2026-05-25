from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html

from shop.models import (
    Product,
    ProductSize,
    ProductImage,
    ProductVideo,
    Vendor,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Wishlist,
    WishlistItem,
    DeliveryInfo,
    Review,
)

admin.site.site_header = "TAK i TAK — Адміністрування"
admin.site.site_title = "TAK i TAK"
admin.site.index_title = "Панель управління"


class ProductSizeInline(admin.TabularInline):
    model = ProductSize
    extra = 1
    verbose_name = "Розмір"
    verbose_name_plural = "Розміри"


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ["image", "is_main", "order"]
    verbose_name = "Фото"
    verbose_name_plural = "Галерея фото"


class ProductVideoInline(admin.TabularInline):
    model = ProductVideo
    extra = 0
    fields = ["video", "title", "order"]
    verbose_name = "Відео"
    verbose_name_plural = "Відео товару"


class ReviewInline(admin.TabularInline):
    model = Review
    extra = 0
    readonly_fields = ["user", "rating", "text", "created_at"]
    verbose_name = "Відгук"
    verbose_name_plural = "Відгуки"
    can_delete = True


class DeliveryInfoInline(admin.StackedInline):
    model = DeliveryInfo
    extra = 0
    readonly_fields = ["city_ref", "warehouse_ref", "tracking_number"]
    verbose_name = "Доставка"
    verbose_name_plural = "Інформація про доставку"


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product_name_link", "quantity", "price"]
    can_delete = False
    show_change_link = False
    verbose_name = "Позиція"
    verbose_name_plural = "Позиції замовлення"

    @admin.display(description="Назва товару")
    def product_name_link(self, obj):
        product = obj.product_size.product
        url = reverse("admin:shop_product_change", args=[product.id])
        return format_html('<a href="{}">{}</a>', url, product)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "status",
        "colored_status",
        "total_price",
        "created_at",
    ]
    list_display_links = ["id", "user"]
    list_filter = ["status", "created_at"]
    search_fields = ["user__email"]
    readonly_fields = ["created_at", "updated_at", "total_price", "user"]
    inlines = [DeliveryInfoInline, OrderItemInline]
    date_hierarchy = "created_at"

    class Media:
        css = {"all": ("admin/css/orders.css",)}
        js = ("admin/js/orders.js",)

    _STATUS_STYLE = {
        Order.StatusChoices.PENDING:    ("#dc2626", "#fff1f2"),
        Order.StatusChoices.PROCESSING: ("#b45309", "#fffbeb"),
        Order.StatusChoices.COMPLETED:  ("#1d4ed8", "#eff6ff"),
        Order.StatusChoices.RECEIVED:   ("#059669", "#ecfdf5"),
        Order.StatusChoices.REFUSED:    ("#6b7280", "#f9fafb"),
        Order.StatusChoices.CANCELLED:  ("#9ca3af", "#f3f4f6"),
    }

    @admin.display(description="Статус", ordering="status")
    def colored_status(self, obj):
        text_color, bg_color = self._STATUS_STYLE.get(obj.status, ("#6b7280", "#f9fafb"))
        return format_html(
            '<span data-status="{}" style="display:inline-block;padding:2px 12px;'
            'border-radius:999px;background:{};color:{};font-size:12px;font-weight:700;">'
            "{}</span>",
            obj.status, bg_color, text_color, obj.get_status_display(),
        )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["id", "vendor", "model_name", "prod_type", "gender", "season", "full_price", "discount", "discounted_price"]
    list_display_links = ["id", "model_name"]
    list_filter = ["vendor", "prod_type", "gender", "season"]
    search_fields = ["model_name", "vendor__name"]
    readonly_fields = ["discounted_price"]
    inlines = [ProductSizeInline, ProductImageInline, ProductVideoInline, ReviewInline]

    @admin.display(description="Ціна зі знижкою (грн)")
    def discounted_price(self, obj):
        return obj.discounted_price


@admin.register(ProductSize)
class ProductSizeAdmin(admin.ModelAdmin):
    list_display = ["id", "product", "size", "quantity"]
    list_display_links = ["id", "product"]
    list_filter = ["size"]
    search_fields = ["product__model_name", "product__vendor__name"]


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["id", "name"]
    list_display_links = ["id", "name"]
    search_fields = ["name"]


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ["product_size", "quantity"]
    verbose_name = "Позиція"
    verbose_name_plural = "Позиції кошика"


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["id", "user"]
    list_display_links = ["id", "user"]
    search_fields = ["user__email"]
    inlines = [CartItemInline]


class WishlistItemInline(admin.TabularInline):
    model = WishlistItem
    extra = 0
    readonly_fields = ["product"]
    verbose_name = "Товар"
    verbose_name_plural = "Товари у списку"


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["id", "product", "user", "rating", "created_at"]
    list_display_links = ["id", "product"]
    list_filter = ["rating", "created_at"]
    search_fields = ["product__model_name", "user__email", "text"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ["id", "user"]
    list_display_links = ["id", "user"]
    search_fields = ["user__email"]
    inlines = [WishlistItemInline]


