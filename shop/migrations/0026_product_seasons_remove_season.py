from django.db import migrations, models


def copy_season_to_seasons(apps, schema_editor):
    Product = apps.get_model("shop", "Product")
    for product in Product.objects.all():
        season = getattr(product, "season", None)
        if season:
            product.seasons = [season]
            product.save(update_fields=["seasons"])


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0025_product_is_published_alter_product_full_price"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="seasons",
            field=models.JSONField(default=list, verbose_name="Сезони"),
        ),
        migrations.RunPython(copy_season_to_seasons, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="product",
            name="season",
        ),
    ]
