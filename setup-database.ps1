# Vendor Risk Monitor - PowerShell Database Setup Helper
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Vendor Risk Monitor - Database Setup Helper" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$pgUser = Read-Host "Enter your PostgreSQL superuser [default: postgres]"
if ([string]::IsNullOrWhiteSpace($pgUser)) { $pgUser = "postgres" }

$pgPort = Read-Host "Enter your PostgreSQL port [default: 5432]"
if ([string]::IsNullOrWhiteSpace($pgPort)) { $pgPort = "5432" }

Write-Host "`nExecuting database initialization via psql..." -ForegroundColor Yellow
Write-Host "(Enter your PostgreSQL superuser password when prompted)`n"

& psql -h localhost -p $pgPort -U $pgUser -f docker/postgres/init.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Failed to run init.sql via psql." -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is running and psql is in your PATH."
    Write-Host "You can also manually execute docker/postgres/init.sql in pgAdmin." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n[SUCCESS] Database 'vrm' and role 'vrm_app' initialized!" -ForegroundColor Green
Write-Host "Applying Prisma migrations and seeding..." -ForegroundColor Yellow

npm run db:migrate
node -e "
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

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " Setup Completed Successfully!" -ForegroundColor Green
Write-Host " Start the app: npm run dev" -ForegroundColor Cyan
Write-Host " Login at:      http://localhost:5173/login" -ForegroundColor Cyan
Write-Host " Email:         admin@example.com" -ForegroundColor Cyan
Write-Host " Password:      AdminStrongPass!2026" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Green
