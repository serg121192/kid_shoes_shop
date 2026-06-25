import re

from rest_framework import serializers
from django.core.validators import MinValueValidator

from django.db.models import Avg

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

# ── Product ────────────────────────────────────────────────────────────────────


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "is_main", "order"]


class ProductVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVideo
        fields = ["id", "video", "title", "order"]


class ProductSizeListSerializer(serializers.ModelSerializer):
    """Lightweight size serializer used in catalog cards and wishlist."""

    class Meta:
        model = ProductSize
        fields = ["id", "size", "quantity"]


class ProductSizeRetrieveSerializer(serializers.ModelSerializer):
    """Size serializer for product detail — includes per-size in_cart flag."""

    in_cart = serializers.SerializerMethodField()

    class Meta:
        model = ProductSize
        fields = ["id", "size", "quantity", "in_cart"]

    def get_in_cart(self, obj):
        user = self.context["request"].user
        if user.is_authenticated:
            return CartItem.objects.filter(
                cart__user=user, product_size=obj
            ).exists()
        return False


class ProductSerializer(serializers.ModelSerializer):
    discounted_price = serializers.DecimalField(
        read_only=True, max_digits=10, decimal_places=2
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "prod_type",
            "gender",
            "season",
            "full_price",
            "discount",
            "discounted_price",
            "description",
            "seo_description",
            "seo_title",
            "seo_h1",
            "slug",
        ]


class ProductListSerializer(serializers.ModelSerializer):
    vendor = serializers.SlugRelatedField(
        many=False, read_only=True, slug_field="name"
    )
    exists = serializers.CharField(source="quantity_message", read_only=True)
    full_price = serializers.DecimalField(
        read_only=True, max_digits=10, decimal_places=2
    )
    discounted_price = serializers.DecimalField(
        read_only=True, max_digits=10, decimal_places=2
    )
    sizes = ProductSizeListSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "slug",
            "exists",
            "prod_type",
            "gender",
            "full_price",
            "discount",
            "discounted_price",
            "sizes",
            "images",
        ]


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    is_own = serializers.SerializerMethodField()
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), write_only=True
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "product",
            "user_name",
            "rating",
            "text",
            "created_at",
            "is_own",
        ]
        read_only_fields = ["id", "user_name", "created_at", "is_own"]

    def get_user_name(self, obj):
        return obj.user.first_name or obj.user.email.split("@")[0]

    def get_is_own(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.user_id == request.user.id
        return False

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Оцінка має бути від 1 до 5.")
        return value


class ProductRetrieveSerializer(serializers.ModelSerializer):
    vendor = serializers.SlugRelatedField(
        many=False, read_only=True, slug_field="name"
    )
    exists = serializers.CharField(source="quantity_message", read_only=True)
    full_price = serializers.DecimalField(
        read_only=True, max_digits=10, decimal_places=2
    )
    discounted_price = serializers.DecimalField(
        read_only=True, max_digits=10, decimal_places=2
    )
    sizes = serializers.SerializerMethodField()
    in_wishlist = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    images = ProductImageSerializer(many=True, read_only=True)
    videos = ProductVideoSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "exists",
            "prod_type",
            "gender",
            "season",
            "full_price",
            "discount",
            "discounted_price",
            "description",
            "seo_description",
            "seo_title",
            "seo_h1",
            "slug",
            "sizes",
            "in_wishlist",
            "images",
            "videos",
            "avg_rating",
            "review_count",
        ]

    def get_sizes(self, obj):
        return ProductSizeRetrieveSerializer(
            obj.sizes.all(), many=True, context=self.context
        ).data

    def get_in_wishlist(self, obj):
        user = self.context["request"].user
        if user.is_authenticated:
            return WishlistItem.objects.filter(
                wishlist__user=user, product=obj
            ).exists()
        return False

    def get_avg_rating(self, obj):
        result = obj.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(result, 1) if result else None

    def get_review_count(self, obj):
        return obj.reviews.count()


class ProductOrderSerializer(serializers.ModelSerializer):
    """Minimal product info embedded inside order items."""

    vendor = serializers.SlugRelatedField(
        many=False, read_only=True, slug_field="name"
    )
    discounted_price = serializers.DecimalField(
        read_only=True, max_digits=10, decimal_places=2
    )
    main_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "prod_type",
            "main_image",
            "discounted_price",
        ]

    def get_main_image(self, obj):
        img = obj.images.filter(is_main=True).first() or obj.images.first()
        return img.image.url if img else None


class CartProductSerializer(serializers.ModelSerializer):
    """Minimal product info for cart display."""

    vendor = serializers.SlugRelatedField(
        many=False, read_only=True, slug_field="name"
    )
    discounted_price = serializers.DecimalField(
        read_only=True, max_digits=10, decimal_places=2
    )
    main_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "discounted_price",
            "main_image",
        ]

    def get_main_image(self, obj):
        img = obj.images.filter(is_main=True).first() or obj.images.first()
        return img.image.url if img else None


# ── Vendor ─────────────────────────────────────────────────────────────────────


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "name"]


# ── Cart ───────────────────────────────────────────────────────────────────────


