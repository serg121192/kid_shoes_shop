from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0027_alter_product_prod_type"),
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
                    ("Booties", "Пінетки"),
                    ("Ugi", "Угі"),
                ],
                max_length=20,
                verbose_name="Тип товару",
            ),
        ),
    ]
