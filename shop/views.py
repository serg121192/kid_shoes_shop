from django.shortcuts import render
from rest_framework import viewsets

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
    VendorSerializer,
)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    
    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        
        return ProductSerializer




class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
