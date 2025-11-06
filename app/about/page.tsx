import type { Metadata } from 'next'
import Link from 'next/link'
import { marked } from 'marked'
import { ExternalLink, FileText, Mail, ScrollText } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getProgramInfo } from '@/lib/program-info'

marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
})

const DOCUMENT_SECTIONS = [
  { key: 'termsOfService', anchor: 'terms', title: '服务条款' },
  { key: 'privacyPolicy', anchor: 'privacy', title: '隐私政策' },
  { key: 'changelog', anchor: 'changelog', title: '更新记录' },
] as const

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderDocumentContent(format: string | undefined, content: string) {
  if (!content.trim()) {
    return ''
  }

  const mode = format?.toLowerCase() ?? 'markdown'

  if (mode === 'html') {
    return content
  }

  if (mode === 'markdown') {
    return marked.parse(content)
  }

  return `<pre>${escapeHtml(content)}</pre>`
}

export async function generateMetadata(): Promise<Metadata> {
  const info = await getProgramInfo()
  return {
    title: `关于本程序 | ${info.metadata.name}`,
    description: `了解${info.metadata.name}的版本信息、作者与法律条款。`,
  }
}

export default async function AboutPage() {
  const info = await getProgramInfo()

  const metadataItems = [
    { label: '程序名称', value: info.metadata.name },
    { label: '作者/维护者', value: info.metadata.author },
    { label: '联系邮箱', value: info.metadata.contactEmail, type: 'email' as const },
    { label: '官方网站', value: info.metadata.homepage, type: 'link' as const },
    { label: '支持与帮助', value: info.metadata.supportLink, type: 'link' as const },
    { label: '代码仓库', value: info.metadata.repository, type: 'link' as const },
    { label: '最后更新', value: info.metadata.lastUpdated },
    { label: '版本号', value: info.version.combined },
    { label: 'Git 提交', value: info.version.gitCommit },
  ].filter((item) => item.value && item.value.trim().length > 0)

  return (
    <div className="bg-slate-950">
      <div className="bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950">
        <div className="mx-auto max-w-5xl px-4 pb-12 pt-16 md:px-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/5 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-300">
                  <ScrollText className="h-4 w-4" />
                  项目介绍
                </div>
                <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                  关于 {info.metadata.name}
                </h1>
                <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
                  这是一个为中国业余无线电考生打造的刷题练习平台，我们在此公开项目背景、维护者信息以及服务条款与隐私政策，确保透明、可信和持续迭代。
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/20"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-900/60 to-transparent" />
        <div className="relative mx-auto max-w-5xl space-y-8 px-4 pb-16 md:px-6">
          <Card className="border-white/10 bg-white/5 text-slate-100 backdrop-blur-lg">
            <CardHeader className="border-b border-white/10">
              <CardTitle>程序信息</CardTitle>
              <CardDescription className="text-slate-300">
                项目版本由 package.json 与 Git 提交自动整合，以下信息可在后台实时更新。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 py-6 md:grid-cols-2">
              {metadataItems.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    {item.label}
                  </div>
                  <div className="mt-2 text-base font-medium text-white">
                    {item.type === 'email' ? (
                      <Link
                        href={`mailto:${item.value}`}
                        className="inline-flex items-center gap-2 text-white/90 hover:text-white"
                      >
                        <Mail className="h-4 w-4" />
                        {item.value}
                      </Link>
                    ) : item.type === 'link' ? (
                      <Link
                        href={item.value}
                        className="inline-flex items-center gap-2 text-white/90 hover:text-white"
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {item.value}
                      </Link>
                    ) : (
                      item.value
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200/40 bg-white">
            <CardHeader className="border-b border-slate-200/60 pb-6">
              <CardTitle className="text-slate-900">快速导航</CardTitle>
              <CardDescription className="text-slate-600">
                访问本页的核心法律文档，了解使用条款、隐私政策与最新更新。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 py-6">
              {DOCUMENT_SECTIONS.filter((section) => {
                const doc = info.documents[section.key]
                return doc && doc.content.trim().length > 0
              }).map((section) => (
                <Link
                  key={section.key}
                  href={`#${section.anchor}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                >
                  <FileText className="h-4 w-4 text-emerald-500" />
                  {section.title}
                </Link>
              ))}
            </CardContent>
          </Card>

          {DOCUMENT_SECTIONS.map((section) => {
            const document = info.documents[section.key]
            if (!document || !document.content.trim()) {
              return null
            }

            const html = renderDocumentContent(document.format, document.content)

            return (
              <section
                key={section.key}
                id={section.anchor}
                className="scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg transition hover:border-slate-300"
              >
                <h2 className="text-2xl font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  文档格式：{document.format?.toUpperCase() ?? 'MARKDOWN'}
                </p>
                <article
                  className="mt-6 space-y-4 text-slate-700 dark:text-slate-100 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:text-xl [&_p]:leading-relaxed [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_li]:leading-relaxed [&_a]:text-indigo-600 [&_a:hover]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
