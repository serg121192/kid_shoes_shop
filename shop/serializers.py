from rest_framework import serializers

from shop.models import (
    Product,
    Vendor,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Wishlist,
    WishlistItem
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
            "discount",
            "discounted_price",
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
            "country",
            "prod_type",
            "gender",
            "quantity",
            "season",
            "size",
            "discount",
            "discounted_price",
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
    product = ProductListSerializer(many=False, read_only=True)
    class Meta:
        model = CartItem
        fields = [
            "product",
            "quantity"
        ]


class CartSerializer(serializers.ModelSerializer):
    cart_items = CartItemSerializer(many=True, read_only=True)
    class Meta:
        model = Cart
        fields = [
            "id",
            "user",
            "cart_items"
        ]


class AddToCartSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(required=False, default=1)

    def validate(self, data):
        try:
            product = Product.objects.get(id=data["product"])
            cart, _ = Cart.objects.get_or_create(user=self.context["request"].user)
            cart_item = CartItem.objects.filter(cart=cart, product=product).first()
        except Product.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "error": f"Product with id {data['product']} not found."
                }
            )
        
        if not (1 <= cart_item.quantity + data["quantity"] <= product.quantity):
            raise serializers.ValidationError(
                {
                    "error": "Not available amount of product!"
                }
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
            "wishlist"
            "product"
        ]


class AddToWishlistSerializer(serializers.Serializer):
    product = serializers.IntegerField()


class RemoveFromWishlistSerializer(serializers.Serializer):
    product = serializers.IntegerField()
