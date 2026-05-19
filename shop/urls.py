from django.urls import path, include
from rest_framework import routers

from shop.views import (
    OrderViewSet,
    ProductViewSet,
    VendorViewSet,
    CartViewSet,
    WishlistViewSet,
    ReviewViewSet,
    nova_poshta_cities,
    nova_poshta_warehouses,
)


app_name = "shop"

router = routers.DefaultRouter()
router.register("products", ProductViewSet)
router.register("vendors", VendorViewSet)
router.register("cart", CartViewSet, basename="cart")
router.register("wishlist", WishlistViewSet, basename="wishlist")
router.register("orders", OrderViewSet, basename="order")
router.register("reviews", ReviewViewSet, basename="review")

urlpatterns = [
    path("", include(router.urls)),
    path("nova-poshta/cities/", nova_poshta_cities, name="np-cities"),
    path("nova-poshta/warehouses/", nova_poshta_warehouses, name="np-warehouses"),
]
