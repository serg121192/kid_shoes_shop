import os
import uuid

from django.db import models
from django.db.models import F
from django.conf import settings
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator


def image_converter(instance, file_name: str) -> str:
    _, extension = os.path.splitext(file_name)
    file_name = f"{slugify(instance.vendor.name + ' ' + instance.model_name)}" + \
    f"-{uuid.uuid4()}{extension}"

    return f"products/{file_name}"


class Product(models.Model):
    class SeasonChoices(models.TextChoices):
        WINTER = "Winter"
        SUMMER = "Summer"
        DEMISEASON = "Demiseason"
        FLEECE_DEMISEASON = "Fleece Demiseason"

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
        SNEAKERS = "Sneakers"
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
    full_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.IntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100)
        ]
    )
    image = models.ImageField(null=True, upload_to=image_converter)
    description = models.TextField(null=True, blank=True, max_length=1100)

    @property
    def quantity_message(self):
        if self.quantity == 0:
            return "Товар закінчився"
        elif self.quantity < 5:
            return "Товар закінчується. Поспішіть придбати!"
        else:
            return "В наявності"
        
    @property
    def discounted_price(self):
        if self.full_price is None:
            return None
        return self.full_price - (self.full_price * self.discount // 100)
    
    def reduce_stock(self, amount: int) -> None:
        if amount > self.quantity:
            raise ValueError("Not enough stock available")
        Product.objects.filter(id=self.id).update(quantity=F("quantity") - amount)

    def __str__(self):
        return f"{self.vendor} {self.model_name}"
    
    class Meta:
        unique_together = ("vendor", "model_name", "size")


class Vendor(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )

    class Meta:
        ordering = ["-id"]

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

    class Meta:
        ordering = ["-created_at"]

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


ua_phone_validator = RegexValidator(
    regex=r"^\+380\d{9}$",
    message="Введіть номер у форматі +380XXXXXXXXX",
)


class DeliveryInfo(models.Model):
    class DeliveryTypeChoices(models.TextChoices):
        NP_WAREHOUSE = "np_warehouse", "НоваПошта: Відділення"
        NP_POSTAMAT = "np_postamat", "НоваПошта: Поштомат"
        NP_ADDRESS = "np_address", "НоваПошта: Адресна доставка"

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="delivery",
    )
    recipient_full_name = models.CharField(max_length=255)
    recipient_phone = models.CharField(
        max_length=20,
        validators=[ua_phone_validator],
    )
    delivery_type = models.CharField(
        max_length=20,
        choices=DeliveryTypeChoices.choices,
        default=DeliveryTypeChoices.NP_WAREHOUSE,
    )

    # Місто — обов'язкове для всіх типів доставки
    city_name = models.CharField(max_length=255)
    # UUID міста в системі НоваПошти (заповнюється при інтеграції з НП API)
    city_ref = models.CharField(max_length=36, blank=True)

    # Поля для відділення / поштомату
    warehouse_address = models.CharField(max_length=500, blank=True)
    # UUID відділення в системі НоваПошти (заповнюється при інтеграції з НП API)
    warehouse_ref = models.CharField(max_length=36, blank=True)

    # Поля для адресної доставки
    street = models.CharField(max_length=255, blank=True)
    building_number = models.CharField(max_length=20, blank=True)
    apartment = models.CharField(max_length=20, blank=True)

    # ТТН НоваПошти (заповнюється після створення відправлення через НП API)
    tracking_number = models.CharField(max_length=14, blank=True)

    def clean(self):
        warehouse_types = (
            self.DeliveryTypeChoices.NP_WAREHOUSE,
            self.DeliveryTypeChoices.NP_POSTAMAT,
        )
        if self.delivery_type in warehouse_types:
            if not self.warehouse_address and not self.warehouse_ref:
                raise ValidationError(
                    "Для цього типу доставки потрібна адреса або референс відділення."
                )
        elif self.delivery_type == self.DeliveryTypeChoices.NP_ADDRESS:
            if not self.street or not self.building_number:
                raise ValidationError(
                    "Для адресної доставки вкажіть вулицю та номер будинку."
                )

    def __str__(self):
        return (
            f"Доставка для замовлення #{self.order_id} "
            f"— {self.recipient_full_name}"
        )


class Wishlist(models.Model):
    products = models.ManyToManyField(Product, through="WishlistItem")
    user = models.OneToOneField(
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
