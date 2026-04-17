from rest_framework import serializers

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
            "id", "vendor", "model_name", "prod_type", "gender",
            "season", "full_price", "discount", "discounted_price",
            "image", "description",
        ]


class ProductListSerializer(serializers.ModelSerializer):
    vendor = serializers.SlugRelatedField(
        many=False, read_only=True, slug_field="name"
    )
    exists = serializers.CharField(source="quantity_message", read_only=True)
    discounted_price = serializers.DecimalField(
        read_only=True, max_digits=10, decimal_places=2
    )
    sizes = ProductSizeListSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "vendor", "model_name", "exists",
            "prod_type", "gender", "image",
            "discount", "discounted_price", "sizes", "images",
        ]


class ProductRetrieveSerializer(serializers.ModelSerializer):
    vendor = serializers.SlugRelatedField(
        many=False, read_only=True, slug_field="name"
    )
    exists = serializers.CharField(source="quantity_message", read_only=True)
    discounted_price = serializers.DecimalField(
        read_only=True, max_digits=10, decimal_places=2
    )
    sizes = serializers.SerializerMethodField()
    in_wishlist = serializers.SerializerMethodField()

    images = ProductImageSerializer(many=True, read_only=True)
    videos = ProductVideoSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "vendor", "model_name", "exists",
            "prod_type", "gender", "season",
            "discount", "discounted_price",
            "image", "description",
            "sizes", "in_wishlist",
            "images", "videos",
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


class ProductOrderSerializer(serializers.ModelSerializer):
    """Minimal product info embedded inside order/cart items."""
    vendor = serializers.SlugRelatedField(
        many=False, read_only=True, slug_field="name"
    )
    discounted_price = serializers.DecimalField(
        read_only=True, max_digits=10, decimal_places=2
    )

    class Meta:
        model = Product
        fields = ["id", "vendor", "model_name", "prod_type", "image", "discounted_price"]


# ── Vendor ─────────────────────────────────────────────────────────────────────

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "name"]


# ── Cart ───────────────────────────────────────────────────────────────────────

class CartItemProductSizeSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = ProductSize
        fields = ["id", "size", "product"]


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
            for item in obj.cart_items.select_related("product_size__product").all()
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
                {"error": f"ProductSize with id {data['product_size']} not found."}
            )

        cart = Cart.objects.filter(user=self.context["request"].user).first()
        cart_item = (
            CartItem.objects.filter(cart=cart, product_size=product_size).first()
            if cart
            else None
        )
        cart_item_quantity = cart_item.quantity if cart_item else 0

        if not (1 <= cart_item_quantity + data["quantity"] <= product_size.quantity):
            raise serializers.ValidationError(
                {"error": "Not available amount of product!"}
            )
        return data


class RemoveFromCartSerializer(serializers.Serializer):
    product_size = serializers.IntegerField()
    quantity = serializers.IntegerField(required=False, default=1)


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


class DeliveryInfoSerializer(serializers.ModelSerializer):
    """
    Used when creating an order — accepts full delivery data from the client.
    Read-only fields (city_ref, warehouse_ref, tracking_number) are managed
    server-side and will be populated during Nova Poshta API integration.
    """

    class Meta:
        model = DeliveryInfo
        fields = [
            "recipient_full_name", "recipient_phone", "delivery_type",
            "city_name", "city_ref",
            "warehouse_address", "warehouse_ref",
            "street", "building_number", "apartment",
            "tracking_number",
        ]
        read_only_fields = ["city_ref", "warehouse_ref", "tracking_number"]

    def validate(self, data):
        delivery_type = data.get("delivery_type", DeliveryInfo.DeliveryTypeChoices.NP_WAREHOUSE)
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


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    delivery = DeliveryInfoSerializer(read_only=True)
    user = serializers.SlugRelatedField(many=False, read_only=True, slug_field="email")

    class Meta:
        model = Order
        fields = [
            "id", "created_at", "user", "status",
            "total_price", "delivery", "items",
        ]
