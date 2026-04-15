from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import Product, Vendor, Cart, CartItem

User = get_user_model()

CART_URL = "/api/shop/cart/"
CART_ADD_URL = "/api/shop/cart/me/cart_add/"
CART_REMOVE_URL = "/api/shop/cart/me/cart_remove/"

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


class CartAccessTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.user = create_user()

    def test_cart_access_unauthenticated_returns_401(self):
        res = self.client.get(CART_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cart_access_authenticated_returns_200(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(CART_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_cart_access_authenticated_returns_cart_items(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(CART_URL)
        self.assertEqual(res.data["count"], 0)


class CartAddItemTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.user = create_user()        

    def test_add_item_unauthenticated_returns_401(self):
        res = self.client.post(CART_ADD_URL, {"product": self.product.id})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_item_authenticated_returns_201(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CART_ADD_URL, {"product": self.product.id})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_add_same_item_and_quantity_grows(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(CART_ADD_URL, {"product": self.product.id})
        self.client.post(CART_ADD_URL, {"product": self.product.id})

        cart_item = CartItem.objects.get(cart__user=self.user, product=self.product)
        self.assertEqual(cart_item.quantity, 2)

    def test_add_unavailable_item_returns_400(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CART_ADD_URL, {"product": 5})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_unavailable_quantity_of_item_returns_400(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CART_ADD_URL, {"product": self.product.id, "quantity": 11})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class CartRemoveItemTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.user = create_user()
        self.cart = Cart.objects.create(user=self.user)
        self.cart_item = CartItem.objects.create(cart=self.cart, product=self.product, quantity=5)

    def test_remove_item_unauthenticated_returns_401(self):
        res = self.client.post(CART_REMOVE_URL, {"product": self.product.id})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_remove_item_authenticated_returns_204(self):
        self.client.force_authenticate(user=self.user)
        self.cart_item.quantity = 1
        self.cart_item.save()
        res = self.client.post(CART_REMOVE_URL, {"product": self.product.id})
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CartItem.objects.filter(id=self.cart_item.id).exists())

    def test_remove_part_of_items_returns_204(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CART_REMOVE_URL, {"product": self.product.id, "quantity": 2})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.cart_item.refresh_from_db()
        self.assertEqual(self.cart_item.quantity, 3)

    def test_remove_more_than_available_quantity_returns_204(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CART_REMOVE_URL, {"product": self.product.id, "quantity": 11})
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CartItem.objects.filter(id=self.cart_item.id).exists())

    def test_remove_unavailable_item_returns_404(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(CART_REMOVE_URL, {"product": 5})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class CartListTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.user = create_user()
        self.cart = Cart.objects.create(user=self.user)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=1
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
            cart["total_price"],
            self.product.discounted_price * self.cart_item.quantity
        )
