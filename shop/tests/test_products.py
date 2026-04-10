from decimal import Decimal
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from shop.models import Product, Vendor


User = get_user_model()


def create_vendor(name:str = "Nike") -> Vendor:
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
    email:str = "test@example.com",
    password:str = "testpassword"
    ) -> User:
    return User.objects.create_user(email=email, password=password)


class ProductTests(APITestCase):
    def setUp(self):
        self.vendor = create_vendor()
        self.product = create_product(self.vendor)
        self.user = create_user()
