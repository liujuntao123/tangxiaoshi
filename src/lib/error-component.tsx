import type { ErrorComponentProps } from "@tanstack/react-router";

/** 全局错误兜底页（路由级降级之外的最后一道网）。刻意保持零素材/零路由依赖：
 *  纯锚点回首页，即使出错的是路由或资源加载也能渲染。 */
export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink px-8 text-center">
      <p className="title-art paper-glow text-3xl text-paper">出了点小差错</p>
      <p className="max-w-md text-sm leading-relaxed text-paper/75">
        页面暂时打不开了。刷新再试，或先回首页逛逛。
      </p>
      <p className="max-w-md break-words font-mono text-xs text-paper/40" role="presentation">
        {error.message || "未知错误"}
      </p>
      <a
        href="/"
        className="tap mt-2 rounded-full border border-paper/60 px-6 py-2 text-sm tracking-[0.3em] text-paper"
      >
        回首页
      </a>
    </main>
  );
}
