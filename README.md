# 业余无线电刷题平台（Web）

面向国内业余无线电 A/B/C 类考试的全功能刷题系统，特点是**免费、开源、可自部署**。前端采用 Next.js App Router、shadcn/ui 与 Tailwind CSS，后端 API 由 Next.js Route Handlers + Prisma 提供，认证依赖自建 OAuth 服务并支持 AI 解析能力。

---

## ✨ 功能亮点
- **完整题库**：覆盖 A/B/C 全品类题目，含题型、难度、出处与多媒体信息。
- **多样练习模式**：顺序 / 随机 / 错题 / 收藏 / 模拟考试，配套计时与即时得分。
- **AI 小助手**：调用 OpenAI（或自定义模型）给出题目解析、答疑与学习建议。
- **积分与统计**：签到、积分、错题分析、历史曲线、排行榜等全量学习数据。
- **管理员后台**：题库导入、AI 模型组管理、站点配置、用户配额与开关治理。
- **可观测性**：审计日志、站内消息中心、Webhook/邮件通知，便于运维排错。

---

## 🧱 技术栈
| 模块 | 说明 |
| --- | --- |
| Web 框架 | Next.js 15（App Router、Turbopack、本地 ISR） |
| 语言 | TypeScript 5.6 + React 19 |
| UI | Tailwind CSS、shadcn/ui、自定义主题系统 |
| 数据层 | PostgreSQL 14+、Prisma ORM（输出到 `lib/generated/prisma`） |
| 认证 | NextAuth.js 5，自建 OAuth Provider（见 `OAUTH-SETUP.md`） |
| AI | `lib/ai` 抽象 + OpenAI Provider，可扩展本地/云模型 |
| 基础设施 | pnpm、ESLint、Biome（可选）、Playwright 端到端脚本 |

---

## 🚀 快速开始
### 1. 安装依赖
```bash
pnpm install
```

> 装完依赖会自动执行 `prisma generate`，若需要重新生成，请手动运行 `pnpm exec prisma generate`。

### 2. 准备环境变量
创建 `.env`（或使用 `.env.local`），常用字段如下：
```bash
DATABASE_URL="postgresql://exam:exam@localhost:5432/exam"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
AUTH_URL="http://localhost:3001"
NEXTAUTH_URL="http://localhost:3001"
AUTH_TRUST_HOST="true"
OAUTH_BASE_URL="http://localhost:4000"      # 自建 OAuth 服务地址
OAUTH_CLIENT_ID="..."
OAUTH_CLIENT_SECRET="..."
OPENAI_API_KEY="sk-..."                      # 或替换为自建 AI Provider
ADMIN_EMAILS="admin@example.com,second@example.com"
```
更多变量（如题库导入策略、AI 速率限制、站点装饰配置）可参考 `config/` 与 `.env.example`（若存在）。

### Cloudflare R2（可选）
若题库包含自托管配图，可将对象保存在 Cloudflare R2 并在后台 `/admin/r2` 管理。按需补充以下环境变量：

```
# Cloudflare R2 Storage
CF_R2_ACCOUNT_ID="xxxxxxxxxxxxxxxxxxxx"
CF_R2_ACCESS_KEY_ID="XXXXXXXXXXXXXXXXXXXX"
CF_R2_SECRET_ACCESS_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
CF_R2_BUCKET_NAME="exam-assets"
CF_R2_PUBLIC_BASE_URL="https://cdn.example.com"   # 绑定在 R2 上的公开域名
CF_R2_BASE_PREFIX="question-images"             # 可选，默认为 question-images
CF_R2_DISABLE_PROXY="false"                     # 若运行环境强制代理，可设为 true 直连
```

配置完成后，即可在后台上传配图并获取可直接写入题库 JSON 的公开 URL。

### 3. 迁移数据库
```bash
pnpm exec prisma migrate dev
```
> 生产环境使用 `prisma migrate deploy`，并配合 `prisma db seed` 导入基础数据。

### 4. 启动开发服务器
```bash
pnpm dev        # 默认监听 3001
```
浏览器访问 `http://localhost:3001`，按提示完成 OAuth 登录即可体验。

### 5. 导入题库
1. 登录管理员账号（邮箱在 `ADMIN_EMAILS` 列表内）。
2. 访问 `/admin/import` 上传 JSON 题库包。
3. 在 `/admin/site` 配置站点信息、banner、AI 配额等。

---

## 🗂️ 目录结构速览
```
my-next-app/
├─ app/                     # App Router 页面与 API（Route Handlers）
│  ├─ api/                  # 练习 / 考试 / AI / 管理接口
│  ├─ admin/                # 管理员面板
│  ├─ practice/, exam/      # 学习、考试主界面
│  └─ settings/, stats/     # 用户配置与数据视图
├─ components/              # UI 与业务组件（site/ui/admin）
├─ lib/                     # 数据层、AI、审计、站点配置等 helpers
├─ prisma/                  # `schema.prisma` 与迁移记录
├─ types/                   # 共享类型（含 NextAuth 扩展）
├─ public/                  # 静态资源（logo、OG 图、清单等）
└─ README.md                # 本文件
```
更多背景与接口详解：
- `API_DOC_CN.md`：开放 API 与错误码文档。
- `AI_PROVIDER_IMPLEMENTATION.md`：AI 抽象扩展指南。
- `OAUTH-SETUP.md`：与统一认证中心的集成说明。
- `PROGRESS.md`：功能路线图与迭代记录。

---

## 🧪 常用脚本
| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动本地开发（Turbopack）。 |
| `pnpm build && pnpm start` | 生产构建与运行。 |
| `pnpm lint` | ESLint 检查（需先解决依赖配置问题）。 |
| `pnpm test` / `pnpm test:e2e` | 若定义，对应单测或端到端脚本。 |
| `pnpm db:studio` | `prisma studio` 可视化数据库。 |

---

## 🔐 管理与权限
- **OAuth 登录**：项目默认禁用匿名体验；头像、昵称直接来自 OAuth `userinfo`（详见 `auth.ts`）。
- **小助手（AI）**：仅登录用户可见，受用户/IP 双重速率限制（`ASSISTANT_RATE_LIMIT_*`）。
- **站点配置**：通过 `/admin/site` + `/admin/points-config` 动态调整；也可直接编辑数据库配置表。

---

## 🤝 贡献指南
1. Fork 或新建分支；
2. 运行 `pnpm lint` / `pnpm test` 确保通过（若 lint 当前存在上游问题，请在 PR 中说明）；
3. 提交遵循 Conventional Commits（推荐）；
4. 在 PR 中描述变更、截图与验证步骤。

欢迎通过 Issue 提交题库、功能建议或集成问题，也可发送邮件至站点页脚的联系地址。

---

## 📄 许可证
本项目采用 MIT License。使用或部署时请保留原始版权说明；若进行商用或构建衍生服务，建议在说明中注明来源，尊重原作者与题库贡献者。

---

Made with ❤️ 为每一位努力备考的业余无线电爱好者。
