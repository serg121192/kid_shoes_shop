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
    OrderItem
)
from shop.serializers import (
    ProductSerializer,
    ProductListSerializer,
    ProductRetrieveSerializer,
    VendorSerializer,
    CartSerializer,
    AddItemSerializer,
    RemoveItemSerializer,
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


class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer

    @action(
        detail=False,
        methods=["post"],
        serializer_class=AddItemSerializer,
        url_path="me/add_product"
    )
    def add_item(self, request: Request) -> Response:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = request.data.get("product")
        quantity = 1

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
        serializer_class=RemoveItemSerializer,
        url_path="me/remove_product"
    )
    def remove_item(self, request: Request) -> Response:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data["product"]

        try:
            cart_item = CartItem.objects.get(
                cart=cart,
                product_id=product_id
            )
            cart_item.delete()
            return Response(
                {
                    "message": "Item removed from cart"
                },
                status=status.HTTP_200_OK
            )
        except CartItem.DoesNotExist:
            return Response(
                {
                    "error": "Item not found in cart"
                },
                status=status.HTTP_404_NOT_FOUND
            )
