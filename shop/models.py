import os
import uuid

from django.db import models
from django.db.models import F, Sum
from django.conf import settings
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator


def image_converter(instance, file_name: str) -> str:
    """Kept for migration compatibility only — no longer used by any model field."""
    _, extension = os.path.splitext(file_name)
    file_name = (
        f"{slugify(instance.vendor.name + ' ' + instance.model_name)}-{uuid.uuid4()}{extension}"
    )
    return f"products/{file_name}"


def gallery_image_converter(instance, file_name: str) -> str:
    _, extension = os.path.splitext(file_name)
    slug = slugify(instance.product.vendor.name + " " + instance.product.model_name)
    return f"products/gallery/{slug}-{uuid.uuid4()}{extension}"


def video_converter(instance, file_name: str) -> str:
    _, extension = os.path.splitext(file_name)
    slug = slugify(instance.product.vendor.name + " " + instance.product.model_name)
    return f"products/videos/{slug}-{uuid.uuid4()}{extension}"


class Product(models.Model):
    class SeasonChoices(models.TextChoices):
        WINTER = "Winter", "Зима"
        SUMMER = "Summer", "Літо"
        DEMISEASON = "Demiseason", "Демісезон"
        FLEECE_DEMISEASON = "Fleece Demiseason", "Демісезон флісовий"

    class ProductTypeChoices(models.TextChoices):
        SHOE = "Shoe", "Черевики"
        SANDALS = "Sandals", "Сандалі"
        SNEAKERS = "Sneakers", "Кросівки/Кеди"
        UGI = "Ugi", "Угі"

    class GenderChoices(models.TextChoices):
        BOY = "boy", "Хлопчик"
        GIRL = "girl", "Дівчинка"
        UNISEX = "unisex", "Хлопчик/Дівчинка"

    vendor = models.ForeignKey("Vendor", on_delete=models.CASCADE, verbose_name="Виробник")
    model_name = models.CharField(max_length=100, verbose_name="Назва моделі")
    prod_type = models.CharField(
        max_length=20,
        choices=ProductTypeChoices.choices,
        verbose_name="Тип товару",
    )
    gender = models.CharField(
        max_length=10,
        choices=GenderChoices.choices,
        blank=True,
        default=GenderChoices.UNISEX,
        verbose_name="Стать",
    )
    season = models.CharField(
        max_length=25,
        choices=SeasonChoices.choices,
        verbose_name="Сезон",
    )
    full_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Повна ціна (грн)")
    discount = models.IntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        verbose_name="Знижка (%)",
    )
    description = models.TextField(null=True, blank=True, max_length=1100, verbose_name="Короткий опис")
    seo_description = models.TextField(null=True, blank=True, verbose_name="Детальний опис (SEO)")

    @property
    def quantity_message(self):
        total = self.sizes.aggregate(total=Sum("quantity"))["total"] or 0
        if total == 0:
            return "Товар закінчився"
        elif total < 5:
            return "Товар закінчується. Поспішіть придбати!"
        else:
            return "В наявності"

    @property
    def discounted_price(self):
        if self.full_price is None:
            return None
        return self.full_price - (self.full_price * self.discount // 100)

    def __str__(self):
        return f"{self.vendor} {self.model_name}"

    class Meta:
        unique_together = ("vendor", "model_name")
        verbose_name = "Товар"
        verbose_name_plural = "Товари"


class ProductSize(models.Model):
    class SizeChoices(models.IntegerChoices):
        small_18 = 18, "18"
        small_19 = 19, "19"
        small_20 = 20, "20"
        small_21 = 21, "21"
        small_22 = 22, "22"
        small_23 = 23, "23"
        small_24 = 24, "24"
        small_25 = 25, "25"
        small_26 = 26, "26"
        small_27 = 27, "27"
        medium_28 = 28, "28"
        medium_29 = 29, "29"
        medium_30 = 30, "30"
        medium_31 = 31, "31"
        medium_32 = 32, "32"
        medium_33 = 33, "33"
        medium_34 = 34, "34"
        medium_35 = 35, "35"
        medium_36 = 36, "36"
        medium_37 = 37, "37"
        medium_38 = 38, "38"
        medium_39 = 39, "39"
        medium_40 = 40, "40"
        medium_41 = 41, "41"
        medium_42 = 42, "42"
        medium_43 = 43, "43"
        medium_44 = 44, "44"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="sizes",
        verbose_name="Товар",
    )
    size = models.IntegerField(choices=SizeChoices.choices, verbose_name="Розмір")
    quantity = models.PositiveIntegerField(default=0, verbose_name="Кількість")

    def reduce_stock(self, amount: int) -> None:
        if amount > self.quantity:
            raise ValueError("Not enough stock available")
        ProductSize.objects.filter(id=self.id).update(quantity=F("quantity") - amount)

    class Meta:
        unique_together = ("product", "size")
        ordering = ["size"]
        verbose_name = "Розмір товару"
        verbose_name_plural = "Розміри товарів"

    def __str__(self):
        return f"{self.product} — розмір {self.size}"


