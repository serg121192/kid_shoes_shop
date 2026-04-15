from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import (
    Product, 
    Vendor, 
    Cart, 
    CartItem, 
    Order, 
    OrderItem, 
    DeliveryInfo
)

User = get_user_model()

ORDERS_URL = "/api/shop/orders/"
CREATE_ORDER_URL = "/api/shop/orders/me/create_order/"


# Helper functions
def create_vendor(name: str = "Nike") -> Vendor:
    return Vendor.objects.create(name=name)


def create_product(vendor: Vendor, **kwargs) -> Product:
    defaults = {
        "model_name": "Air Max",
        "prod_type": Product.ProductTypeChoices.SNEAKERS,
        "gender": Product.GenderChoices.UNISEX,
        "quantity": 10,
        "season": Product.SeasonChoices.SUMMER,
        "size": Product.SizeChoices.small_25,
        "full_price": Decimal("1200.00"),
        "discount": 0,
    }
    defaults.update(kwargs)
    return Product.objects.create(vendor=vendor, **defaults)


def create_user(
    email: str = "test@example.com",
    password: str = "testpassword",
    is_staff: bool = False,
) -> User:
    return User.objects.create_user(
        email=email,
        password=password,
        is_staff=is_staff
    )


class OrderAccessTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.user = create_user()

    def test_order_access_unauthenticated_returns_401(self):
        res = self.client.get(ORDERS_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_order_access_authenticated_returns_200(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(ORDERS_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class CreateOrderTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.user = create_user()
        self.delivery_payload = {
            "recipient_full_name": "John Doe",
            "recipient_phone": "+380123456789",
            "delivery_type": DeliveryInfo.DeliveryTypeChoices.NP_WAREHOUSE,
            "city_name": "Kyiv",
            "warehouse_address": "123 Main St",
        }

    def test_create_order_unauthenticated_returns_401(self):
        res = self.client.post(CREATE_ORDER_URL, self.delivery_payload)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_order_authenticated_returns_201(self):
        self.client.force_authenticate(user=self.user)
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(cart=cart, product=self.product, quantity=1)
        res = self.client.post(CREATE_ORDER_URL, self.delivery_payload)
        self.product.refresh_from_db()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Order.objects.filter(user=self.user).exists())
        self.assertTrue(DeliveryInfo.objects.filter(order=Order.objects.get(user=self.user)).exists())
        self.assertEqual(self.product.quantity, 9)

    def test_create_order_with_empty_cart_returns_400(self):
        self.client.force_authenticate(user=self.user)
        cart = Cart.objects.create(user=self.user)
        res = self.client.post(CREATE_ORDER_URL, self.delivery_payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_without_delivery_info_returns_400(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CREATE_ORDER_URL, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class OrderDetailTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.user = create_user()
        self.delivery_payload = {
            "recipient_full_name": "John Doe",
            "recipient_phone": "+380123456789",
            "delivery_type": DeliveryInfo.DeliveryTypeChoices.NP_WAREHOUSE,
            "city_name": "Kyiv",
            "warehouse_address": "123 Main St",
        }

    def test_users_own_order_detail_returns_200(self):
        self.client.force_authenticate(user=self.user)
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(cart=cart, product=self.product, quantity=1)
        order = Order.objects.create(user=self.user, status=Order.StatusChoices.PENDING)
        DeliveryInfo.objects.create(order=order, **self.delivery_payload)
        res = self.client.get(f"{ORDERS_URL}{order.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("items", res.data)
        self.assertIn("delivery", res.data)
        self.assertIn("total_price", res.data)
        self.assertIn("status", res.data)
        self.assertIn("user", res.data)

    def test_other_users_order_detail_returns_404(self):
        self.client.force_authenticate(user=self.user)
        other_user = create_user(email="other@example.com")
        order = Order.objects.create(user=other_user, status=Order.StatusChoices.PENDING)
        res = self.client.get(f"{ORDERS_URL}{order.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
