# راهنمای راه‌اندازی و بررسی پروژه (ویژه همکار و توسعه‌دهنده)

سلام! این پروژه نسخه شخصی‌سازی‌شده و بومی فروشگاه پوشاک ایرانی بر پایه **Medusa 2.0** به همراه تقویم شمسی، واحد پولی تومان (IRT)، سیستم دسترسی پرسنل (RBAC)، خروجی‌های پستی و اکسل اختصاصی است.

---

## 🚀 مراحل راه‌اندازی سریع در ۴ مرحله

### ۱. نصب وابستگی‌ها
پروژه از `pnpm` و توربورپو استفاده می‌کند:
```bash
pnpm install
```

---

### ۲. تنظیم متغیرهای محیطی (.env)
فایل آماده `.env.template` در مسیر `apps/backend` قرار دارد. یک کپی از آن با نام `.env` ایجاد کنید:
```bash
cp apps/backend/.env.template apps/backend/.env
```

مقادیر استاندارد لوکال برای توسعه:
```env
STORE_CORS=http://localhost:8000,http://127.0.0.1:8000,https://docs.medusajs.com
ADMIN_CORS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:9000,http://127.0.0.1:9000,https://docs.medusajs.com
AUTH_CORS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:9000,http://127.0.0.1:9000,http://localhost:8000,http://127.0.0.1:8000,https://docs.medusajs.com
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=supersecret_medusa_jwt_secret_key_123456789
COOKIE_SECRET=supersecret_medusa_cookie_secret_key_123456789
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/medusa
DB_NAME=medusa
MEDUSA_ADMIN_ONBOARDING_TYPE=nextjs
```

---

### ۳. اجرای داکر و بازیابی پایگاه داده PostgreSQL
داکر کانتینرهای PostgreSQL 18 و Redis 8 را بالا بیاورید:
```bash
docker compose up -d
```

سپس دیتابیس کامل فروشگاه (شامل تمام محصولات، تنوع‌های پوشاک، سفارش‌های واقعی، لاگ فعالیت‌ها و دسترسی‌های RBAC) را با این تک‌دستور بازیابی کنید:
```bash
docker exec -i medusa-postgres pg_restore -U postgres -d medusa < apps/backend/medusa-database-dump.sql
```

---

### ۴. اجرای سرور توسعه
```bash
pnpm run backend:dev
```

- **پنل مدیریت ادمین:** [http://localhost:9000/app](http://localhost:9000/app)
- **نام کاربری پیش‌فرض مالک:** `admin@medusa-test.com`
- **رمز عبور:** `supersecret123`

---

## 🌟 بخش‌های کلیدی پیاده‌سازی‌شده جهت بررسی:
1. **پنل سفارشات خلوت‌شده و پردازش زنده:** `/app/orders` (دارای ستون شماره موبایل خریدار، تغییر وضعیت پردازش و فیلتر زمانی شمسی)
2. **هاب سفارش‌های پردازش‌شده:** `/app/processed-orders` (کد رهگیری پستی، چاپ فاکتور رسمی و تعویض سایز)
3. **ثبت سریع سفارش (دایرکت/تلفنی):** `/app/quick-order` (۳۱ استان الفبایی، شهرهای جامع و کرایه دلخواه)
4. **کاربران و دسترسی‌ها (RBAC):** `/app/users-permissions` (۲۴ دسترسی اتمیک، کارنامه فعالیت زنده و سلسله‌مراتب نقش‌ها)
5. **تحلیل سود و زیان (Fashion Analytics):** `/app/fashion-analytics` (نمودار پیوسته روزانه با محاسبه بهای تمام‌شده و سود خالص)
6. **خروجی‌های اختصاصی اکسل (.xlsx):** تولید اکسل فارسی راست‌چین برای سفارشات، مشتریان، کاتالوگ لباس و انبار مرکزی.