Product.SizeChoices = ProductSize.SizeChoices


class Vendor(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name="Назва")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Виробник"
        verbose_name_plural = "Виробники"


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="Користувач",
    )

    class Meta:
        verbose_name = "Кошик"
        verbose_name_plural = "Кошики"

    def clear(self):
        self.cart_items.all().delete()


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="cart_items",
        verbose_name="Кошик",
    )
    product_size = models.ForeignKey(
        ProductSize,
        on_delete=models.CASCADE,
        related_name="cart_items",
        verbose_name="Розмір товару",
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name="Кількість")

    class Meta:
        unique_together = ("cart", "product_size")
        verbose_name = "Позиція кошика"
        verbose_name_plural = "Позиції кошика"


class Order(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING    = "pending",    "Очікується"
        PROCESSING = "processing", "В обробці"
        COMPLETED  = "completed",  "Виконано"
        RECEIVED   = "received",   "Замовлення отримано"
        REFUSED    = "refused",    "Відмова"
        CANCELLED  = "cancelled",  "Скасовано"

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="Користувач"
    )
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
        verbose_name="Статус",
    )
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        verbose_name="Загальна сума (грн)",
    )
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Замовлення"
        verbose_name_plural = "Замовлення"

    def __str__(self):
        return f"Замовлення № {self.id}" if self.id else "Нове замовлення"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Замовлення",
    )
    product_size = models.ForeignKey(
        ProductSize, on_delete=models.PROTECT, verbose_name="Розмір товару"
    )
    quantity = models.PositiveIntegerField(verbose_name="Кількість")
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Ціна (грн)")

    class Meta:
        verbose_name = "Позиція замовлення"
        verbose_name_plural = "Позиції замовлення"

    def __str__(self):
        return f"{self.product_size} × {self.quantity} шт."

    @staticmethod
    def validate_product_quantity(
        product_size: "ProductSize",
        quantity: int,
        error_to_raise: type
    ):
        if not (1 <= quantity <= product_size.quantity):
            raise error_to_raise("Not available amount of product!")


ua_phone_validator = RegexValidator(
    regex=r"^\+380\d{9}$",
    message="Введіть номер у форматі +380XXXXXXXXX",
)