class CartItemProductSizeSerializer(serializers.ModelSerializer):
    product = CartProductSerializer(read_only=True)

    class Meta:
        model = ProductSize
        fields = ["id", "size", "quantity", "product"]


class CartItemSerializer(serializers.ModelSerializer):
    product_size = CartItemProductSizeSerializer(read_only=True)

    class Meta:
        model = CartItem
        fields = ["product_size", "quantity"]


class CartSerializer(serializers.ModelSerializer):
    total_price = serializers.SerializerMethodField()
    cart_items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "user", "cart_items", "total_price"]

    def get_total_price(self, obj):
        return sum(
            item.product_size.product.discounted_price * item.quantity
            for item in obj.cart_items.select_related(
                "product_size__product"
            ).all()
        )


class AddToCartSerializer(serializers.Serializer):
    product_size = serializers.IntegerField()
    quantity = serializers.IntegerField(required=False, default=1)

    def validate(self, data):
        try:
            product_size = ProductSize.objects.select_related("product").get(
                id=data["product_size"]
            )
        except ProductSize.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "error": f"ProductSize with id {data['product_size']} not found."
                }
            )

        cart = Cart.objects.filter(user=self.context["request"].user).first()
        cart_item = (
            CartItem.objects.filter(
                cart=cart, product_size=product_size
            ).first()
            if cart
            else None
        )
        cart_item_quantity = cart_item.quantity if cart_item else 0

        if not (
            1 <= cart_item_quantity + data["quantity"] <= product_size.quantity
        ):
            raise serializers.ValidationError(
                {"error": "Not available amount of product!"}
            )
        return data


class RemoveFromCartSerializer(serializers.Serializer):
    product_size = serializers.IntegerField()
    quantity = serializers.IntegerField(
        required=False,
        default=1,
        validators=[MinValueValidator(1)],
    )


# ── Wishlist ───────────────────────────────────────────────────────────────────


class WishlistSerializer(serializers.ModelSerializer):
    products = ProductListSerializer(many=True, read_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "products"]


class WishlistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WishlistItem
        fields = ["id", "wishlist", "product"]


class AddToWishlistSerializer(serializers.Serializer):
    product = serializers.IntegerField()


class RemoveFromWishlistSerializer(serializers.Serializer):
    product = serializers.IntegerField()


# ── Orders ─────────────────────────────────────────────────────────────────────


class OrderItemProductSizeSerializer(serializers.ModelSerializer):
    product = ProductOrderSerializer(read_only=True)

    class Meta:
        model = ProductSize
        fields = ["id", "size", "product"]


class OrderItemSerializer(serializers.ModelSerializer):
    product_size = OrderItemProductSizeSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ["product_size", "quantity", "price"]


def _normalize_ua_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("380") and len(digits) >= 12:
        return f"+{digits[:12]}"
    if digits.startswith("0") and len(digits) >= 10:
        return f"+38{digits[:10]}"
    if digits.startswith("380"):
        return f"+{digits}"
    if digits.startswith("0"):
        return f"+38{digits}"
    if digits:
        return f"+{digits}"
    return (raw or "").strip()


class DeliveryInfoSerializer(serializers.ModelSerializer):
    """
    Used when creating an order — accepts full delivery data from the client.
    Read-only fields (city_ref, warehouse_ref, tracking_number) are managed
    server-side and will be populated during Nova Poshta API integration.
    """

    def validate_recipient_phone(self, value):
        from shop.models import ua_phone_validator

        normalized = _normalize_ua_phone(value)
        ua_phone_validator(normalized)
        return normalized

    class Meta:
        model = DeliveryInfo
        fields = [
            "recipient_full_name",
            "recipient_phone",
            "delivery_type",
            "city_name",
            "city_ref",
            "warehouse_address",
            "warehouse_ref",
            "street",
            "building_number",
            "apartment",
            "tracking_number",
        ]
        read_only_fields = ["tracking_number"]

    def validate(self, data):
        delivery_type = data.get(
            "delivery_type", DeliveryInfo.DeliveryTypeChoices.NP_WAREHOUSE
        )

        if delivery_type == DeliveryInfo.DeliveryTypeChoices.PICKUP:
            return data

        warehouse_types = (
            DeliveryInfo.DeliveryTypeChoices.NP_WAREHOUSE,
            DeliveryInfo.DeliveryTypeChoices.NP_POSTAMAT,
        )
        if delivery_type in warehouse_types:
            if not data.get("warehouse_address"):
                raise serializers.ValidationError(
                    {"warehouse_address": "Вкажіть адресу відділення."}
                )
        elif delivery_type == DeliveryInfo.DeliveryTypeChoices.NP_ADDRESS:
            if not data.get("street"):
                raise serializers.ValidationError(
                    {"street": "Вкажіть вулицю для адресної доставки."}
                )
            if not data.get("building_number"):
                raise serializers.ValidationError(
                    {"building_number": "Вкажіть номер будинку."}
                )
        return data


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.StatusChoices.choices)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    delivery = DeliveryInfoSerializer(read_only=True)
    user = serializers.SlugRelatedField(
        many=False, read_only=True, slug_field="email"
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "created_at",
            "user",
            "status",
            "total_price",
            "delivery",
            "items",
        ]
