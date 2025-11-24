# 部署到 Vercel 指南

本项目已配置支持Vercel部署。以下是详细步骤:

## 前置准备

1. **GitHub仓库**: 确保项目已推送到GitHub
2. **Vercel账号**: 在 [vercel.com](https://vercel.com) 注册账号
3. **数据库**: 准备好PostgreSQL数据库(推荐使用Vercel Postgres或Supabase)

## 部署步骤

### 1. 导入项目到Vercel

1. 访问 [vercel.com/new](https://vercel.com/new)
2. 选择你的GitHub仓库
3. 选择项目目录: `exam-web/my-next-app`
4. Framework Preset会自动识别为Next.js

### 2. 配置环境变量

在Vercel项目设置中,添加以下环境变量:

#### 必需的环境变量

```env
# 数据库
DATABASE_URL=你的PostgreSQL连接字符串

# 认证密钥
AUTH_SECRET=随机生成的密钥(32字符以上)
JWT_SECRET=随机生成的密钥(32字符以上)

# OAuth配置
OAUTH_CLIENT_ID=你的OAuth客户端ID
OAUTH_CLIENT_SECRET=你的OAuth客户端密钥
OAUTH_BASE_URL=https://oauth.mzyd.work
NEXT_PUBLIC_OAUTH_BASE_URL=https://oauth.mzyd.work
OAUTH_REDIRECT_URI=https://你的域名/api/auth/callback/custom

# 应用URL(部署后Vercel会提供)
NEXT_PUBLIC_APP_URL=https://你的vercel域名.vercel.app
NEXTAUTH_URL=https://你的vercel域名.vercel.app
AUTH_URL=https://你的vercel域名.vercel.app
AUTH_TRUST_HOST=true

# 管理员邮箱
ADMIN_EMAILS=你的邮箱@example.com
```

#### 可选的环境变量

```env
# AI服务
OPENAI_API_KEY=你的OpenAI API密钥
OPENAI_BASE_URL=https://your-api-proxy-url.com/v1

# 微信小程序
WECHAT_MINIAPP_APPID=你的小程序AppID
WECHAT_MINIAPP_SECRET=你的小程序Secret

# 邮件服务
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_USER=你的邮箱
SMTP_PASS=你的邮箱密码
SMTP_FROM=你的邮箱
FEEDBACK_RECEIVER_EMAIL=接收反馈的邮箱

# Cloudflare R2存储
CF_R2_ACCOUNT_ID=你的账号ID
CF_R2_ACCESS_KEY_ID=你的Access Key
CF_R2_SECRET_ACCESS_KEY=你的Secret Key
CF_R2_BUCKET_NAME=你的Bucket名称
CF_R2_PUBLIC_BASE_URL=https://你的R2公开URL

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=你的Site Key
TURNSTILE_SECRET_KEY=你的Secret Key

# 监控(可选)
SENTRY_DSN=你的Sentry DSN
NEXT_PUBLIC_POSTHOG_KEY=你的PostHog Key
NEXT_PUBLIC_POSTHOG_HOST=https://posthog.example.com
```

### 3. 生成密钥

使用以下命令生成安全的随机密钥:

```bash
# 在本地终端运行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 配置构建设置

Vercel会自动识别配置,但如果需要手动设置:

- **Framework Preset**: Next.js
- **Root Directory**: `exam-web/my-next-app`
- **Build Command**: `prisma generate && next build`
- **Install Command**: `pnpm install`
- **Output Directory**: `.next`

### 5. 数据库迁移

部署后,需要运行数据库迁移:

1. 在Vercel项目设置中,找到"Deployments"
2. 在最新部署的"More"菜单中选择"Redeploy"
3. 勾选"Use existing build cache"
4. 或者在本地运行:
   ```bash
   # 设置DATABASE_URL环境变量后运行
   npx prisma migrate deploy
   ```

### 6. 域名配置

1. 在Vercel项目设置的"Domains"中添加自定义域名
2. 按照提示配置DNS记录
3. 更新环境变量中的`NEXT_PUBLIC_APP_URL`等URL

## 常见问题

### Q: 构建失败,提示Prisma错误
**A**: 确保`DATABASE_URL`环境变量已正确配置

### Q: 部署后页面报错
**A**: 检查Vercel的"Logs"标签,查看详细错误信息

### Q: OAuth登录不工作
**A**: 确保`OAUTH_REDIRECT_URI`使用的是Vercel的域名

### Q: 如何查看构建日志?
**A**: 在Vercel项目页面,点击具体的deployment,可以看到详细的构建日志

## 注意事项

1. **环境变量安全**: 不要将`.env`文件提交到Git仓库
2. **数据库连接**: Vercel函数有10秒超时限制,确保数据库连接池配置合理
3. **Prisma生成**: `postinstall`脚本会自动运行`prisma generate`
4. **区域选择**: 建议选择香港(hkg1)区域以获得更好的国内访问速度

## 部署架构

```
GitHub Repository
      ↓ (推送代码)
Vercel Build System (Linux环境,无Windows权限问题)
      ↓ (构建成功)
Vercel CDN Edge Network
      ↓
      用户访问
```

## 监控和维护

- 在Vercel仪表板监控部署状态
- 查看Analytics了解访问情况
- 设置GitHub集成实现自动部署
- 配置环境变量后需要重新部署才能生效

## 成本

Vercel提供免费的Hobby计划,包括:
- 无限部署
- 100GB带宽/月
- Serverless函数执行
- 自动HTTPS

对于生产环境,可以考虑Pro或Enterprise计划。
