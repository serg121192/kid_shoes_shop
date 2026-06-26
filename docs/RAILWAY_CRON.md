# Railway Cron — автосинхронізація Нової Пошти

Команда: `python manage.py sync_np_statuses`

Перевіряє замовлення зі статусом **В обробці** / **Виконано**, у яких є ТТН, і оновлює статус на **Отримано** або **Відмова** за даними НП.

## Помилка `SECRET_KEY setting must not be empty`

Cron-сервіс — **окремий** сервіс Railway. Змінні з backend **не копіюються автоматично**.

Додай у cron-сервісі (`np-sync-cron` → **Variables**):

```
SECRET_KEY=<той самий рядок, що в основному backend>
```

Потім **Redeploy**.

---

## Налаштування (один раз)

1. Відкрий проєкт на [railway.app](https://railway.app).
2. **New** → **Service** → **GitHub Repo** → `kid_shoes_shop` (той самий репозиторій).
3. Назви сервіс, наприклад: `np-sync-cron`.
4. **Settings** → **Config-as-code** → **Config file path** → `railway.np-sync.toml`
5. **Variables** — мінімум для роботи cron:

| Змінна | Обовʼязково | Примітка |
|--------|-------------|----------|
| `SECRET_KEY` | **Так** | Той самий, що в backend (інакше Django не стартує) |
| `RAILWAY_DB_URL` або `DATABASE_URL` | **Так** | Доступ до PostgreSQL |
| `NOVA_POSHTA_API_KEY` | **Так** | Запити до API НП |
| `DEBUG` | Рекомендовано | `False` |
| `TIME_ZONE` | Рекомендовано | `Europe/Kyiv` |
| `EMAIL_BACKEND` | Якщо листи при зміні статусу | `shop.backends.resend.ResendEmailBackend` |
| `RESEND_API_KEY` | Якщо листи | Той самий ключ Resend |
| `DEFAULT_FROM_EMAIL` | Якщо листи | `ТАК і ТАК <noreply@tak-i-tak.com>` |
| `MANAGER_EMAIL` | Якщо листи | Email менеджера |
| `FRONTEND_URL` | Якщо листи | `https://tak-i-tak.com` |

### Як швидко скопіювати змінні

**Варіант A — Shared Variables (зручно надалі):**

1. Project → **Shared Variables** → додай `SECRET_KEY`, `RAILWAY_DB_URL`, `NOVA_POSHTA_API_KEY` тощо.
2. У кожному сервісі (backend + cron) підключи shared variables.

**Варіант B — вручну:**

1. Відкрий основний backend → **Variables** → **RAW Editor** → скопіюй весь блок.
2. Cron-сервіс → **Variables** → **RAW Editor** → встав (можна без `PORT`, `RAILWAY_*` deploy-змінних, якщо є).

6. **Deploy** — сервіс має запускати лише `python manage.py sync_np_statuses`, не gunicorn.

## Перевірка

- **Deployments** → deploy завершується успішно (не падає одразу з `SECRET_KEY`).
- **Logs** — рядки на кшталт `Знайдено N замовлень для перевірки...`
- Розклад у UTC: `*/30 * * * *` = кожні 30 хвилин.

## Ручний запуск

Railway → **np-sync-cron** (або backend) → **Shell**:

```bash
python manage.py sync_np_statuses
python manage.py sync_np_statuses --dry-run
```
