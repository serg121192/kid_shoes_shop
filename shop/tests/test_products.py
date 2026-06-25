from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from shop.models import Product, ProductSize, Vendor

User = get_user_model()

PRODUCTS_URL = "/api/shop/products/"


def detail_url(product):
    return f"{PRODUCTS_URL}{product.slug}/"


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


def create_product_size(
    product: Product, size: int = 25, quantity: int = 10
) -> ProductSize:
    return ProductSize.objects.create(
        product=product, size=size, quantity=quantity
    )


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


class ProductListTests(APITestCase):

    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        create_product_size(self.product)

    def test_list_unauthenticated_allowed(self):
        res = self.client.get(PRODUCTS_URL)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_list_returns_list_serializer_fields(self):
        res = self.client.get(PRODUCTS_URL)

        product = res.data["results"][0]
        self.assertIn("exists", product)
        self.assertIn("discounted_price", product)
        self.assertNotIn("description", product)

    def test_filter_by_size(self):
        other = create_product(self.vendor, model_name="Other")
        create_product_size(other, size=27)

        res = self.client.get(PRODUCTS_URL, {"size": 25})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["model_name"], "Air Max")

    def test_filter_by_vendor(self):
        other_vendor = create_vendor(name="Adidas")
        create_product(other_vendor, model_name="Stan Smith")

        res = self.client.get(PRODUCTS_URL, {"vendor": self.vendor.id})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_filter_by_prod_type(self):
        sandal = create_product(
            self.vendor,
            model_name="Sandal X",
            prod_type=Product.ProductTypeChoices.SANDALS,
        )
        create_product_size(sandal, size=26)

        res = self.client.get(
            PRODUCTS_URL, {"prod_type": Product.ProductTypeChoices.SNEAKERS}
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_filter_min_price(self):
        cheap = create_product(
            self.vendor, model_name="Cheap", full_price=Decimal("200.00")
        )
        create_product_size(cheap, size=26)

        res = self.client.get(PRODUCTS_URL, {"min_price": 500})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["model_name"], "Air Max")

    def test_filter_max_price(self):
        expensive = create_product(
            self.vendor, model_name="Expensive", full_price=Decimal("5000.00")
        )
        create_product_size(expensive, size=26)

        res = self.client.get(PRODUCTS_URL, {"max_price": 2000})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["model_name"], "Air Max")

    def test_filter_has_discount_true(self):
        sale = create_product(self.vendor, model_name="On Sale", discount=20)
        create_product_size(sale, size=26)

        res = self.client.get(PRODUCTS_URL, {"has_discount": True})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["model_name"], "On Sale")

    def test_filter_has_discount_false(self):
        sale = create_product(self.vendor, model_name="On Sale", discount=20)
        create_product_size(sale, size=26)

        res = self.client.get(PRODUCTS_URL, {"has_discount": False})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["model_name"], "Air Max")

    def test_search_by_model_name(self):
        other = create_product(self.vendor, model_name="React Zoom")
        create_product_size(other, size=26)

        res = self.client.get(PRODUCTS_URL, {"search": "React"})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["model_name"], "React Zoom")

    def test_search_by_vendor_name(self):
        other_vendor = create_vendor(name="Puma")
        puma_product = create_product(other_vendor, model_name="Suede")
        create_product_size(puma_product, size=26)

        res = self.client.get(PRODUCTS_URL, {"search": "Puma"})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_ordering_by_price_ascending(self):
        cheap = create_product(
            self.vendor, model_name="Cheap", full_price=Decimal("500.00")
        )
        create_product_size(cheap, size=26)

        res = self.client.get(PRODUCTS_URL, {"ordering": "full_price"})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        prices = [Decimal(p["discounted_price"]) for p in res.data["results"]]
        self.assertEqual(prices, sorted(prices))

    def test_ordering_by_price_descending(self):
        cheap = create_product(
            self.vendor, model_name="Cheap", full_price=Decimal("500.00")
        )
        create_product_size(cheap, size=26)

        res = self.client.get(PRODUCTS_URL, {"ordering": "-full_price"})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        prices = [Decimal(p["discounted_price"]) for p in res.data["results"]]
        self.assertEqual(prices, sorted(prices, reverse=True))


