from django.urls import path, include
from rest_framework import routers

from shop.views import (
    OrderViewSet,
    ProductViewSet,
    VendorViewSet,
    CartViewSet,
    WishlistViewSet
)


app_name = "shop"

router = routers.DefaultRouter()
router.register("products", ProductViewSet)
router.register("vendors", VendorViewSet)
router.register("cart", CartViewSet)
router.register("wishlist", WishlistViewSet)
router.register("orders", OrderViewSet)

urlpatterns = [
    path("", include(router.urls))
]
