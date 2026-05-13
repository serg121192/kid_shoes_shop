# Kid Shoes Shop

Інтернет-магазин дитячого взуття. Backend — Django REST Framework, Frontend — Next.js 16 + React 19.

---

## Вимоги

| Інструмент | Версія |
|---|---|
| Python | ≥ 3.12 |
| Node.js | ≥ 20 |
| PostgreSQL | ≥ 15 |

---

## Структура проекту

```
kid_shoes_shop/          # Django backend
├── kid_shoes_shop/      # Конфігурація Django (settings, urls, wsgi)
├── shop/                # Основний застосунок (моделі, views, серіалізатори)
│   ├── migrations/
│   ├── tests/
│   │   ├── test_products.py
│   │   ├── test_cart.py
│   │   └── test_orders.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── filters.py
│   └── permissions.py
├── user/                # Автентифікація, JWT через httpOnly cookies
│   ├── authentication.py
│   ├── throttles.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── media/               # Завантажені файли (зображення, відео)
├── .env                 # Змінні середовища (не в git)
└── manage.py

kid_shoes_frontend/      # Next.js frontend
├── app/
│   ├── __tests__/       # Vitest + Testing Library тести
│   ├── components/      # Спільні компоненти (Header, ProductCard, Toast)
│   ├── context/         # React контексти (AuthContext, ShopContext)
│   ├── lib/             # API клієнт (axios з cookie-based auth)
│   ├── types/           # TypeScript типи
│   └── */page.tsx       # Сторінки (products, cart, orders, checkout…)
├── vitest.config.ts
└── package.json
```

---

## Запуск Backend

### 1. Клонуй репозиторій та перейди в директорію

```bash
git clone <repo-url>
cd kid_shoes_shop
```

### 2. Створи та активуй віртуальне середовище

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate
```

### 3. Встанови залежності

```bash
pip install -r requirements.txt
```

### 4. Налаштуй змінні середовища

Скопіюй `.env.example` → `.env` і заповни значення:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True

PG_DB=kid_shoes_shop
PG_USER=postgres
PG_PASSWORD=your_password
PG_HOST=localhost
PG_PORT=5432

FRONTEND_URL=http://localhost:3000

# Email (для скидання паролю)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=noreply@kidshoes.com
```

### 5. Створи базу даних PostgreSQL

```sql
CREATE DATABASE kid_shoes_shop;
```

### 6. Застосуй міграції та створи суперкористувача

```bash
python manage.py migrate
python manage.py createsuperuser
```

### 7. (Опційно) Завантаж тестові дані

```bash
python manage.py loaddata fixtures/initial_data.json
```

### 8. Запусти сервер розробки

```bash
python manage.py runserver
```

Backend доступний за адресою: `http://127.0.0.1:8000`

**Корисні URL:**
- Swagger UI: `http://127.0.0.1:8000/api/doc/swagger/`
- Django Admin: `http://127.0.0.1:8000/admin/`
- Debug Toolbar: доступний лише при `DEBUG=True`

---

## Запуск Frontend

### 1. Перейди в директорію і встанови залежності

```bash
cd kid_shoes_frontend
npm install
```

### 2. Налаштуй змінні середовища

Створи файл `.env.local`:

```env
NEXT_PUBLIC_MEDIA_BASE=http://127.0.0.1:8000
```

### 3. Запусти сервер розробки

```bash
npm run dev
```

Frontend доступний за адресою: `http://localhost:3000`

---

## Тести

### Backend (Django)

```bash
# Запустити всі тести
python manage.py test shop.tests

# З детальним виводом
python manage.py test shop.tests --verbosity=2
```

### Frontend (Vitest + Testing Library)

```bash
cd kid_shoes_frontend

# Один запуск
npm test

# Watch mode
npm run test:watch
```

---

## Автентифікація

Автентифікація реалізована через **JWT у httpOnly cookies**:

- `POST /api/user/token/` — логін, встановлює `access_token` і `refresh_token` cookies
- `POST /api/user/token/refresh/` — оновлення токена (читає `refresh_token` cookie автоматично)
- `POST /api/user/logout/` — очищує cookies

Rate limiting:
- `/api/user/token/` — 10 спроб/хвилину
- `/api/user/token/refresh/` — 30 запитів/хвилину

---

## Основні API ендпоінти

| Метод | URL | Опис |
|---|---|---|
| GET | `/api/shop/products/` | Список товарів (фільтри, пошук, сортування) |
| GET | `/api/shop/products/{id}/` | Деталі товару |
| GET/POST | `/api/shop/cart/` | Кошик |
| POST | `/api/shop/cart/me/cart_add/` | Додати до кошика |
| POST | `/api/shop/cart/me/cart_remove/` | Видалити з кошика |
| GET | `/api/shop/orders/` | Мої замовлення |
| POST | `/api/shop/orders/me/create_order/` | Оформити замовлення |
| POST | `/api/shop/orders/{id}/cancel/` | Скасувати замовлення |
| PATCH | `/api/shop/orders/{id}/update_status/` | Змінити статус (лише адмін) |
| GET/POST | `/api/shop/wishlist/` | Список вибраного |
| POST | `/api/user/register/` | Реєстрація |
| POST | `/api/user/password-reset/` | Запит скидання паролю |

---

## Змінні середовища — повний список

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `SECRET_KEY` | — | Django secret key (обов'язково) |
| `DEBUG` | `True` | Режим розробки |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Дозволені хости |
| `PG_DB` | — | Назва бази PostgreSQL |
| `PG_USER` | — | Користувач PostgreSQL |
| `PG_PASSWORD` | — | Пароль PostgreSQL |
| `PG_HOST` | — | Хост PostgreSQL |
| `PG_PORT` | — | Порт PostgreSQL |
| `FRONTEND_URL` | `http://localhost:3000` | URL фронтенду (для email-посилань) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,...` | Дозволені origins для CORS |
| `EMAIL_BACKEND` | `console` | Email backend |
| `EMAIL_HOST` | — | SMTP хост |
| `EMAIL_PORT` | `587` | SMTP порт |
| `EMAIL_USE_TLS` | `True` | TLS для email |
| `EMAIL_HOST_USER` | — | SMTP логін |
| `EMAIL_HOST_PASSWORD` | — | SMTP пароль |
| `DEFAULT_FROM_EMAIL` | `noreply@kidshoes.com` | Email відправника |
