'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowLeft, BookOpenCheck, Code, FileJson, Shield } from 'lucide-react'

const exampleJson = `{
  "library": {
    "code": "GLOBAL_A",
    "name": "A类操作技术能力考试",
    "shortName": "A类",
    "description": "面向全国无线电操作员的 A 类题库",
    "author": "国家无线电管理委员会",
    "date": "2025-01-12",
    "type": "1",
    "region": "中国大陆",
    "version": "2025.1",
    "displayTemplate": "{region} · {shortName} · {totalQuestions}题",
    "visibility": "PUBLIC",
    "access": {
      "mode": "CUSTOM",
      "users": ["coach@example.com", "auditor@example.com"]
    },
    "presets": [
      {
        "code": "A_STANDARD",
        "name": "A类标准考试",
        "description": "考试40题、40分钟、30分及格，其中单选32题，多选8题。",
        "durationMinutes": 40,
        "totalQuestions": 40,
        "passScore": 30,
        "singleChoiceCount": 32,
        "multipleChoiceCount": 8,
        "trueFalseCount": 0
      }
    ]
  },
  "questions": [
    {
      "uuid": "c1f0d3c4-8db3-4f51-96d3-33f2c0e97001",
      "id": "A-001",
      "title": "业余无线电台发射设备必须符合以下哪一项要求？",
      "questionType": "single_choice",
      "difficulty": "medium",
      "category": {
        "main": { "code": "LAW", "name": "法规" },
        "subSection": "1.1.1",
        "fullPath": "法规/许可制度"
      },
      "options": [
        { "id": "A", "text": "出厂即通过认证", "is_correct": false },
        { "id": "B", "text": "经国家无线电管理机构检验合格", "is_correct": true },
        { "id": "C", "text": "由操作员自行判定", "is_correct": false }
      ],
      "picture": "https://cdn.example.com/questions/A-001.png",
      "pictureAlt": "题干配图：发射设备检验流程示意图",
      "correctAnswers": ["B"],
      "explanation": "无线电发射设备必须经权威机构检验合格后才能使用。",
      "tags": ["法规", "许可"],
      "metadata": {
        "sourceId": "S-2024-01",
        "pageSection": "P12"
      }
    }
  ]
}`

