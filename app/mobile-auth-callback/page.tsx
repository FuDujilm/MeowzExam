'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CallbackContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    // 1. 获取 OAuth 返回的 code 和 error
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    // 2. 构造移动端 Custom Scheme 链接
    // 格式: com.meowzexam://callback?code=...
    const appScheme = 'com.meowzexam://callback'
    const queryString = searchParams.toString()
    const targetUrl = `${appScheme}?${queryString}`

    // 3. 如果有参数，则执行跳转
    if (code || error) {
        // 尝试唤起 App
        window.location.href = targetUrl
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-sm w-full">
        <h1 className="text-xl font-bold mb-4 text-gray-800">正在跳转回 App...</h1>
        <p className="text-gray-500 mb-6">如果未自动跳转，请点击下方按钮</p>
        
        <button 
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          onClick={() => {
              const appScheme = 'com.meowzexam://callback'
              const queryString = searchParams.toString()
              window.location.href = `${appScheme}?${queryString}`
          }}
        >
          手动跳转
        </button>
      </div>
    </div>
  )
}

export default function MobileAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <CallbackContent />
    </Suspense>
  )
}
