@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo  Vendor Risk Monitor - Database Setup Helper
echo =======================================================
echo.
echo This script initializes the PostgreSQL database and creates
echo the required 'vrm_app' role and 'vrm' database.
echo.

set /p PG_USER="Enter your PostgreSQL superuser [default: postgres]: "
if "%PG_USER%"=="" set PG_USER=postgres

set /p PG_PORT="Enter your PostgreSQL port [default: 5432]: "
if "%PG_PORT%"=="" set PG_PORT=5432

echo.
echo Executing database initialization via psql...
echo (You will be prompted for your PostgreSQL superuser password if needed)
echo.

psql -h localhost -p %PG_PORT% -U %PG_USER% -f docker/postgres/init.sql

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to run init.sql via psql.
    echo Please make sure PostgreSQL is running on port %PG_PORT% and psql is in your PATH.
    echo Alternatively, open pgAdmin or psql and execute the commands inside docker/postgres/init.sql.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [SUCCESS] Database 'vrm' and role 'vrm_app' initialized!
echo Now applying database migrations and seeding initial data...
echo.

call npm run db:migrate
call node -e "
import bcrypt from 'bcryptjs';
import('./backend/dist/config/db.js').then(async ({ prisma }) => {
  const email = 'admin@example.com';
  const pass = 'AdminStrongPass!2026';
  const passwordHash = await bcrypt.hash(pass, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log('Super-Admin user seeded: admin@example.com');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
"

echo.
echo =======================================================
echo  Setup Completed Successfully!
echo  Run: npm run dev
echo  Login at http://localhost:5173/login
echo  Admin Email: admin@example.com
echo  Password:    AdminStrongPass!2026
echo =======================================================
echo.
pause
