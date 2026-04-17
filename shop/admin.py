from django.contrib import admin

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


class DeliveryInfoInline(admin.StackedInline):
    model = DeliveryInfo
    extra = 0
    readonly_fields = ["city_ref", "warehouse_ref", "tracking_number"]
    verbose_name = "Доставка"
    verbose_name_plural = "Інформація про доставку"


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product_size", "quantity", "price"]
    verbose_name = "Позиція"
    verbose_name_plural = "Позиції замовлення"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "status", "total_price", "created_at"]
    list_display_links = ["id", "user"]
    list_filter = ["status", "created_at"]
    search_fields = ["user__email"]
    readonly_fields = ["created_at", "updated_at", "total_price", "user"]
    inlines = [DeliveryInfoInline, OrderItemInline]
    date_hierarchy = "created_at"


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["id", "vendor", "model_name", "prod_type", "gender", "season", "full_price", "discount", "discounted_price"]
    list_display_links = ["id", "model_name"]
    list_filter = ["vendor", "prod_type", "gender", "season"]
    search_fields = ["model_name", "vendor__name"]
    readonly_fields = ["discounted_price"]
    inlines = [ProductSizeInline, ProductImageInline, ProductVideoInline]

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


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ["id", "user"]
    list_display_links = ["id", "user"]
    search_fields = ["user__email"]
    inlines = [WishlistItemInline]
