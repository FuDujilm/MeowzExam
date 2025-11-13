const TIPS = [
  '正在同步最新题库，请保持网络畅通。',
  '错题会自动记录，稍后可在练习中重点复习。',
  '小助手随时待命，遇到不会的题目记得来问我。',
  '完成每日签到可获得额外积分奖励。',
]

export default function Loading() {
  const tip = TIPS[new Date().getSeconds() % TIPS.length]

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-100 px-6 py-12 text-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl">
        <div className="absolute inset-20 rounded-full bg-gradient-to-br from-indigo-200 via-transparent to-sky-100 dark:from-indigo-900/40 dark:via-transparent dark:to-sky-900/20" />
      </div>

      <div className="relative w-full max-w-xl rounded-3xl border border-white/60 bg-white/80 p-10 shadow-lg shadow-indigo-100/60 backdrop-blur-md dark:border-white/5 dark:bg-slate-900/70 dark:shadow-indigo-900/30">
        <div className="flex flex-col items-center space-y-8">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <span
              className="absolute inline-flex h-full w-full animate-[spin_1.6s_linear_infinite] rounded-full border-4 border-transparent border-t-indigo-500 dark:border-t-sky-400"
              aria-hidden
            />
            <span className="absolute inline-flex h-4/5 w-4/5 animate-[spin_2.4s_linear_infinite] rounded-full border-4 border-transparent border-b-sky-400 dark:border-b-indigo-400" />
            <span className="relative inline-flex h-4/6 w-4/6 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-2xl font-semibold text-white shadow-lg">
              <span className="m-auto animate-pulse">📡</span>
            </span>
          </div>

          <div className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-500 dark:text-sky-400">Loading</p>
            <h1 className="text-3xl font-semibold text-slate-800 dark:text-white">正在加载页面</h1>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              系统正在准备题库、积分与个性化配置。速度稍慢时，请耐心等待片刻。
            </p>
          </div>

          <div className="w-full space-y-3">
            <div className="relative h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
              <span
                className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500 dark:from-sky-500 dark:via-indigo-400 dark:to-sky-500"
                style={{ animation: 'loading-progress 1.8s ease-in-out infinite' }}
              />
            </div>
            <p className="text-center text-xs text-slate-400 dark:text-slate-400">{tip}</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loading-progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(60%);
          }
          100% {
            transform: translateX(120%);
          }
        }
      `}</style>
    </div>
  )
}
