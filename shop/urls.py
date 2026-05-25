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
    manager_stats,
    sales_report,
    sales_report_xlsx,
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
    path("stats/", manager_stats, name="manager-stats"),
    path("stats/report/", sales_report, name="sales-report"),
    path("stats/report/xlsx/", sales_report_xlsx, name="sales-report-xlsx"),
]
