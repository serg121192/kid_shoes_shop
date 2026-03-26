import os
import uuid

from django.db import models
from django.conf import settings
from django.utils.text import slugify


def image_converter(instance, file_name: str) -> str:
    _, extension = os.path.splitext(file_name)
    file_name = f"{slugify(instance.vendor.name + ' ' + instance.model_name)}" + \
    f"-{uuid.uuid4()}{extension}"

    return os.path.join("uploads/products/", file_name)


class Product(models.Model):
    class SeasonChoices(models.TextChoices):
        WINTER = "Winter"
        SPRING = "Spring"
        SUMMER = "Summer"
        AUTUMN = "Autumn"

    class SizeChoices(models.IntegerChoices):
        small_19 = 19, "Newborn_19"
        small_20 = 20, "Newborn_20"
        small_21 = 21, "Newborn_21"
        small_22 = 22, "Newborn_22"
        small_23 = 23, "preschool_23"
        small_24 = 24, "preschool_24"
        small_25 = 25, "preschool_25"
        small_26 = 26, "preschool_26"
        small_27 = 27, "preschool_27"
        medium_28 = 28, "elementary_28"

    class ProductTypeChoices(models.TextChoices):
        SHOE = "Shoe"
        SANDALS = "Sandals"
        SNEACKERS = "Sneackers"
        UGI = "Ugi"

    class GenderChoices(models.TextChoices):
        BOY = "Boy"
        GIRL = "Girl"
        UNKNOWN = "Unknown"

    vendor = models.ForeignKey("Vendor", on_delete=models.CASCADE)
    model_name = models.CharField(max_length=100)
    prod_type = models.CharField(
        max_length=20,
        choices=ProductTypeChoices.choices
    )
    gender = models.CharField(
        max_length=10,
        choices=GenderChoices.choices,
        default=GenderChoices.UNKNOWN
    )
    quanity = models.IntegerField()
    country = models.CharField(max_length=60)
    season = models.CharField(
        max_length=25,
        choices=SeasonChoices.choices
    )
    size = models.IntegerField(choices=SizeChoices.choices)
    price = models.IntegerField()
    image = models.ImageField(null=True, upload_to=image_converter)

    def __str__(self):
        return f"{self.vendor} {self.model_name}"


class Vendor(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class Cart(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_items"
    )
    quanity = models.IntegerField()


class Order(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quanity = models.IntegerField()
    price = models.IntegerField()


class Wishlist(models.Model):
    products = models.ManyToManyField(Product, through="WishlistItem")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )


class WishlistItem(models.Model):
    wishlist = models.ForeignKey(
        Wishlist,
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("wishlist", "product")