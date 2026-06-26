from decimal import Decimal

from django.db import migrations, models


def publish_products_with_price(apps, schema_editor):
    Product = apps.get_model("shop", "Product")
    Product.objects.filter(full_price__gt=Decimal("0")).update(is_published=True)


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0024_alter_product_slug"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="is_published",
            field=models.BooleanField(
                default=False,
                verbose_name="Показувати в каталозі",
            ),
        ),
        migrations.AlterField(
            model_name="product",
            name="full_price",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=10,
                verbose_name="Повна ціна (грн)",
            ),
        ),
        migrations.RunPython(publish_products_with_price, migrations.RunPython.noop),
    ]
