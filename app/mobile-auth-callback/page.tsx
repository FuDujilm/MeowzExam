'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Use a small timeout to ensure the browser has handled the page load
    // before trying to switch apps, which can sometimes be blocked
    const timer = setTimeout(() => {
      if (code) {
        window.location.href = `com.meowzexam://callback?code=${code}`;
      } else if (error) {
        window.location.href = `com.meowzexam://callback?error=${error}`;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-xl font-semibold mb-2">正在跳转...</h1>
      <p className="text-gray-500">请稍候，正在返回应用</p>
      <p className="text-xs text-gray-400 mt-4">如果没有自动跳转，请<a href={`com.meowzexam://callback${window.location.search}`} className="underline">点击这里</a></p>
    </div>
  );
}

export default function MobileAuthCallback() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
