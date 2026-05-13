from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import Product, ProductSize, Vendor, Cart, CartItem

User = get_user_model()

CART_URL = "/api/shop/cart/"
CART_ADD_URL = "/api/shop/cart/me/cart_add/"
CART_REMOVE_URL = "/api/shop/cart/me/cart_remove/"


def create_vendor(name: str = "Nike") -> Vendor:
    return Vendor.objects.create(name=name)


def create_product(vendor: Vendor, **kwargs) -> Product:
    defaults = {
        "model_name": "Air Max",
        "prod_type": Product.ProductTypeChoices.SNEAKERS,
        "gender": Product.GenderChoices.UNISEX,
        "season": Product.SeasonChoices.SUMMER,
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
) -> User:
    return User.objects.create_user(
        email=email,
        password=password,
        is_staff=is_staff,
    )


class CartAccessTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.product_size = create_product_size(self.product)
        self.user = create_user()

    def test_cart_access_unauthenticated_returns_401(self):
        res = self.client.get(CART_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cart_access_authenticated_returns_200(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(CART_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_cart_access_authenticated_returns_empty_count(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(CART_URL)
        self.assertEqual(res.data["count"], 0)


class CartAddItemTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.product_size = create_product_size(self.product)
        self.user = create_user()

    def test_add_item_unauthenticated_returns_401(self):
        res = self.client.post(CART_ADD_URL, {"product_size": self.product_size.id})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_item_authenticated_returns_201(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CART_ADD_URL, {"product_size": self.product_size.id})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_add_same_item_quantity_grows(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(CART_ADD_URL, {"product_size": self.product_size.id})
        self.client.post(CART_ADD_URL, {"product_size": self.product_size.id})

        cart_item = CartItem.objects.get(cart__user=self.user, product_size=self.product_size)
        self.assertEqual(cart_item.quantity, 2)

    def test_add_nonexistent_product_size_returns_400(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CART_ADD_URL, {"product_size": 99999})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_quantity_exceeding_stock_returns_400(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            CART_ADD_URL,
            {"product_size": self.product_size.id, "quantity": 11},
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_out_of_stock_size_returns_400(self):
        out_of_stock = create_product_size(self.product, size=26, quantity=0)
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CART_ADD_URL, {"product_size": out_of_stock.id})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class CartRemoveItemTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.product_size = create_product_size(self.product)
        self.user = create_user()
        self.cart = Cart.objects.create(user=self.user)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product_size=self.product_size,
            quantity=5,
        )

    def test_remove_item_unauthenticated_returns_401(self):
        res = self.client.post(CART_REMOVE_URL, {"product_size": self.product_size.id})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_remove_item_authenticated_returns_204(self):
        self.client.force_authenticate(user=self.user)
        self.cart_item.quantity = 1
        self.cart_item.save()
        res = self.client.post(CART_REMOVE_URL, {"product_size": self.product_size.id})
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CartItem.objects.filter(id=self.cart_item.id).exists())

    def test_remove_part_of_items_returns_200(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            CART_REMOVE_URL,
            {"product_size": self.product_size.id, "quantity": 2},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 3)

    def test_remove_more_than_available_quantity_removes_item(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            CART_REMOVE_URL,
            {"product_size": self.product_size.id, "quantity": 11},
        )
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CartItem.objects.filter(id=self.cart_item.id).exists())

    def test_remove_nonexistent_item_returns_404(self):
        self.client.force_authenticate(user=self.user)
        other_size = create_product_size(self.product, size=30, quantity=5)
        res = self.client.post(CART_REMOVE_URL, {"product_size": other_size.id})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class CartListTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.product_size = create_product_size(self.product)
        self.user = create_user()
        self.cart = Cart.objects.create(user=self.user)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product_size=self.product_size,
            quantity=1,
        )

    def test_list_unauthenticated_returns_401(self):
        res = self.client.get(CART_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_authenticated_returns_200(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(CART_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        cart = res.data["results"][0]
        self.assertIn("cart_items", cart)
        self.assertIn("total_price", cart)
        self.assertEqual(
            Decimal(cart["total_price"]),
            self.product.discounted_price * self.cart_item.quantity,
        )
