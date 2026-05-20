from django.db import transaction
from django.core.exceptions import ValidationError

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny

from shop.permissions import IsAdminOrReadOnly, IsOwnerOrAdmin
from shop.filters import ProductFilter
from shop.liqpay import build_payment_params, verify_callback
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
    Review,
)
from shop.nova_poshta import get_cities_list, get_warehouses_list
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
    OrderStatusSerializer,
    OrderItemSerializer,
    DeliveryInfoSerializer,
    ReviewSerializer,
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
    pagination_class = None

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
        ).prefetch_related(
            "cart_items__product_size__product__vendor",
            "cart_items__product_size__product__images",
        ).order_by("-id")

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

        payment_method = request.data.get("payment_method", Order.PaymentMethodChoices.COD)
        if payment_method not in Order.PaymentMethodChoices.values:
            payment_method = Order.PaymentMethodChoices.COD

        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({"error": "Cart not found"}, status=status.HTTP_404_NOT_FOUND)

        if not cart.cart_items.exists():
            return Response({"error": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.create(
            user=request.user,
            status=Order.StatusChoices.PENDING,
            payment_method=payment_method,
        )
        DeliveryInfo.objects.create(order=order, **delivery_serializer.validated_data)

        total_price = 0
        for cart_item in cart.cart_items.select_related("product_size__product").all():
            product_size = ProductSize.objects.select_for_update().get(
                id=cart_item.product_size_id
            )
            product_size.product = cart_item.product_size.product
            try:
                OrderItem.validate_product_quantity(
                    product_size=product_size,
                    quantity=cart_item.quantity,
                    error_to_raise=ValidationError,
                )
            except ValidationError as exc:
                return Response(
                    {"error": exc.message},
                    status=status.HTTP_400_BAD_REQUEST,
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

    @action(detail=True, methods=["patch"], url_path="update_status")
    def update_status(self, request: Request, pk=None) -> Response:
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)
        order = self.get_object()
        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        order.status = new_status
        order.save()  # сигнал post_save подбає про ТТН автоматично

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="payment", permission_classes=[IsAuthenticated])
    def get_payment_data(self, request: Request, pk=None) -> Response:
        order = self.get_object()
        if order.is_paid:
            return Response({"error": "Замовлення вже оплачено."}, status=status.HTTP_400_BAD_REQUEST)
        params = build_payment_params(
            order_id=order.id,
            amount=float(order.total_price),
            description=f"Замовлення №{order.id} — Магазин дитячого взуття",
        )
        return Response(params)

    @action(detail=True, methods=["post"], url_path="cancel", permission_classes=[IsAuthenticated])
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


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsOwnerOrAdmin()]

    def get_queryset(self):
        qs = Review.objects.select_related("user")
        product_id = self.request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        if Review.objects.filter(
            product_id=request.data.get("product"), user=request.user
        ).exists():
            return Response(
                {"error": "Ви вже залишили відгук для цього товару."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="my", permission_classes=[IsAuthenticated])
    def my_review(self, request: Request) -> Response:
        product_id = request.query_params.get("product")
        if not product_id:
            return Response({"error": "Потрібен параметр product."}, status=status.HTTP_400_BAD_REQUEST)
        review = Review.objects.filter(product_id=product_id, user=request.user).first()
        if not review:
            return Response(None, status=status.HTTP_200_OK)
        return Response(ReviewSerializer(review, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def nova_poshta_cities(request: Request) -> Response:
    query = request.query_params.get("q", "").strip()
    if len(query) < 2:
        return Response([], status=status.HTTP_200_OK)

    return Response(get_cities_list(query), status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def nova_poshta_warehouses(request: Request) -> Response:
    city_ref = request.query_params.get("city_ref", "").strip()
    query = request.query_params.get("q", "").strip()
    warehouse_type = request.query_params.get("type", "warehouse").strip()
    if not city_ref:
        return Response([], status=status.HTTP_200_OK)

    return Response(
        get_warehouses_list(
            city_ref,
            query,
            warehouse_type
        ), status=status.HTTP_200_OK
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def liqpay_callback(request: Request) -> Response:
    data = request.data.get("data", "")
    signature = request.data.get("signature", "")
    payload = verify_callback(data, signature)
    if not payload:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    if payload.get("status") in ("success", "sandbox"):
        order_id = str(payload.get("order_id", "")).replace("order_", "")
        Order.objects.filter(pk=order_id).update(is_paid=True)
    
    return Response(status=status.HTTP_200_OK)
