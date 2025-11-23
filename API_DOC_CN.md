# 移动端 API 调用文档（中文）

本文档面向移动应用研发团队，梳理 `exam-web/my-next-app` 提供的全部 HTTP API。除特别说明外，所有接口均返回 `application/json`，并在出错时提供 `error` 字段与 HTTP 状态码。

## 1. 调用约定

- **基础域名**：根据部署环境配置。例如开发环境 `https://dev.example.com`，生产环境请参考运维提供的域名。
- **路径前缀**：所有接口均位于 `/api/...` 路径下。
- **请求头**：
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` —— 通过邮箱验证码登录获得的 JWT，详见 2.2。
- **时区与时间格式**：所有时间戳均使用 ISO 8601（UTC）字符串，除非字段名明确说明为本地时间。
- **错误处理**：客户端需根据状态码决定后续动作。`400/422` 为参数问题，`401` 为未认证，`403` 为权限不足，`429` 为限流触发，`5xx` 为服务器错误。

## 2. 鉴权与会话

### 2.1 概述

移动端主要使用 **JWT 鉴权**。成功登录后从 `POST /api/auth/login` 等接口获取 `data.token` 字段，并在后续请求附带 `Authorization` 请求头。部分站点内部接口仍支持 NextAuth 会话（浏览器 Cookie），但移动端默认不走浏览器 Session。

### 2.2 邮箱验证码登录流程

1. **发送验证码**  
   `POST /api/auth/send-code`  
   ```jsonc
   {
     "email": "user@example.com"
   }
   ```  
   - 成功：`{ "success": true, "message": "验证码已发送..." }`  
   - 失败：`400`（邮箱格式错误/缺失）、`500`（邮件发送失败）

2. **提交验证码登录**  
   `POST /api/auth/login`  
   ```jsonc
   {
     "email": "user@example.com",
     "code": "123456"
   }
   ```  
   - 成功：  
     ```jsonc
     {
       "success": true,
       "message": "登录成功",
       "data": {
         "user": {
           "id": "usr_123",
           "email": "user@example.com",
           "callsign": null,
           "selectedExamType": "A_CLASS"
         },
         "token": "jwt-token-string"
       }
     }
     ```  
   - 失败：`400`（验证码错误），`500`（服务器错误）

3. **后续请求**  
   - 请求头示例：`Authorization: Bearer jwt-token-string`

### 2.3 微信小程序登录与邮箱绑定

- `POST /api/auth/weapp/login`：body `{ code }`。与微信 `jscode2session` 交互后返回 `{ token, user, needsEmailBinding }`。
- `POST /api/auth/weapp/bind-email`：需要 Bearer Token，body `{ email, code, keep }`，支持账号合并，返回新的 JWT。

### 2.4 管理员权限

- 管理端接口需满足：
  1. 已登录（Session 或 JWT）。
  2. 用户邮箱在环境变量 `ADMIN_EMAILS` 配置中。
- 未满足条件将得到 `401` 或 `403`。

## 3. 通用响应结构

| 字段               | 说明                                                             |
| ------------------ | ---------------------------------------------------------------- |
| `success`          | 布尔值，部分接口使用，标识操作是否成功                           |
| `data` / `message` | 业务数据或文本提示                                               |
| `error`            | 出错描述，通常配合 4xx/5xx 使用                                  |
| `pagination` / `meta` | 分页或统计元数据                                             |

客户端需先检查 HTTP 状态码，再解析具体字段。

## 4. 接口分组

以下以功能分组列出全部接口。对于常用接口给出请求/响应字段说明与示例；其余可按表格快速定位。

### 4.1 身份认证与账号

| 方法 | 路径                                      | 鉴权要求   | 描述                                            |
| ---- | ----------------------------------------- | ---------- | ----------------------------------------------- |
| POST | `/api/auth/send-code`                     | 无         | 发送登录验证码                                  |
| POST | `/api/auth/login`                         | 无         | 验证邮箱验证码并返回 JWT                        |
| POST | `/api/auth/weapp/login`                   | 无         | 微信小程序登录                                   |
| POST | `/api/auth/weapp/bind-email`              | Bearer     | 小程序登录后绑定邮箱/账号合并                    |
| GET/POST | `/api/auth/[...nextauth]`           | Session    | NextAuth 默认处理器（Web 端使用）               |

> 绑定邮箱接口 `keep` 字段用于决定保留「小程序」还是「网页」端历史数据，取值 `'mini' | 'web'`。

### 4.2 用户资料、设置与积分

| 方法 | 路径                                | 鉴权   | 描述                                   |
| ---- | ----------------------------------- | ------ | -------------------------------------- |
| GET  | `/api/user/settings`                | Bearer | 获取用户设置（题库偏好、主题、AI 风格）|
| POST | `/api/user/settings`                | Bearer | 更新用户设置                           |
| GET  | `/api/user/points-history`          | Bearer | 获取积分历史，自带 `limit` 参数        |
| GET  | `/api/user/stats`                   | Bearer | 获取学习统计（今日/累计答题、正确率等）|
| GET  | `/api/user/export`                  | Bearer | 导出完整学习数据（JSON 文件下载）      |

**更新设置示例**
```jsonc
{
  "callsign": "BD7ABC",
  "enableWrongQuestionWeight": true,
  "theme": "dark",
  "aiStylePresetId": "preset_001",
  "aiStyleCustom": "回答语气更活泼"
}
```

### 4.3 收藏与通知

| 方法 | 路径                            | 鉴权   | 描述                             |
| ---- | ------------------------------- | ------ | -------------------------------- |
| POST | `/api/favorites`                | Bearer | 收藏题目 `{ questionId }`         |
| DELETE | `/api/favorites?questionId=...` | Bearer | 取消收藏                          |
| GET  | `/api/favorites`                | Bearer | 获取收藏列表                      |
| GET  | `/api/messages`                 | Bearer | 获取站内消息+未读数               |
| POST | `/api/messages/read`            | Bearer | 标记消息已读 `{ messageIds: [] }` |
| POST | `/api/messages/confirm`         | Bearer | 确认紧急消息 `{ messageId }`      |
| POST | `/api/feedback`                 | Bearer | 提交反馈，支持匿名邮箱与分类       |

反馈接口示例：
```jsonc
{
  "subject": "题目描述错误",
  "message": "A类试题第45题选项描述与官方答案不一致。",
  "category": "题库问题",
  "email": "user@example.com"
}
```

### 4.4 练习模式

| 方法 | 路径                                  | 鉴权   | 描述                                                   |
| ---- | ------------------------------------- | ------ | ------------------------------------------------------ |
| GET  | `/api/practice/questions`             | Bearer | 获取练习题列表，支持 `mode`, `type`, `limit`, `offset`, `category` |
| POST | `/api/practice/submit`                | Bearer | 提交练习答案，计算积分奖励                             |
| GET  | `/api/practice/history`               | Bearer | 获取练习历史，支持 `type`, `filter`                    |
| GET  | `/api/practice/error-rate`            | Bearer | 按个人错题率推荐下一题                                 |
| GET  | `/api/practice/next`                  | Bearer | 根据 `mode`（顺序/随机/错题/收藏）获取下一题          |

**提交练习答案请求示例**
```jsonc
{
  "questionId": "q_123",
  "userAnswer": ["A", "C"],
  "answerMapping": { "A": "opt_1", "C": "opt_4" }
}
```
响应包含 `isCorrect`, `correctAnswers`, `pointsEarned` 等字段。

### 4.5 模拟考试

| 方法 | 路径                    | 鉴权   | 描述                                 |
| ---- | ----------------------- | ------ | ------------------------------------ |
| POST | `/api/exam/start`       | Bearer | 开始一次模拟考试，body `{ type }`     |
| POST | `/api/exam/submit`      | Bearer | 提交考试答案并获取成绩               |

**开始考试响应关键字段**
- `examId` / `examResultId`
- `questions`: 已随机打乱选项，附带 `answerMapping`
- `config`: 考试配置（时长、题量、及格分）
- `startTime`: ISO 字符串

**提交考试响应关键字段**
- `score`, `totalQuestions`, `correctCount`, `wrongCount`
- `passed`, `passScore`
- `questionResults[]`: 包含用户答案、原始答案映射、解析（含 AI 解析）

### 4.6 题目与解析

| 方法 | 路径                                           | 鉴权   | 描述                                 |
| ---- | ---------------------------------------------- | ------ | ------------------------------------ |
| GET  | `/api/questions`                               | Bearer | 题目分页列表，支持 `page/pageSize/type/category/search` |
| GET  | `/api/questions/{id}`                          | Bearer | 单题详情，含用户答题记录/收藏状态     |
| POST | `/api/questions/{id}/explanations`             | Bearer | 用户提交解析（文本或结构化），每题限一次 |
| GET  | `/api/questions/{id}/explanations`             | Bearer | 获取官方/AI/用户解析                 |
| POST | `/api/explanations/{id}/vote`                  | Bearer | 对解析投票 `{ vote, reportReason? }` |
| GET  | `/api/explanations/{id}/vote`                  | Bearer | 查询当前用户对解析的投票情况         |

**提交解析参数说明**
- `content`: 字符串或结构化对象
- `format`: `'text' | 'structured'`；结构化需符合 `AiExplainSchema`

### 4.7 AI 服务

| 方法 | 路径                             | 鉴权   | 描述                                       |
| ---- | -------------------------------- | ------ | ------------------------------------------ |
| GET  | `/api/ai/style-presets`          | 无     | 公共获取 AI 风格预设                         |
| POST | `/api/ai/explain`                | Bearer | 生成/再生成 AI 解析，body `{ questionId, mode?, regenerate? }` |
| POST | `/api/assistant/chat`            | Bearer | AI 小助手对话，body `{ messages: [{ role, content }] }` |

**AI 解析响应字段**
- `explanation` / `explanationId`
- `mode`（`structured` / `simple`）
- `provider`, `modelName`
- `regenerate`: 是否为再生成请求
- `deductedPoints`, `freeAttemptsRemaining`, `pointsName`

**小助手响应字段**
- `reply`, `modelName`
- `remaining`: 当前令牌/限流余量
- `deductedPoints`, `freeLimit`, `freeRemaining`
- `aiQuotaLimit`, `aiQuotaRemaining`（非管理员时返回）

### 4.8 积分与排行榜

| 方法 | 路径                         | 鉴权   | 描述                                 |
| ---- | ---------------------------- | ------ | ------------------------------------ |
| POST | `/api/points/checkin`        | Bearer | 每日签到，奖励基础积分与连签奖励       |
| GET  | `/api/points/checkin`        | Bearer | 查询当天是否已签到、当前积分、连签天数 |
| GET  | `/api/points/leaderboard`    | 无     | 获取积分排行榜，支持 `limit` / `offset` |

签到成功响应包含：
- `points`: 本次获得积分总和
- `basePoints`, `bonusPoints`, `bonusReason`
- `streak`, `totalPoints`

### 4.9 站点信息

| 方法 | 路径                  | 鉴权       | 描述                               |
| ---- | --------------------- | ---------- | ---------------------------------- |
| GET  | `/api/program-info`   | 无         | 获取项目信息、协议、版本记录       |
| PUT  | `/api/program-info`   | 管理员     | 更新项目信息（metadata / documents）|
| GET  | `/api/site-config`    | 无         | 获取站点配置（标题、描述、Logo 等）|
| PUT  | `/api/site-config`    | 管理员     | 更新站点配置                       |

### 4.10 题库与考试预设

| 方法 | 路径                       | 鉴权   | 描述                                                   |
| ---- | -------------------------- | ------ | ------------------------------------------------------ |
| GET  | `/api/question-libraries`  | Bearer | 列出当前账户可访问的题库及考试预设（未登录仅返回公开库） |

**响应字段说明**
- `libraries[]`: 每个对象包含 `id/uuid/code/name/shortName/description/region/sourceType/version/visibility/displayLabel/displayTemplate/updatedAt`
- `totalQuestions` 与 `singleChoiceCount`/`multipleChoiceCount`/`trueFalseCount`: 题目数量统计
- `presets[]`: 各题库内置考试配置，字段 `id/code/name/description/durationMinutes/totalQuestions/passScore/...Count`，可直接用于 `POST /api/exam/start`

客户端可缓存该列表以驱动题库切换、考试类型选择界面。

## 5. 管理端接口

以下接口仅供内部管理工具使用，移动端如需调用需确保账号在 `ADMIN_EMAILS` 中，并携带有效 Session/JWT。

### 5.1 管理概览

| 方法 | 路径                         | 描述                              |
| ---- | ---------------------------- | --------------------------------- |
| GET  | `/api/admin/config`          | 返回管理员邮箱列表、当前账户信息  |
| GET  | `/api/admin/audit-logs`      | 查询最近审计日志，支持 `limit/action` |

### 5.2 题库与内容维护

| 方法 | 路径                                              | 描述                                   |
| ---- | ------------------------------------------------- | -------------------------------------- |
| POST | `/api/admin/import-questions`                     | 批量导入题库 JSON                      |
| GET  | `/api/admin/import-questions`                     | 查询题库统计（按类型/分类计数）        |
| GET  | `/api/admin/questions`                            | 管理端题目列表                         |
| PATCH| `/api/admin/questions/{id}/explanation`           | 更新题目官方解析（文本）               |

### 5.3 站内消息

| 方法 | 路径                               | 描述                                            |
| ---- | ---------------------------------- | ----------------------------------------------- |
| GET  | `/api/admin/messages`              | 列出最近 50 条站内消息                          |
| POST | `/api/admin/messages`              | 新建站内消息，支持级别与发布时间                |
| PUT  | `/api/admin/messages/{id}`         | 更新站内消息，可选择重新邮件通知                |
| DELETE | `/api/admin/messages/{id}`       | 删除站内消息                                    |

### 5.4 AI 模型与风格

| 方法 | 路径                                          | 描述                                           |
| ---- | --------------------------------------------- | ---------------------------------------------- |
| GET  | `/api/admin/ai-style-presets`                 | 查询全部 AI 风格预设                           |
| POST | `/api/admin/ai-style-presets`                 | 新建预设（可设置默认项、启用状态）             |
| PUT  | `/api/admin/ai-style-presets/{id}`            | 更新预设（支持切换默认项）                     |
| DELETE | `/api/admin/ai-style-presets/{id}`          | 删除预设                                       |
| GET  | `/api/admin/ai-models`                        | 列出 AI 模型配置（部分脱敏）                   |
| POST | `/api/admin/ai-models`                        | 新建 AI 模型配置                               |
| GET  | `/api/admin/ai-models/{id}`                   | 获取单个模型配置（含完整密钥）                 |
| PUT  | `/api/admin/ai-models/{id}`                   | 更新模型配置（支持 URL/密钥/优先级等）         |
| DELETE | `/api/admin/ai-models/{id}`                 | 删除模型配置                                   |
| GET  | `/api/admin/openai/model-groups`              | 采用新版结构的模型组列表                       |
| POST | `/api/admin/openai/model-groups`              | 新建模型组（带范围、温度、附加请求体等配置）   |
| PATCH | `/api/admin/openai/model-groups/{id}`        | 更新模型组                                     |
| DELETE | `/api/admin/openai/model-groups/{id}`       | 删除模型组                                     |

### 5.5 用户管理

| 方法 | 路径                                   | 描述                                                     |
| ---- | -------------------------------------- | -------------------------------------------------------- |
| GET  | `/api/admin/users`                     | 分页查询用户，支持 `page/limit/q`                        |
| GET  | `/api/admin/users/{id}`                | 获取单个用户详情                                         |
| PATCH| `/api/admin/users/{id}`                | 更新用户字段（呼号、AI 配额、禁用登录/解析等）           |
| POST | `/api/admin/users/{id}/reset`          | 重置用户状态（积分、连签、配额、设置、呼号、解禁等）     |
| GET  | `/api/admin/points-config`             | 获取积分配置（奖励、限额、费用）                         |
| PUT  | `/api/admin/points-config`             | 更新积分配置                                             |

所有用户操作均会写入审计日志（`aiQuota`、`loginDisabled`、`manualExplanationDisabled` 等字段变更会记录前后值）。

### 5.6 题库预设与标签统计

| 方法 | 路径                                                     | 描述                                                         |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------ |
| PATCH| `/api/admin/question-libraries/{libraryId}/presets`      | 以数组形式整体替换题库的考试预设；字段含 `code/name/durationMinutes/totalQuestions/passScore/...Count/metadata` |
| GET  | `/api/admin/question-libraries/{libraryId}/tag-summary`  | 聚合指定题库的标签使用次数与按题型统计，额外返回 `imageSummary` |

`metadata` 字段遵循 `ExamPresetMetadata` 结构，可携带抽题策略等信息；接口会校验题量与 `code` 唯一性并返回最新预设列表。

### 5.7 题库文件归档

| 方法 | 路径                                            | 描述                                                                 |
| ---- | ----------------------------------------------- | -------------------------------------------------------------------- |
| GET  | `/api/admin/question-library-files?libraryId=...` | 根据题库 ID 查看已上传的 JSON 备份，返回 `filename/originalName/fileSize/checksum/...` |
| POST | `/api/admin/question-library-files`             | 通过 `multipart/form-data` 上传 JSON 备份，字段 `libraryId`+`file`+`originalName?`，最大 8MB |
| GET  | `/api/admin/question-library-files/{fileId}`    | 下载指定文件内容（附 `Content-Disposition`）                        |
| PATCH| `/api/admin/question-library-files/{fileId}`    | 更新文件展示名称 `{ originalName }`                                  |
| DELETE | `/api/admin/question-library-files/{fileId}`  | 删除记录并清理磁盘上的备份文件                                      |

上传接口会先验证 JSON 格式；成功后返回 `file` 对象，可用于构建题库导入记录。

### 5.8 R2 存储与资源管理

| 方法 | 路径                         | 描述                                                                 |
| ---- | ---------------------------- | -------------------------------------------------------------------- |
| GET  | `/api/admin/r2/status`       | 返回 Cloudflare R2 的配置完整性、示例公共地址等信息                 |
| GET  | `/api/admin/r2/objects`      | 根据 `prefix/limit/token` 列出对象，返回 `objects[]`, `hasMore`, `continuationToken` |
| POST | `/api/admin/r2/objects`      | 通过 `multipart/form-data` 上传任意文件，字段 `file` + `folder?` + `filename?` |
| DELETE | `/api/admin/r2/object`     | 删除对象；可在请求体 `{ key }` 或查询串 `?key=` 中提供对象键         |

列表和上传接口会在 R2 未配置时返回 `success: false` 与缺失项，错误响应包含 `code`、`details`，便于在管理端提示。

### 5.9 SMTP 配置测试

| 方法 | 路径                   | 描述                                                               |
| ---- | ---------------------- | ------------------------------------------------------------------ |
| GET  | `/api/admin/smtp-test` | 查看当前 SMTP 配置摘要、缺失环境变量及 `connectionVerified` 状态   |
| POST | `/api/admin/smtp-test` | 发送测试邮件，body `{ recipient, subject?, message?, forceRealSend? }` |

测试接口会校验邮箱格式，在开发模式下默认返回 Nodemailer 预览链接，传入 `forceRealSend: true` 可强制真实发送。响应包含请求时间、目标邮箱以及实际使用的 SMTP 模式，方便排查部署问题。

## 6. 限流与费用策略

- **AI 小助手**：按 IP 与用户分别限流，可从响应的 `remaining` 查看余量。超过免费额度将扣除积分，积分不足会返回 `402`。
- **AI 解析再生成**：每日免费次数由 `pointsConfig.aiRegenerateDailyFree` 控制，超过后根据 `aiRegenerateCost` 扣积分。
- **反馈接口**：`RATE_LIMIT_MAX`（每用户）与 `RATE_LIMIT_MAX_PER_IP`（每 IP）限制一小时内提交次数。
- **站内消息、邮件发送**：高优先级消息自动触发邮件，发送失败不会影响 API 响应但会在日志中记录。

## 7. 常见错误码

| 状态码 | 场景                                                         | 处理建议                         |
| ------ | ------------------------------------------------------------ | -------------------------------- |
| 400    | 参数缺失/格式错误、解析格式不符合规范                        | 修正请求体                       |
| 401    | 未携带或 token 无效                                         | 重新登录获取 token               |
| 402    | 积分不足（AI 助手/解析收费）                                 | 提醒用户获取更多积分             |
| 403    | 权限不足（非管理员访问管理接口，或功能被禁用）              | 反馈无权限或联系管理员           |
| 404    | 资源不存在（题目、消息、模型等）                             | 提示资源不存在或已删除           |
| 409    | 重复提交（解析/收藏等存在唯一约束冲突）                      | 使用提示信息指导用户             |
| 429    | 触发限流（AI 助手、反馈、验证码等）                          | 告知稍后重试，利用 `resetAt` 字段 |
| 500    | 服务器内部错误                                               | 记录日志并提示稍后重试           |

## 8. 开发建议

1. **抽象 API 客户端**：建议统一封装 HTTP 客户端，自动附带 JWT，并统一处理 `401/403` 触发重新登录。
2. **缓存配置类接口**：`/api/program-info`、`/api/site-config` 等变动不频繁，可在客户端加入缓存逻辑。
3. **错题映射**：练习与考试返回的 `answerMapping` 是题目选项乱序后的映射，客户端需使用该映射换算原始答案。
4. **长文本展示**：解析接口的 `content` 可能为结构化 JSON，客户端需根据 `format` 区分渲染方式。
5. **管理员入口**：如需在移动端曝光管理功能，应确保控制台账号安全，并提示用户权限不足时的处理方式。

---

如需新增接口或调整字段，请在提交代码前同步更新本文档，确保移动端与服务端行为一致。
