import io
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import (
    Product,
    ProductSize,
    Vendor,
    Cart,
    CartItem,
    Order,
    DeliveryInfo,
)

User = get_user_model()

ORDERS_URL = "/api/shop/orders/"
CREATE_ORDER_URL = "/api/shop/orders/me/create_order/"


def create_vendor(name: str = "Nike") -> Vendor:
    return Vendor.objects.create(name=name)


def create_product(vendor: Vendor, **kwargs) -> Product:
    defaults = {
        "model_name": "Air Max",
        "prod_type": Product.ProductTypeChoices.SNEAKERS,
        "gender": Product.GenderChoices.UNISEX,
        "seasons": [Product.SeasonChoices.SUMMER],
        "full_price": Decimal("1200.00"),
        "discount": 0,
    }
    defaults.update(kwargs)
    return Product.objects.create(vendor=vendor, **defaults)


def create_product_size(product: Product, size: int = 25, quantity: int = 10) -> ProductSize:
    return ProductSize.objects.create(product=product, size=size, quantity=quantity)


def create_user(
    email: str = "test@example.com",
    password: str = "testpassword",
    is_staff: bool = False,
    is_seller: bool = False,
) -> User:
    return User.objects.create_user(
        email=email,
        password=password,
        is_staff=is_staff,
        is_seller=is_seller,
    )


class OrderAccessTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.product_size = create_product_size(self.product)
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
        self.product_size = create_product_size(self.product, quantity=10)
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
        CartItem.objects.create(cart=cart, product_size=self.product_size, quantity=1)

        res = self.client.post(CREATE_ORDER_URL, self.delivery_payload)

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Order.objects.filter(user=self.user).exists())
        self.assertTrue(
            DeliveryInfo.objects.filter(order=Order.objects.get(user=self.user)).exists()
        )
        self.product_size.refresh_from_db()
        self.assertEqual(self.product_size.quantity, 9)

    def test_create_order_reduces_stock(self):
        self.client.force_authenticate(user=self.user)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product_size=self.product_size, quantity=3)

        self.client.post(CREATE_ORDER_URL, self.delivery_payload)

        self.product_size.refresh_from_db()
        self.assertEqual(self.product_size.quantity, 7)

    def test_create_order_clears_cart(self):
        self.client.force_authenticate(user=self.user)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product_size=self.product_size, quantity=1)

        self.client.post(CREATE_ORDER_URL, self.delivery_payload)

        self.assertEqual(cart.cart_items.count(), 0)

    def test_create_order_with_empty_cart_returns_400(self):
        self.client.force_authenticate(user=self.user)
        Cart.objects.create(user=self.user)
        res = self.client.post(CREATE_ORDER_URL, self.delivery_payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_without_delivery_info_returns_400(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CREATE_ORDER_URL, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_with_insufficient_stock_returns_400(self):
        self.client.force_authenticate(user=self.user)
        low_stock_size = create_product_size(self.product, size=26, quantity=2)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product_size=low_stock_size, quantity=5)

        res = self.client.post(CREATE_ORDER_URL, self.delivery_payload)

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class OrderDetailTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.product_size = create_product_size(self.product)
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


STAFF_CREATE_URL = "/api/shop/orders/staff/create_order/"


class SellerOrderTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor, is_published=True)
        self.product_size = create_product_size(self.product, quantity=5)
        self.customer = create_user(email="buyer@example.com")
        self.seller = create_user(email="seller@example.com", is_seller=True)
        self.order = Order.objects.create(
            user=self.customer,
            status=Order.StatusChoices.PENDING,
            total_price=Decimal("1200.00"),
        )

    def test_seller_sees_all_orders(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.get(ORDERS_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_seller_can_update_order_status(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.patch(
            f"{ORDERS_URL}{self.order.id}/update_status/",
            {"status": Order.StatusChoices.PROCESSING},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.StatusChoices.PROCESSING)

    def test_seller_can_create_offline_order(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.post(
            STAFF_CREATE_URL,
            {
                "delivery": {
                    "recipient_full_name": "Offline Buyer",
                    "recipient_phone": "+380991234567",
                    "delivery_type": DeliveryInfo.DeliveryTypeChoices.PICKUP,
                },
                "items": [{"product_size": self.product_size.id, "quantity": 1}],
                "status": Order.StatusChoices.RECEIVED,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 2)
        self.product_size.refresh_from_db()
        self.assertEqual(self.product_size.quantity, 4)

    def test_regular_user_cannot_use_staff_create(self):
        self.client.force_authenticate(user=self.customer)
        res = self.client.post(
            STAFF_CREATE_URL,
            {
                "delivery": {
                    "recipient_full_name": "X",
                    "recipient_phone": "+380991234567",
                    "delivery_type": DeliveryInfo.DeliveryTypeChoices.PICKUP,
                },
                "items": [{"product_size": self.product_size.id, "quantity": 1}],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


QUICK_SALE_URL = "/api/shop/orders/staff/quick_sale/"
CONFIRM_PAYMENT_URL = "/api/shop/orders/{id}/confirm_payment/"


class StoreQrSaleTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor, is_published=True)
        self.product_size = create_product_size(self.product, quantity=3)
        self.seller = create_user(email="seller@example.com", is_seller=True)

    def test_quick_sale_creates_store_order(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.post(
            QUICK_SALE_URL,
            {"product_size": self.product_size.id, "quantity": 1},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["sale_channel"], "store")
        self.assertEqual(res.data["status"], "pending")
        self.product_size.refresh_from_db()
        self.assertEqual(self.product_size.quantity, 2)

    def test_confirm_payment_marks_received(self):
        self.client.force_authenticate(user=self.seller)
        create = self.client.post(
            QUICK_SALE_URL,
            {"product_size": self.product_size.id, "quantity": 1},
            format="json",
        )
        order_id = create.data["id"]
        res = self.client.post(CONFIRM_PAYMENT_URL.format(id=order_id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "received")

    def test_scan_info_requires_seller(self):
        res = self.client.get(
            f"/api/shop/product-sizes/{self.product_size.id}/scan_info/"
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_qr_code_returns_print_label_png(self):
        from PIL import Image

        self.client.force_authenticate(user=self.seller)
        res = self.client.get(
            f"/api/shop/product-sizes/{self.product_size.id}/qr_code/"
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res["Content-Type"], "image/png")
        image = Image.open(io.BytesIO(res.content))
        self.assertEqual(image.size, (591, 945))
