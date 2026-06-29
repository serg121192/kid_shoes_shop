from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0028_alter_product_prod_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="productsize",
            name="size",
            field=models.IntegerField(
                choices=[
                    (16, "16"),
                    (17, "17"),
                    (18, "18"),
                    (19, "19"),
                    (20, "20"),
                    (21, "21"),
                    (22, "22"),
                    (23, "23"),
                    (24, "24"),
                    (25, "25"),
                    (26, "26"),
                    (27, "27"),
                    (28, "28"),
                    (29, "29"),
                    (30, "30"),
                    (31, "31"),
                    (32, "32"),
                    (33, "33"),
                    (34, "34"),
                    (35, "35"),
                    (36, "36"),
                    (37, "37"),
                    (38, "38"),
                    (39, "39"),
                    (40, "40"),
                    (41, "41"),
                    (42, "42"),
                    (43, "43"),
                    (44, "44"),
                ],
                verbose_name="Розмір",
            ),
        ),
    ]