export default function QuestionLibraryDocsPage() {
  const headerFields = useMemo(
    () => [
      { field: 'code', required: false, description: '题库编码，建议使用大写字母或下划线。缺省时会使用 shortName 自动生成。' },
      { field: 'name', required: true, description: '题库全称，将展示给用户。' },
      { field: 'shortName', required: true, description: '题库缩写，会用于训练目标下拉展示。' },
      { field: 'description', required: false, description: '题库简介，建议简要说明题库来源或适用范围。' },
      { field: 'author', required: false, description: '题库编写或维护人员。' },
      { field: 'date', required: false, description: '题库编写或发布日期，ISO 8601 字符串。' },
      { field: 'type', required: false, description: '自定义题库分类，例如 1=标准题库，2=测验题库，3=其它。' },
      { field: 'region', required: false, description: '适用的国家或地区，用于训练目标快速过滤。' },
      { field: 'version', required: false, description: '题库版本号，例如 2025.1。' },
      { field: 'displayTemplate', required: false, description: '自定义训练目标展示模板，支持 {region}、{shortName}、{totalQuestions} 等占位符。' },
      { field: 'visibility', required: false, description: '题库可见范围：ADMIN_ONLY / PUBLIC / CUSTOM，默认为 ADMIN_ONLY。' },
      { field: 'access.mode', required: false, description: '在 visibility=CUSTOM 时配置，可与 visibility 同步。' },
      { field: 'access.users', required: false, description: '当模式为 CUSTOM 时，列出具有访问权限的用户邮箱。' },
      { field: 'presets', required: false, description: '可选的考试预设数组，未提供时会使用系统默认的 A/B/C 预设。' },
    ],
    [],
  )

  const questionFields = useMemo(
    () => [
      { field: 'uuid', required: true, description: '题目唯一标识，系统会据此判断新增或更新。缺省时可由系统生成。' },
      { field: 'id', required: true, description: '题目外部编号，用于题干展示及人工对照。' },
      { field: 'title', required: true, description: '题干文本。' },
      { field: 'questionType', required: true, description: '题型，仅支持 single_choice、multiple_choice、true_false。' },
      { field: 'options', required: true, description: '题目选项数组，至少包含 id、text，可通过 is_correct 标记正确选项。' },
      { field: 'picture', required: false, description: '识图题图片 URL。提供后系统会自动标记为图文题并展示配图。' },
      { field: 'pictureAlt', required: false, description: '图片描述或替代文本，建议为图像内容提供说明。' },
      { field: 'hasImage', required: false, description: '兼容字段，布尔值指示题目包含图片。通常在提供 picture 时可省略。' },
      { field: 'imagePath', required: false, description: '兼容字段，旧模板中的图片路径。若同时存在 picture，将以 picture 为准。' },
      { field: 'imageAlt', required: false, description: '兼容字段，对应图片描述。推荐使用 pictureAlt。' },
      { field: 'correctAnswers', required: false, description: '正确答案列表，未提供时会从 options.is_correct 推导。' },
      { field: 'difficulty', required: false, description: '难度标签，可自定义字符串。' },
      { field: 'category', required: false, description: '分类信息，支持 main / subSection / fullPath 等字段。' },
      { field: 'metadata', required: false, description: '额外元数据，例如 sourceId、pageSection、originalAnswer 等。' },
    ],
    [],
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500">
              <BookOpenCheck className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.2em]">Admin Guide</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">题库导入规范</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              本文档说明后台“题库管理”功能所需的 JSON 格式。导入题库前，请确认头文件与题目字段完整且数据准确，以便系统自动生成统计信息、训练目标展示以及考试预设。
            </p>
          </div>
          <Link
            href="/admin/import"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            返回题库管理
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
        <section className="rounded-xl bg-white px-6 py-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">一、头文件字段</h2>
          <p className="mt-2 text-sm text-slate-600">
            题库头文件用于描述题库元信息、显示模板以及访问策略，也是“选择训练目标”列表的主要数据来源。
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-slate-600">字段</th>
                  <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-slate-600">是否必填</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {headerFields.map((item) => (
                  <tr key={item.field} className="bg-white">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{item.field}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{item.required ? '是' : '否'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-xs text-slate-600">
            <Shield className="mr-2 inline-block h-4 w-4 align-middle text-slate-500" />
            可见性说明：<strong>ADMIN_ONLY</strong> 仅后台管理员可见，<strong>PUBLIC</strong> 对所有登录用户开放，
            <strong>CUSTOM</strong> 需在 <code className="rounded bg-slate-200 px-1">access.users</code> 中列出邮箱白名单。
          </div>
        </section>

        <section className="rounded-xl bg-white px-6 py-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">二、题目字段</h2>
          <p className="mt-2 text-sm text-slate-600">
            每个题目对象需要包含题干、题型、选项与答案信息；可选字段用于扩展分类、难度、元数据等。
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-slate-600">字段</th>
                  <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-slate-600">是否必填</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questionFields.map((item) => (
                  <tr key={item.field} className="bg-white">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{item.field}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{item.required ? '是' : '否'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">三、完整 JSON 示例</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            可将以下示例复制到 JSON 编辑器中，根据实际题库进行修改。导入前建议使用 JSON 校验工具确认语法正确。
          </p>
          <pre className="mt-4 max-h-[540px] overflow-auto rounded-lg bg-slate-900 p-5 text-[12px] leading-5 text-emerald-50">
{exampleJson}
          </pre>
        </section>

        <section className="rounded-xl bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">四、导入流程建议</h2>
          </div>
          <ol className="mt-3 space-y-3 text-sm text-slate-600">
            <li>使用示例模板整理题库 JSON，确保头文件字段与题目数组结构完整。</li>
            <li>在后台“题库管理”页面上传文件，等待系统校验并生成统计信息。</li>
            <li>导入成功后，可在“选择训练目标”下拉列表与模拟考试预设中看到新题库。</li>
            <li>如需限制访问，请在 <code className="rounded bg-slate-200 px-1">access.users</code> 中填写允许访问的用户邮箱。</li>
            <li>更新题库时保持 <code className="rounded bg-slate-200 px-1">uuid</code> 不变，系统将根据 UUID 自动更新已有题目并移除缺失题目。</li>
          </ol>
        </section>
      </main>
    </div>
  )
}
