from django.urls import path, include
from rest_framework import routers

from shop.views import (
    ProductViewSet,
    VendorViewSet
)


app_name = "shop"

router = routers.DefaultRouter()
router.register("products", ProductViewSet)
router.register("vendors", VendorViewSet)

urlpatterns = [
    path("", include(router.urls))
]
