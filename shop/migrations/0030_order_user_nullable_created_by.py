from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("shop", "0029_alter_productsize_size"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="orders_created",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Оформив",
            ),
        ),
        migrations.AlterField(
            model_name="order",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.CASCADE,
                to=settings.AUTH_USER_MODEL,
                verbose_name="Користувач",
            ),
        ),
    ]
