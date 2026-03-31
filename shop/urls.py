from django.urls import path, include
from rest_framework import routers

from shop.views import (
    ProductViewSet,
    VendorViewSet,
    CartViewSet,
)


app_name = "shop"

router = routers.DefaultRouter()
router.register("products", ProductViewSet)
router.register("vendors", VendorViewSet)
router.register("cart", CartViewSet)

urlpatterns = [
    path("", include(router.urls))
]