class DeliveryInfo(models.Model):
    class DeliveryTypeChoices(models.TextChoices):
        NP_WAREHOUSE = "np_warehouse", "Нова Пошта: Відділення"
        NP_POSTAMAT = "np_postamat", "Нова Пошта: Поштомат"
        NP_ADDRESS = "np_address", "Нова Пошта: Адресна доставка"
        PICKUP = "pickup", "Самовивіз з магазину"

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="delivery",
        verbose_name="Замовлення",
    )
    recipient_full_name = models.CharField(max_length=255, verbose_name="ПІБ отримувача")
    recipient_phone = models.CharField(
        max_length=20,
        validators=[ua_phone_validator],
        verbose_name="Телефон отримувача",
    )
    delivery_type = models.CharField(
        max_length=20,
        choices=DeliveryTypeChoices.choices,
        default=DeliveryTypeChoices.NP_WAREHOUSE,
        verbose_name="Тип доставки",
    )
    city_name = models.CharField(max_length=255, blank=True, verbose_name="Місто")
    city_ref = models.CharField(max_length=36, blank=True, verbose_name="Ref міста (НП)")
    warehouse_address = models.CharField(max_length=500, blank=True, verbose_name="Адреса відділення")
    warehouse_ref = models.CharField(max_length=36, blank=True, verbose_name="Ref відділення (НП)")
    street = models.CharField(max_length=255, blank=True, verbose_name="Вулиця")
    building_number = models.CharField(max_length=20, blank=True, verbose_name="Номер будинку")
    apartment = models.CharField(max_length=20, blank=True, verbose_name="Квартира")
    tracking_number = models.CharField(max_length=14, blank=True, verbose_name="Номер відстеження")

    def __str__(self):
        return (
            f"Доставка для замовлення #{self.order_id} "
            f"— {self.recipient_full_name}"
        )

    class Meta:
        verbose_name = "Інформація про доставку"
        verbose_name_plural = "Інформація про доставку"


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name="Товар",
    )
    image = models.ImageField(upload_to=gallery_image_converter, verbose_name="Зображення")
    is_main = models.BooleanField(default=False, verbose_name="Головне фото")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")

    class Meta:
        ordering = ["-is_main", "order", "id"]
        verbose_name = "Фото товару"
        verbose_name_plural = "Фото товарів"

    def save(self, *args, **kwargs):
        if self.is_main:
            ProductImage.objects.filter(
                product=self.product, is_main=True
            ).exclude(pk=self.pk).update(is_main=False)
        super().save(*args, **kwargs)

    def __str__(self):
        label = " (головне)" if self.is_main else ""
        return f"Фото {self.product}{label}"


class ProductVideo(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="videos",
        verbose_name="Товар",
    )
    video = models.FileField(upload_to=video_converter, verbose_name="Відео файл")
    title = models.CharField(max_length=255, blank=True, verbose_name="Назва відео")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Відео товару"
        verbose_name_plural = "Відео товарів"

    def __str__(self):
        return f"Відео {self.product}" + (f" — {self.title}" if self.title else "")


class Review(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="Товар",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="Користувач",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Оцінка",
    )
    text = models.TextField(max_length=1000, blank=True, verbose_name="Текст відгуку")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")

    class Meta:
        unique_together = ("product", "user")
        ordering = ["-created_at"]
        verbose_name = "Відгук"
        verbose_name_plural = "Відгуки"

    def __str__(self):
        return f"Відгук {self.user.email} на {self.product} — {self.rating}★"


class SiteVisit(models.Model):
    """One record per unique IP per day — tracks daily unique visitors."""
    ip = models.GenericIPAddressField(verbose_name="IP-адреса")
    date = models.DateField(verbose_name="Дата")

    class Meta:
        unique_together = ("ip", "date")
        verbose_name = "Відвідування"
        verbose_name_plural = "Відвідування"

    def __str__(self):
        return f"{self.ip} — {self.date}"


class Wishlist(models.Model):
    products = models.ManyToManyField(Product, through="WishlistItem", verbose_name="Товари")
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="Користувач"
    )

    class Meta:
        verbose_name = "Список бажань"
        verbose_name_plural = "Списки бажань"


class WishlistItem(models.Model):
    wishlist = models.ForeignKey(
        Wishlist,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Список бажань",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name="Товар")

    class Meta:
        unique_together = ("wishlist", "product")
        verbose_name = "Товар у списку бажань"
        verbose_name_plural = "Товари у списку бажань"
