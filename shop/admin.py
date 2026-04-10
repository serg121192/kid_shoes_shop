from django.contrib import admin

from shop.models import (
    Product,
    Vendor,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Wishlist,
    WishlistItem,
    DeliveryInfo,
)


class DeliveryInfoInline(admin.StackedInline):
    model = DeliveryInfo
    extra = 0
    readonly_fields = ["city_ref", "warehouse_ref", "tracking_number"]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product", "quantity", "price"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "status", "total_price", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["user__email"]
    readonly_fields = ["created_at", "updated_at", "total_price", "user"]
    inlines = [DeliveryInfoInline, OrderItemInline]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "id", "vendor", "model_name", "prod_type", 
        "size", "full_price", "discount", "quantity"
    ]
    list_filter = ["vendor", "prod_type", "gender", "season", "size"]
    search_fields = ["model_name", "vendor__name"]
    readonly_fields = ["discounted_price"]


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["id", "name"]
    search_fields = ["name"]


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ["product", "quantity"]


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["id", "user"]
    search_fields = ["user__email"]
    inlines = [CartItemInline]


class WishlistItemInline(admin.TabularInline):
    model = WishlistItem
    extra = 0
    readonly_fields = ["product"]


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ["id", "user"]
    search_fields = ["user__email"]
    inlines = [WishlistItemInline]
