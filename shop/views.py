from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import (
    DjangoModelPermissionsOrAnonReadOnly
)

from shop.models import (
    Product,
    Vendor,
    Wishlist,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Wishlist,
    WishlistItem
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
    OrderItemSerializer
)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]
    
    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        elif self.action == "retrieve":
            return ProductRetrieveSerializer
        
        return ProductSerializer


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]


class WishlistViewSet(viewsets.ModelViewSet):
    queryset = Wishlist.objects.all()
    serializer_class = WishlistSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]

    @action(
        detail=False,
        methods=["post"],
        serializer_class=AddToWishlistSerializer,
        url_path="me/add_wish"
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
                {
                    "error": "Product not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        wishlist_item, created = WishlistItem.objects.get_or_create(
            wishlist=wishlist,
            product=product,
        )

        if not created:
            wishlist_item.save()

        return Response(
            {
                "message": "Product added to Wishlist!"
            },
            status=status.HTTP_201_CREATED
        )
    
    @action(
        detail=False,
        methods=["post"],
        serializer_class=RemoveFromWishlistSerializer,
        url_path="me/remove_wish"
    )
    def remove_item(self, request: Request) -> Response:
        wishlist = Wishlist.objects.get(user=request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data["product"]

        try:
            wishlist_item = WishlistItem.objects.get(
                wishlist=wishlist,
                product=product_id
            )
            wishlist_item.delete()
            return Response(
                {
                    "message": "Product has successfully removed from Wishlist!"
                },
                status=status.HTTP_204_NO_CONTENT
            )
        except WishlistItem.DoesNotExist:
            return Response(
                {
                    "error": f"Product {items_product_id__model_name} not found in Wishlist!"
                },
                status=status.HTTP_404_NOT_FOUND
            )


class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]

    @action(
        detail=False,
        methods=["post"],
        serializer_class=AddToCartSerializer,
        url_path="me/cart_add"
    )
    def add_item(self, request: Request) -> Response:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data["product"]
        quantity = serializer.validated_data.get("quantity", 1)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {
                    "error": "Product not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={
                "quantity": quantity
            }
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        return Response(
            {
                "message": "Item added to cart"
            },
            status=status.HTTP_201_CREATED
        )

    @action(
        detail=False, 
        methods=["post"],
        serializer_class=RemoveFromCartSerializer,
        url_path="me/cart_remove"
    )
    def remove_item(self, request: Request) -> Response:
        cart = Cart.objects.get(user=request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data["product"]
        quantity = serializer.validated_data.get("quantity", None)

        try:
            cart_item = CartItem.objects.get(
                cart=cart,
                product_id=product_id,
            )
            if quantity is None or quantity >= cart_item.quantity:
                cart_item.delete()
                return Response(
                    {
                        "message": "Item removed from cart"
                    },
                    status=status.HTTP_204_NO_CONTENT
                )
            else:
                cart_item.quantity -= quantity
                cart_item.save()
                return Response(
                    {
                        "message": f"{quantity} of items has been removed from cart"
                    },
                    status=status.HTTP_200_OK
                )
            return Response(
                {
                    "message": "Item removed from cart"
                },
                status=status.HTTP_204_NO_CONTENT
            )
        except CartItem.DoesNotExist:
            return Response(
                {
                    "error": "Item not found in cart"
                },
                status=status.HTTP_404_NOT_FOUND
            )
        

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [DjangoModelPermissionsOrAnonReadOnly]

    @action(
        detail=False,
        methods=["post"],
        url_path="me/create_order"
    )
    def create_order(self, request: Request) -> Response:
        # Implementation for creating an order from the user's cart
        cart = Cart.objects.get(user=request.user)
        if not cart.cart_items.exists():
            return Response(
                {
                    "error": "Cart is empty"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order = Order.objects.create(
            user=request.user,
            status=Order.StatusChoices.PENDING
        )
        total_price = 0

        for cart_item in cart.cart_items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                quantity=cart_item.quantity,
                price=cart_item.product.discounted_price
            )
            total_price += cart_item.quantity * cart_item.product.discounted_price

        order.total_price = total_price
        order.save()

        cart.cart_items.all().delete()

        return Response(
            OrderSerializer(order).data(),
            status=status.HTTP_201_CREATED
        )
