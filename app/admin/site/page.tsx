'use client'

import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

import AdminNav from '@/components/admin/AdminNav'
import { ProgramInfoEditor } from '@/components/admin/program-info-editor'
import { useSiteConfig } from '@/components/site/site-config-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useNotification } from '@/components/ui/notification-provider'
import type { SiteConfig } from '@/lib/site-config'

type FormState = {
  siteTitle: string
  siteDescription: string
  seoKeywords: string
  logoUrl: string
  faviconUrl: string
  ogImageUrl: string
  headerContent: string
  footerContent: string
}

function mapConfigToForm(config: SiteConfig): FormState {
  return {
    siteTitle: config.siteTitle ?? '',
    siteDescription: config.siteDescription ?? '',
    seoKeywords: config.seoKeywords ?? '',
    logoUrl: config.logoUrl ?? '',
    faviconUrl: config.faviconUrl ?? '',
    ogImageUrl: config.ogImageUrl ?? '',
    headerContent: config.headerContent ?? '',
    footerContent: config.footerContent ?? '',
  }
}

export default function AdminSiteConfigPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { notify } = useNotification()
  const { config, setConfig } = useSiteConfig()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(mapConfigToForm(config))
  const [error, setError] = useState<string | null>(null)

  const dirty = useMemo(() => {
    const reference = mapConfigToForm(config)
    return Object.entries(form).some(([key, value]) => reference[key as keyof FormState] !== value)
  }, [config, form])

  useEffect(() => {
    setForm(mapConfigToForm(config))
  }, [config])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status !== 'authenticated') {
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/site-config')
        if (!response.ok) {
          throw new Error('加载站点信息失败')
        }
        const data = (await response.json()) as SiteConfig
        setConfig(data)
        setForm(mapConfigToForm(data))
        setError(null)
      } catch (err: any) {
        console.error(err)
        setError(err?.message ?? '无法加载站点信息')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router, setConfig, status])

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleReset = () => {
    setForm(mapConfigToForm(config))
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/site-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (response.status === 403) {
        const payload = await response.json()
        const message = payload?.error ?? '权限不足：需要管理员权限'
        notify({ variant: 'warning', title: '保存失败', description: message })
        return
      }

      if (!response.ok) {
        throw new Error('保存站点信息失败')
      }

      const updated = (await response.json()) as SiteConfig
      setConfig(updated)
      setForm(mapConfigToForm(updated))

      notify({ variant: 'success', title: '保存成功', description: '站点信息已更新' })
    } catch (err: any) {
      console.error(err)
      notify({ variant: 'danger', title: '保存失败', description: err?.message ?? '请稍后再试' })
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>正在重定向到登录页面...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">站点信息配置</h1>
              <p className="mt-2 text-sm text-gray-600">
                管理站点的基础信息、品牌展示与 SEO 设置。
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} disabled={saving || !dirty}>
                重置
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !dirty}>
                {saving ? '保存中...' : '保存配置'}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">基础信息</h2>
            <p className="mb-6 mt-2 text-sm text-gray-500">
              站点标题和简介会展示在头部导航、页面标题等位置。
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">站点标题</label>
                <Input value={form.siteTitle} onChange={handleChange('siteTitle')} placeholder="请输入站点标题" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">SEO 关键词</label>
                <Input
                  value={form.seoKeywords}
                  onChange={handleChange('seoKeywords')}
                  placeholder="使用逗号分隔关键词"
                />
                <p className="text-xs text-gray-400">
                  当前关键词数量：{form.seoKeywords.split(',').filter((item) => item.trim().length > 0).length}
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <label className="text-sm font-medium text-gray-700">站点简介</label>
              <Textarea
                value={form.siteDescription}
                onChange={handleChange('siteDescription')}
                rows={3}
                placeholder="用于呈现站点核心介绍"
              />
            </div>
          </section>

          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">品牌资源</h2>
            <p className="mb-6 mt-2 text-sm text-gray-500">用于导航栏、浏览器标签等位置的资源链接可使用相对路径或完整 URL。</p>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Logo 地址</label>
                <Input value={form.logoUrl} onChange={handleChange('logoUrl')} placeholder="例如 /logo.svg" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Favicon 地址</label>
                <Input value={form.faviconUrl} onChange={handleChange('faviconUrl')} placeholder="例如 /favicon.ico" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">OG 分享图</label>
                <Input value={form.ogImageUrl} onChange={handleChange('ogImageUrl')} placeholder="用于社交分享的图片 URL" />
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">页眉与页脚</h2>
            <p className="mb-6 mt-2 text-sm text-gray-500">
              支持 HTML 片段，可嵌入链接或强调文本。页脚中的 <code className="rounded bg-gray-100 px-1">&#123;YEAR&#125;</code> 会自动替换为当前年份。
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">页眉内容</label>
                <Textarea
                  value={form.headerContent}
                  onChange={handleChange('headerContent')}
                  rows={6}
                  placeholder="可填写 HTML 片段"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">页脚内容</label>
                <Textarea
                  value={form.footerContent}
                  onChange={handleChange('footerContent')}
                  rows={6}
                  placeholder="建议包含版权、联系方式等信息"
                />
              </div>
            </div>
          </section>

          <ProgramInfoEditor />
        </div>
      </div>
    </div>
  )
}
