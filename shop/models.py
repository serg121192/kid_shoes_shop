import os
import uuid

from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.exceptions import ValidationError


def image_converter(instance, file_name: str) -> str:
    _, extension = os.path.splitext(file_name)
    file_name = f"{slugify(instance.vendor.name + ' ' + instance.model_name)}" + \
    f"-{uuid.uuid4()}{extension}"

    return file_name


class Product(models.Model):
    class SeasonChoices(models.TextChoices):
        WINTER = "Winter"
        SUMMER = "Summer"
        DEMISEASON = "Demiseason"
        FleaseDIMESEASON = "Flease Demiseason"

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
        BOY = "boy", "Boy"
        GIRL = "girl", "Girl"
        UNISEX = "unisex", "Unisex"

    vendor = models.ForeignKey("Vendor", on_delete=models.CASCADE)
    model_name = models.CharField(max_length=100)
    prod_type = models.CharField(
        max_length=20,
        choices=ProductTypeChoices.choices
    )
    gender = models.CharField(
        max_length=10,
        choices=GenderChoices.choices,
        blank=True,
        default=GenderChoices.UNISEX
    )
    quantity = models.PositiveIntegerField()
    season = models.CharField(
        max_length=25,
        choices=SeasonChoices.choices
    )
    size = models.IntegerField(choices=SizeChoices.choices)
    full_price = models.IntegerField()
    discount = models.IntegerField(default=0)
    image = models.ImageField(null=True, upload_to=image_converter)
    description = models.TextField(null=True, blank=True, max_length=1100)

    @property
    def quantity_message(self):
        if self.quantity < 5:
            return "Закінчується"
        elif self.quantity < 10:
            return "Поспішіть придбати!"
        else:
            return "В наявності"
        
    @property
    def discounted_price(self):
        return self.full_price - (self.full_price * self.discount // 100)
    
    def reduce_stock(self, amount: int) -> None:
        if amount > self.quantity:
            raise ValueError("Not enough stock available")
        self.quantity -= amount
        self.save()

    def clean(self):
        if self.discount < 0 or self.discount > 100:
            raise ValidationError("Discount must be between 0 and 100")

    def __str__(self):
        return f"{self.vendor} {self.model_name}"
    
    class Meta:
        unique_together = ("vendor", "model_name", "size")


class Vendor(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class Cart(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )

    def clear(self):
        self.cart_items.all().delete()


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="cart_items"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_items"
    )
    quantity = models.PositiveIntegerField(default=1, editable=True)


class Order(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING
    )
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )

    def calculate_total_price(self):
        total = sum(item.price * item.quantity for item in self.items.all())
        self.total_price = total
        self.save()


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    @staticmethod
    def validate_product_quantity(
        product: Product,
        quantity: int,
        error_to_raise: Exception
    ):
        if not (1 <= quantity <= product.quantity):
            raise error_to_raise("Not available amount of product!")


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
