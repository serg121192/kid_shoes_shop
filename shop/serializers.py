from rest_framework import serializers

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


class ProductSerializer(serializers.ModelSerializer):
    discounted_price = serializers.DecimalField(
        read_only=True,
        max_digits=10,
        decimal_places=2
    )
    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "prod_type",
            "gender",
            "quantity",
            "size",
            "season",
            "full_price",
            "discount",
            "discounted_price",
            "image",
            "description"
        ]


class ProductListSerializer(ProductSerializer):
    vendor = serializers.SlugRelatedField(
        many=False,
        read_only=True,
        slug_field="name"
    )
    exists = serializers.CharField(source="quantity_message", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "exists",
            "prod_type",
            "gender",
            "size",
            "image",
            "discount",
            "discounted_price"
        ]


class ProductRetrieveSerializer(ProductListSerializer):
    in_cart = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "prod_type",
            "gender",
            "quantity",
            "season",
            "size",
            "discount",
            "discounted_price",
            "image",
            "description",
            "in_cart"
        ]

    def get_in_cart(self, obj):
        user = self.context["request"].user
        if user.is_authenticated:
            return CartItem.objects.filter(
                cart__user=user, product=obj
            ).exists()

        return False
    

class ProductOrderSerializer(ProductListSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "prod_type",
            "size",
            "image",
            "discounted_price"
        ]

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            "id",
            "name"
        ]


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(many=False, read_only=True)
    class Meta:
        model = CartItem
        fields = [
            "product",
            "quantity"
        ]


class CartSerializer(serializers.ModelSerializer):
    total_price = serializers.SerializerMethodField()
    cart_items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = [
            "id",
            "user",
            "cart_items",
            "total_price"
        ]

    def get_total_price(self, obj):
        return sum(
            item.product.discounted_price * item.quantity
            for item in obj.cart_items.all()
        )


class AddToCartSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(required=False, default=1)

    def validate(self, data):
        try:
            product = Product.objects.get(id=data["product"])
        except Product.DoesNotExist:
            raise serializers.ValidationError(
                {"error": f"Product with id {data['product']} not found."}
            )

        cart = Cart.objects.filter(
            user=self.context["request"].user
        ).first()
        cart_item = (
            CartItem.objects.filter(cart=cart, product=product).first()
            if cart
            else None
        )

        cart_item_quantity = cart_item.quantity if cart_item else 0
        if not (1 <= cart_item_quantity + data["quantity"] <= product.quantity):
            raise serializers.ValidationError(
                {"error": "Not available amount of product!"}
            )

        return data


class RemoveFromCartSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(required=False, default=1)


class WishlistSerializer(serializers.ModelSerializer):
    products = ProductListSerializer(many=True, read_only=True)
    class Meta:
        model = Wishlist
        fields = [
            "id",
            "products",
        ]


class WishlistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WishlistItem
        fields = [
            "id",
            "wishlist",
            "product"
        ]


class AddToWishlistSerializer(serializers.Serializer):
    product = serializers.IntegerField()


class RemoveFromWishlistSerializer(serializers.Serializer):
    product = serializers.IntegerField()


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductOrderSerializer(many=False, read_only=True)
    class Meta:
        model = OrderItem
        fields = [
            "product",
            "quantity",
            "price"
        ]


class DeliveryInfoSerializer(serializers.ModelSerializer):
    """
    Used when creating an order — accepts full delivery data from the client.
    Read-only fields (city_ref, warehouse_ref, tracking_number) are managed
    server-side and will be populated during Nova Poshta API integration.
    """

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
    user = serializers.SlugRelatedField(
        many=False,
        read_only=True,
        slug_field="email",
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
