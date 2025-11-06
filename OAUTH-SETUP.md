# OAuth 接入配置指南

## 🎉 OAuth 集成完成！

业余无线电刷题系统现已成功集成自建 OAuth 系统。

## 📋 配置步骤

### 1. 在 OAuth 系统中注册应用

访问你的 OAuth 系统管理后台（`http://localhost:3000/admin/apps`）注册应用，获取：

- **Client ID**: 应用客户端 ID
- **Client Secret**: 应用密钥

**回调 URL 配置**:
```
http://localhost:3001/api/auth/callback/custom
```

### 2. 更新环境变量

编辑 `.env` 文件，填入获取的凭据：

```env
# OAuth Configuration
OAUTH_CLIENT_ID="你的-client-id"
OAUTH_CLIENT_SECRET="你的-client-secret"
OAUTH_BASE_URL="http://localhost:3000"
OAUTH_REDIRECT_URI="http://localhost:3001/api/auth/callback/custom"

# NextAuth 配置
AUTH_SECRET="amateur-radio-exam-nextauth-secret-2024"
NEXTAUTH_URL="http://localhost:3001"
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
pnpm exec prisma generate

# 运行数据库迁移
pnpm exec prisma migrate dev --name add_nextauth_tables
```

### 4. 启动应用

```bash
# 确保在 my-next-app 目录中
cd D:/User/Desk/无线电/project/Exam/web/exam-web/my-next-app

# 启动开发服务器（运行在 3001 端口）
pnpm dev
```

## 🔗 访问地址

- **刷题系统**: http://localhost:3001
- **OAuth 系统**: http://localhost:3000
- **登录页面**: http://localhost:3001/login

## 🚀 测试流程

1. 确保 OAuth 系统运行在 `localhost:3000`
2. 启动刷题系统在 `localhost:3001`
3. 访问 http://localhost:3001
4. 点击"登录"按钮
5. 系统会重定向到 `localhost:3000` 进行 OAuth 认证
6. 认证成功后返回刷题系统

## 📊 数据库变更

新增 NextAuth 所需的表：

- `accounts` - OAuth 账户信息
- `sessions` - 用户会话
- `verification_tokens` - 验证令牌
- `users` - 新增字段：`name`, `image`, `emailVerified`

## 🔐 权限范围

系统请求的 OAuth 权限：

- `openid` - 基础认证（必需）
- `profile` - 用户资料
- `email` - 邮箱信息

## ⚙️ 技术栈

- **NextAuth.js v5** - 身份认证框架
- **Prisma Adapter** - 数据库适配器
- **自定义 OAuth Provider** - 接入你的 OAuth 系统

## 📝 注意事项

1. **数据库连接**: 确保 PostgreSQL 在 `192.168.31.187:5432` 可访问
2. **端口冲突**: 刷题系统（3001）和 OAuth 系统（3000）不能使用相同端口
3. **回调 URL**: 必须在 OAuth 系统中正确配置回调地址
4. **环境变量**: 开发环境使用 `.env`，生产环境需要单独配置

## 🐛 常见问题

### 问题 1: "invalid_client" 错误
- 检查 `OAUTH_CLIENT_ID` 和 `OAUTH_CLIENT_SECRET` 是否正确
- 确认在 OAuth 系统中已注册应用

### 问题 2: 回调失败
- 检查回调 URL 是否在 OAuth 系统白名单中
- 确认格式为：`http://localhost:3001/api/auth/callback/custom`

### 问题 3: 数据库连接失败
- 检查 `DATABASE_URL` 配置
- 确认 PostgreSQL 服务正在运行
- 运行 `pnpm exec prisma migrate dev`

## 🔄 OAuth 流程

```
1. 用户点击登录
   ↓
2. 重定向到 OAuth 授权页面 (localhost:3000)
   ↓
3. 用户在 OAuth 系统登录/授权
   ↓
4. OAuth 系统回调刷题系统 (localhost:3001/api/auth/callback)
   ↓
5. NextAuth 处理回调，创建会话
   ↓
6. 用户登录成功，重定向到首页
```

## 📚 相关文件

- `auth.ts` - NextAuth 配置
- `app/api/auth/[...nextauth]/route.ts` - API 路由
- `app/providers.tsx` - SessionProvider
- `app/login/page.tsx` - 登录页面
- `app/page.tsx` - 主页（含会话检查）

---

**状态**: ✅ OAuth 集成完成
**下一步**: 配置 OAuth 凭据并测试登录流程