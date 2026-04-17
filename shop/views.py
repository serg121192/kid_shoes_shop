from django.db import transaction
from django.core.exceptions import ValidationError

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated

from shop.permissions import IsAdminOrReadOnly, IsOwnerOrAdmin
from shop.filters import ProductFilter
from shop.models import (
    Product,
    ProductSize,
    Vendor,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Wishlist,
    WishlistItem,
    DeliveryInfo,
)
from shop.serializers import (
    ProductSerializer,
    ProductListSerializer,
    ProductRetrieveSerializer,
    VendorSerializer,
    CartSerializer,
    AddToCartSerializer,
    RemoveFromCartSerializer,
    WishlistSerializer,
    WishlistItemSerializer,
    AddToWishlistSerializer,
    RemoveFromWishlistSerializer,
    OrderSerializer,
    OrderItemSerializer,
    DeliveryInfoSerializer,
)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("vendor").prefetch_related("sizes", "images", "videos")
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["model_name", "vendor__name", "description"]
    ordering_fields = ["full_price", "discount"]
    ordering = ["full_price"]

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        if self.action == "retrieve":
            return ProductRetrieveSerializer
        return ProductSerializer


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [IsAdminOrReadOnly]


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        return Wishlist.objects.filter(
            user=self.request.user
        ).prefetch_related("items__product__vendor", "items__product__sizes")

    @action(
        detail=False,
        methods=["post"],
        serializer_class=AddToWishlistSerializer,
        url_path="me/add_wish",
    )
    def add_item(self, request: Request) -> Response:
        wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data["product"]

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        WishlistItem.objects.get_or_create(wishlist=wishlist, product=product)
        return Response({"message": "Product added to Wishlist!"}, status=status.HTTP_201_CREATED)

    @action(
        detail=False,
        methods=["post"],
        serializer_class=RemoveFromWishlistSerializer,
        url_path="me/remove_wish",
    )
    def remove_item(self, request: Request) -> Response:
        try:
            wishlist = Wishlist.objects.get(user=request.user)
        except Wishlist.DoesNotExist:
            return Response({"error": "Wishlist not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data["product"]

        deleted, _ = WishlistItem.objects.filter(
            wishlist=wishlist, product_id=product_id
        ).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Product not found in Wishlist!"}, status=status.HTTP_404_NOT_FOUND)


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        return Cart.objects.filter(
            user=self.request.user
        ).prefetch_related("cart_items__product_size__product__vendor")

    @action(
        detail=False,
        methods=["post"],
        serializer_class=AddToCartSerializer,
        url_path="me/cart_add",
    )
    def add_item(self, request: Request) -> Response:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_size_id = serializer.validated_data["product_size"]
        quantity = serializer.validated_data.get("quantity", 1)
        product_size = ProductSize.objects.get(id=product_size_id)

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product_size=product_size,
            defaults={"quantity": quantity},
        )
        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        return Response({"message": "Item added to cart"}, status=status.HTTP_201_CREATED)

    @action(
        detail=False,
        methods=["post"],
        serializer_class=RemoveFromCartSerializer,
        url_path="me/cart_remove",
    )
    def remove_item(self, request: Request) -> Response:
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({"error": "Cart not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_size_id = serializer.validated_data["product_size"]
        quantity = serializer.validated_data.get("quantity", None)

        try:
            cart_item = CartItem.objects.get(cart=cart, product_size_id=product_size_id)
        except CartItem.DoesNotExist:
            return Response({"error": "Item not found in cart"}, status=status.HTTP_404_NOT_FOUND)

        if quantity is None or quantity >= cart_item.quantity:
            cart_item.delete()
            return Response({"message": "Item removed from cart"}, status=status.HTTP_204_NO_CONTENT)

        cart_item.quantity -= quantity
        cart_item.save()
        return Response(
            {"message": f"{quantity} of items has been removed from cart"},
            status=status.HTTP_200_OK,
        )


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsOwnerOrAdmin]

    def create(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def get_queryset(self):
        base = Order.objects.select_related("delivery").prefetch_related(
            "items__product_size__product__vendor"
        )
        if self.request.user.is_staff:
            return base
        return base.filter(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="me/create_order")
    @transaction.atomic
    def create_order(self, request: Request) -> Response:
        delivery_data = (
            request.data.get("delivery")
            if isinstance(request.data.get("delivery"), dict)
            else request.data
        )
        delivery_serializer = DeliveryInfoSerializer(data=delivery_data)
        if not delivery_serializer.is_valid():
            return Response(delivery_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({"error": "Cart not found"}, status=status.HTTP_404_NOT_FOUND)

        if not cart.cart_items.exists():
            return Response({"error": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.create(user=request.user, status=Order.StatusChoices.PENDING)
        DeliveryInfo.objects.create(order=order, **delivery_serializer.validated_data)

        total_price = 0
        for cart_item in cart.cart_items.select_related("product_size__product").all():
            product_size = cart_item.product_size
            OrderItem.validate_product_quantity(
                product_size=product_size,
                quantity=cart_item.quantity,
                error_to_raise=ValidationError,
            )
            OrderItem.objects.create(
                order=order,
                product_size=product_size,
                quantity=cart_item.quantity,
                price=product_size.product.discounted_price,
            )
            total_price += cart_item.quantity * product_size.product.discounted_price
            product_size.reduce_stock(cart_item.quantity)

        order.total_price = total_price
        order.save()
        cart.cart_items.all().delete()

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel_order(self, request: Request, pk=None) -> Response:
        order = self.get_object()
        if order.status != Order.StatusChoices.PENDING:
            return Response(
                {"error": "Можна скасувати лише замовлення зі статусом 'Очікує обробки'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = Order.StatusChoices.CANCELLED
        order.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
