from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("user", "0003_alter_user_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_seller",
            field=models.BooleanField(
                default=False,
                help_text="Доступ до панелі продавця: перегляд і оформлення замовлень.",
                verbose_name="продавець",
            ),
        ),
    ]
