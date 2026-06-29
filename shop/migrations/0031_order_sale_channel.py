from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0030_order_user_nullable_created_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="sale_channel",
            field=models.CharField(
                choices=[("online", "Онлайн"), ("store", "Магазин")],
                default="online",
                max_length=10,
                verbose_name="Канал продажу",
            ),
        ),
    ]