class ProductDetailTests(APITestCase):

    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.product_size = create_product_size(self.product)

    def test_retrieve_unauthenticated_allowed(self):
        res = self.client.get(detail_url(self.product))

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["model_name"], self.product.model_name)

    def test_retrieve_returns_retrieve_serializer_fields(self):
        res = self.client.get(detail_url(self.product))

        self.assertIn("description", res.data)
        self.assertIn("full_price", res.data)
        self.assertIn("sizes", res.data)
        self.assertIn("in_wishlist", res.data)

    def test_retrieve_size_in_cart_false_when_not_authenticated(self):
        res = self.client.get(detail_url(self.product))

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for sz in res.data["sizes"]:
            self.assertFalse(sz["in_cart"])

    def test_retrieve_nonexistent_returns_404(self):
        res = self.client.get(f"{PRODUCTS_URL}99999/")

        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_slug_with_dot(self):
        dot_product = Product.objects.create(
            vendor=self.vendor,
            model_name="Model 871",
            prod_type=Product.ProductTypeChoices.SNEAKERS,
            gender=Product.GenderChoices.UNISEX,
            season=Product.SeasonChoices.SUMMER,
            full_price=Decimal("1200.00"),
            discount=0,
            slug="Tom.m-871",
        )
        ProductSize.objects.create(product=dot_product, size=25, quantity=10)

        res = self.client.get(detail_url(dot_product))

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["slug"], dot_product.slug)

    def test_discounted_price_calculated_correctly(self):
        product = create_product(
            self.vendor,
            model_name="Discounted",
            full_price=Decimal("1000.00"),
            discount=20,
        )
        res = self.client.get(detail_url(product))

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Decimal(res.data["discounted_price"]), Decimal("800.00")
        )
        self.assertEqual(Decimal(res.data["full_price"]), Decimal("1000.00"))


class ProductCreateTests(APITestCase):

    def setUp(self):
        self.vendor = create_vendor()
        self.payload = {
            "vendor": self.vendor.id,
            "model_name": "React",
            "prod_type": Product.ProductTypeChoices.SNEAKERS,
            "gender": Product.GenderChoices.UNISEX,
            "season": Product.SeasonChoices.SUMMER,
            "full_price": "999.00",
            "discount": 0,
        }

    def test_create_unauthenticated_returns_401(self):
        res = self.client.post(PRODUCTS_URL, self.payload)

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_regular_user_returns_403(self):
        user = create_user()
        self.client.force_authenticate(user=user)

        res = self.client.post(PRODUCTS_URL, self.payload)

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_admin_success(self):
        admin = create_user(email="admin@test.com", is_staff=True)
        self.client.force_authenticate(user=admin)

        res = self.client.post(PRODUCTS_URL, self.payload)

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Product.objects.filter(model_name="React").exists())

    def test_create_with_invalid_discount_returns_400(self):
        admin = create_user(email="admin@test.com", is_staff=True)
        self.client.force_authenticate(user=admin)
        self.payload["discount"] = 150

        res = self.client.post(PRODUCTS_URL, self.payload)

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ProductUpdateTests(APITestCase):

    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        create_product_size(self.product)

    def test_update_unauthenticated_returns_401(self):
        res = self.client.patch(detail_url(self.product), {"discount": 10})

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_regular_user_returns_403(self):
        user = create_user()
        self.client.force_authenticate(user=user)

        res = self.client.patch(detail_url(self.product), {"discount": 10})

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_admin_success(self):
        admin = create_user(email="admin@test.com", is_staff=True)
        self.client.force_authenticate(user=admin)

        res = self.client.patch(detail_url(self.product), {"discount": 10})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.discount, 10)


class ProductDeleteTests(APITestCase):

    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        create_product_size(self.product)

    def test_delete_unauthenticated_returns_401(self):
        res = self.client.delete(detail_url(self.product))

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_regular_user_returns_403(self):
        user = create_user()
        self.client.force_authenticate(user=user)

        res = self.client.delete(detail_url(self.product))

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_admin_success(self):
        admin = create_user(email="admin@test.com", is_staff=True)
        self.client.force_authenticate(user=admin)

        res = self.client.delete(detail_url(self.product))

        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(id=self.product.id).exists())
