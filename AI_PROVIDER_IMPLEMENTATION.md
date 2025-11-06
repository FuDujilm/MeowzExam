# AI 多 Provider 接入功能实现总结

## ✅ 已完成功能

### 1. 数据库 Schema 更新
- ✅ 添加 `AiProvider` 枚举 (OPENAI, DIFY, AZURE_OPENAI)
- ✅ 扩展 `AiModelGroup` 表支持多 provider 配置
- ✅ 添加 Dify 专用字段 (`difyAppId`, `difyUser`)
- ✅ 添加优先级和激活状态管理

### 2. Dify API 集成
**文件：** `lib/ai/dify.ts`
- ✅ 实现 Dify 工作流 API 调用 (`generateDifyExplanation`)
- ✅ 实现 Dify 对话应用 API 调用 (`generateDifyChatExplanation`)
- ✅ 自动清理 Markdown 代码块标记
- ✅ JSON 格式验证和错误处理

### 3. 统一 AI 调用层
**文件：** `lib/ai/unified.ts`
- ✅ 根据数据库配置自动选择最优 provider
- ✅ 按优先级排序，失败自动切换备用配置
- ✅ 支持 OpenAI / Dify / Azure OpenAI
- ✅ 统一的错误处理和日志记录

### 4. AI 解析 API 重构
**文件：** `app/api/ai/explain/route.ts`
- ✅ 使用新的统一调用层
- ✅ 返回 provider 和 modelName 信息
- ✅ 审计日志记录 provider 信息
- ✅ 向后兼容旧的简单模式

### 5. 管理后台
**API 路由：**
- ✅ `GET /api/admin/ai-models` - 列出所有配置
- ✅ `POST /api/admin/ai-models` - 创建配置
- ✅ `GET /api/admin/ai-models/[id]` - 获取单个配置
- ✅ `PUT /api/admin/ai-models/[id]` - 更新配置
- ✅ `DELETE /api/admin/ai-models/[id]` - 删除配置

**管理页面：**
- ✅ `/admin/ai-models` - 配置列表页
- ✅ `/admin/ai-models/new` - 新建配置页
- ✅ `/admin/ai-models/[id]` - 编辑配置页
- ✅ 激活/停用、优先级调整、删除功能

## 📝 使用指南

### 1. 配置管理员权限
在 `.env.local` 中添加：
```bash
ADMIN_EMAILS=admin@example.com,your-email@example.com
```

### 2. 添加 OpenAI 配置
访问 `/admin/ai-models/new`，填写：
- **配置名称**: OpenAI GPT-4
- **Provider**: OpenAI
- **模型名称**: gpt-4
- **API URL**: https://api.openai.com/v1
- **API Key**: sk-xxx...
- **优先级**: 10
- **激活**: ✓

### 3. 添加 Dify 配置

#### 方式 A：Dify 工作流
```
- 配置名称: Dify Workflow
- Provider: DIFY
- 模型名称: workflow-name
- API URL: https://api.dify.ai/v1
- API Key: app-xxx...
- Dify App ID: xxx-xxx-xxx
- Dify User: anonymous
- 优先级: 9
- 激活: ✓
```

#### 方式 B：Dify 对话应用
```
- 配置名称: Dify Chat
- Provider: DIFY
- 模型名称: chat-app
- API URL: https://api.dify.ai/v1
- API Key: app-xxx...
- Dify App ID: (留空)
- Dify User: anonymous
- 优先级: 8
- 激活: ✓
```

### 4. 工作流程

#### 自动 Provider 选择
系统会按以下逻辑选择 provider：
1. 按 `priority` 降序排序激活的配置
2. 从优先级最高的开始尝试
3. 如果失败，自动切换到下一个配置
4. 全部失败才返回错误

#### 日志追踪
每次 AI 调用都会在审计日志中记录：
- 使用的 provider (OPENAI / DIFY)
- 使用的 modelName
- 是否缓存命中
- 错误信息（如果失败）

## 🔧 Dify 工作流配置示例

### 输入变量
在 Dify 工作流中定义以下输入变量：
- `question` - 题目内容
- `options` - 选项 JSON 字符串
- `correct_answer` - 正确答案
- `syllabus` - 大纲路径（可选）
- `evidence` - 参考证据 JSON（可选）

### 输出变量
工作流的最终输出节点应返回 JSON：
```json
{
  "result": "{...AiExplainSchema JSON...}"
}
```

## 📊 优先级策略

推荐配置：
- **OpenAI GPT-4**: 优先级 10（最高质量，作为主力）
- **Dify 工作流**: 优先级 9（自定义流程，作为备用）
- **OpenAI GPT-3.5**: 优先级 8（快速响应，降级方案）

## ⚠️ 注意事项

1. **API Key 安全**
   - 管理页面显示时自动脱敏
   - 编辑时留空表示不修改

2. **Dify 工作流要求**
   - 必须返回符合 `AiExplainSchema` 的 JSON
   - 可以用 ```json 包裹，系统会自动清理

3. **管理员权限**
   - 仅配置在 `ADMIN_EMAILS` 中的邮箱可访问 `/admin` 路由
   - 未授权访问返回 403

## 🐛 投票功能错误（待修复）

**问题**: 用户投票时报错
**状态**: 待调查，数据库约束已正确配置

## 🚀 下一步建议

1. 添加配置测试功能（测试连通性）
2. 添加成本统计面板
3. 支持更多 provider (Claude, 文心一言等)
4. 配置版本管理和回滚
5. 批量导入/导出配置
