@echo off
set NODE_ENV=development
set DATABASE_URL=postgres://postgres.lvsqjsytajbxvrkvjqnk:viraj1316mp@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
start /B cmd /c "npx tsx server/index.ts" 