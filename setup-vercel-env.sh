# Vercel环境变量快速配置脚本
# 使用方法: vercel env add DATABASE_URL production

# 必需的环境变量
vercel env add DATABASE_URL production < <(echo "postgresql://neondb_owner:npg_VOWjZg9MInd0@ep-patient-band-ad3rq8ar-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require")
vercel env add AUTH_SECRET production < <(echo "amateur-radio-exam-nextauth-secret-2024")
vercel env add JWT_SECRET production < <(echo "amateur-radio-exam-jwt-secret-2024")
vercel env add OAUTH_CLIENT_ID production < <(echo "fdc123603bde55c6a081179f67dc067f")
vercel env add OAUTH_CLIENT_SECRET production < <(echo "14d9f7c4c85b97b54368a4ce5103ec78dba52f22ac95e83c86a8b2b24202234c")
vercel env add OAUTH_BASE_URL production < <(echo "https://oauth.mzyd.work")
vercel env add NEXT_PUBLIC_OAUTH_BASE_URL production < <(echo "https://oauth.mzyd.work")
vercel env add OAUTH_REDIRECT_URI production < <(echo "https://exam.mzyd.work/api/auth/callback/custom")
vercel env add NEXT_PUBLIC_APP_URL production < <(echo "https://exam.mzyd.work")
vercel env add NEXTAUTH_URL production < <(echo "https://exam.mzyd.work")
vercel env add AUTH_URL production < <(echo "https://exam.mzyd.work")
vercel env add AUTH_TRUST_HOST production < <(echo "true")
vercel env add ADMIN_EMAILS production < <(echo "limeneko@outlook.com")

# 其他环境变量...
