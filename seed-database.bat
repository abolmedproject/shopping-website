@echo off
echo ========================================================
echo            Seeding Medusa Database
echo ========================================================
echo.
docker compose up -d
echo Running migrations...
cd apps\backend
pnpm exec medusa db:migrate
echo Creating search index...
pnpm exec medusa db:migrate:search
echo Seeding demo products...
pnpm exec medusa exec ./src/scripts/seed-demo-products.ts
echo Creating default admin user...
pnpm exec medusa user -e admin@medusa-test.com -p supersecret123
echo Done!
pause
