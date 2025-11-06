# 业余无线电刷题系�?
> 专为中国业余无线电考试设计的免费刷题练习平�?
## �?功能特�?
### 📚 完整题库
- 支持A/B/C类全部考试题目
- 单选题、多选题全覆�?- 题目分类清晰，难度标�?
### 🎯 多种练习模式
- **顺序练习**: 按题号顺序系统学�?- **随机练习**: 随机抽题强化记忆
- **错题�?*: 专注易错题目
- **收藏练习**: 复习重点题目

### 📝 模拟考试
- 真实考试环境模拟
- 自动倒计时提�?- 即时评分反馈
- 详细错题分析

### 🤖 AI智能解析
- OpenAI GPT-4 驱动
- 详细知识点讲�?- 记忆技巧提�?- 错误选项分析

### ⚙️ 个性化设置
- 用户呼号管理
- 错题权重调整
- 主题切换（明/暗）
- 数据导出功能

## 🚀 快速开�?
### 环境要求
- Node.js 18+
- PostgreSQL 14+
- pnpm 8+

### 安装步骤

1. **安装依赖**
```bash
pnpm install
```

2. **配置环境变量**
```bash
# 编辑 .env 文件
DATABASE_URL="postgresql://exam:exam@192.168.31.187:5432/exam"
ADMIN_EMAILS="your-email@example.com"
OAUTH_CLIENT_ID="..."
OAUTH_CLIENT_SECRET="..."
OAUTH_REDIRECT_URI="http://localhost:3001/api/auth/callback/custom"
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_APP_URL="http://localhost:3001"
AUTH_URL="http://localhost:3001"
NEXTAUTH_URL="http://localhost:3001"
AUTH_TRUST_HOST="true"
```

3. **数据库迁�?*
> `pnpm install` already runs `prisma generate` automatically. Run the commands below only if regeneration is needed:
```bash
pnpm exec prisma generate
pnpm exec prisma migrate dev
```

4. **启动开发服务器**
```bash
pnpm dev
```

5. **访问应用**
```
http://localhost:3001
```

6. **导入题库**
- 访问 `http://localhost:3001/admin/import`
- 上传题库JSON文件

## 📊 技术栈

- **框架**: Next.js 15.5.4 (App Router + Turbopack)
- **语言**: TypeScript 5
- **样式**: TailwindCSS v4 + shadcn/ui
- **数据�?*: PostgreSQL + Prisma ORM
- **认证**: NextAuth.js v5 + 自建OAuth
- **AI**: OpenAI API

## 📁 项目结构

```
my-next-app/
├── app/                      # Next.js App Router
�?  ├── api/                 # API路由
�?  �?  ├── admin/          # 管理接口
�?  �?  ├── practice/       # 练习接口
�?  �?  ├── exam/           # 考试接口
�?  �?  └── ai/             # AI接口
�?  ├── admin/              # 管理后台
�?  ├── practice/           # 练习页面
�?  ├── exam/               # 考试页面
�?  └── settings/           # 设置页面
├── components/ui/          # shadcn/ui组件
├── lib/                    # 工具�?├── prisma/                 # Prisma配置
└── PROGRESS.md            # 开发进度文�?```

## 📖 使用指南

### 管理员操�?
1. **配置管理员权�?*: �?`.env` 设置 `ADMIN_EMAILS`
2. **导入题库**: 访问 `/admin/import` 上传JSON文件
3. **查看统计**: 题库统计和导入历�?
### 用户操作

1. **注册登录**: 使用OAuth系统登录
2. **选择练习**: 主页选择A/B/C类和练习模式
3. **模拟考试**: 真实环境模拟考试
4. **AI解析**: 查看智能解析和知识点讲解
5. **个人设置**: 管理呼号和导出数�?
## 🔑 核心功能API

### 练习相关
- `GET /api/practice/questions` - 获取题目
- `POST /api/practice/submit` - 提交答案
- `GET /api/practice/next` - 下一�?
### 考试相关
- `POST /api/exam/start` - 开始考试
- `POST /api/exam/submit` - 提交试卷

### AI相关
- `POST /api/ai/explain` - 生成AI解析

### 用户相关
- `GET /api/user/settings` - 获取设置
- `POST /api/user/settings` - 更新设置
- `GET /api/user/export` - 导出数据

## 🎯 考试规则

- **A�?*: 40�?| 40分钟 | 30分及�?- **B�?*: 60�?| 60分钟 | 45分及�?- **C�?*: 90�?| 90分钟 | 70分及�?
## 📄 开源协�?
MIT License

## 🙏 致谢

- Next.js
- Prisma
- shadcn/ui
- TailwindCSS
- OpenAI

---

**开发状�?*: MVP已完�?�?
made with ❤️ for 业余无线电爱好�?
