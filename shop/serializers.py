from rest_framework import serializers

from shop.models import (
    Product,
    Vendor,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Wishlist
)


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "prod_type",
            "gender",
            "quantity",
            "country",
            "size",
            "season",
            "price",
            "image"
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
            "size",
            "image",
            "price"
        ]


class ProductRetrieveSerializer(ProductListSerializer):
    in_cart = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "vendor",
            "model_name",
            "country",
            "prod_type",
            "gender",
            "quantity",
            "season",
            "size",
            "price",
            "image",
            "in_cart"
        ]

    def get_in_cart(self, obj):
        user = self.context["request"].user
        if user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=user)
            return CartItem.objects.filter(cart=cart, product=obj).exists()
        
        return False


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            "id",
            "name"
        ]


class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = [
            "id",
            "product",
            "quantity"
        ]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    class Meta:
        model = Cart
        fields = [
            "id",
            "user",
            "items"
        ]


class AddItemSerializer(serializers.Serializer):
    product = serializers.IntegerField()


class RemoveItemSerializer(serializers.Serializer):
    product = serializers.IntegerField()
