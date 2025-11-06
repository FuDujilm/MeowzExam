export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-100 flex flex-col items-center justify-center px-6">
      <div className="relative mb-10">
        <div className="h-28 w-28 rounded-full border-4 border-indigo-200" />
        <div className="absolute inset-0 h-28 w-28 rounded-full border-t-4 border-indigo-500 animate-spin" />
        <div className="absolute inset-4 h-20 w-20 rounded-full bg-white shadow-inner" />
        <div className="absolute inset-6 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 opacity-40 animate-pulse" />
      </div>

      <h1 className="text-2xl font-semibold text-indigo-700 tracking-wide">正在加载页面</h1>
      <p className="mt-2 text-sm text-indigo-500/80 text-center max-w-md">
        正在为您准备考试题目与解析，请稍候片刻，马上就绪。
      </p>

      <div className="mt-10 flex items-center justify-center gap-3">
        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" />
        <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce [animation-delay:120ms]" />
        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:240ms]" />
      </div>
      <p className="mt-4 text-xs text-indigo-400/90 text-center max-w-sm">
        小提示：保持网络稳定，加载完成后即可开始练习或考试。
      </p>
    </div>
  )
}
