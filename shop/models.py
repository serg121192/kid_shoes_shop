from django.db import models
from django.conf import settings


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

    class TypeChoices(models.TextChoices):
        SHOE = "Shoe"
        SANDALS = "Sandals"
        SNEACKERS = "Sneackers"
        UGI = "Ugi"

    vendor = models.ForeignKey("Vendor", on_delete=models.CASCADE)
    model_name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TypeChoices.choices)
    quanity = models.IntegerField()
    country = models.CharField(max_length=60)
    season = models.CharField(max_length=25, choices=SeasonChoices.choices)
    size = models.IntegerField(choices=SizeChoices.choices)
    price = models.IntegerField()


class Vendor(models.Model):
    name = models.CharField(max_length=255, unique=True)


class Cart(models.Model):
    pass


class CartItem(models.Model):
    pass


class Order(models.Model):
    pass


class OrderItem(models.Model):
    pass


class Wishlist(models.Model):
    pass
