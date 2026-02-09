'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    
    // Parse source from state (format: "source=app" or just "app" depending on implementation)
    // Here we handle "source=app"
    const isAppSource = state && state.includes('source=app');

    // Use a small timeout to ensure the browser has handled the page load
    // before trying to switch apps, which can sometimes be blocked
    const timer = setTimeout(() => {
      if (isAppSource) {
        // Redirect to Mobile App Custom Scheme
        if (code) {
          window.location.href = `com.meowzexam://callback?code=${code}`;
        } else if (error) {
          window.location.href = `com.meowzexam://callback?error=${error}`;
        }
      } else {
        // Redirect to Web Page (e.g., dashboard or home)
        // This allows this callback page to be used by other clients if needed,
        // or provides a graceful fallback for web users who might stumble here.
        if (code) {
           // In a real web auth flow, we might exchange code here or redirect to a route that does
           // For now, redirect to home as a fallback
           window.location.href = `/?code=${code}`; 
        } else {
           window.location.href = '/';
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-xl font-semibold mb-2">正在跳转...</h1>
      <p className="text-gray-500">请稍候，正在处理登录请求</p>
      {searchParams.get('state')?.includes('source=app') && (
        <p className="text-xs text-gray-400 mt-4">如果没有自动跳转，请<a href={`com.meowzexam://callback${window.location.search}`} className="underline">点击这里</a></p>
      )}
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
