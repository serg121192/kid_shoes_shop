from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0026_product_seasons_remove_season"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="prod_type",
            field=models.CharField(
                choices=[
                    ("Shoe", "Черевики"),
                    ("Boots", "Чоботи"),
                    ("Sandals", "Сандалі"),
                    ("Sneakers", "Кросівки"),
                    ("DressShoes", "Туфлі"),
                    ("Ugi", "Угі"),
                ],
                max_length=20,
                verbose_name="Тип товару",
            ),
        ),
    ]
