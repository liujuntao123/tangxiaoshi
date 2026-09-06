import { useEffect, useState, type ReactNode } from "react";
import { sfxTap } from "@/lib/game/sfx";

/**
 * 左右分页容器（移动端游戏禁用长列表滚动，AGENTS.md）。
 * children 只渲染当前页；箭头 + 页码指示。pageSize 缺省一页全放。
 */
export function PagedList({
  pageSize,
  count,
  children,
  className = "",
  pageButtonClass = "h-11 w-11",
  showCounter = true,
}: {
  pageSize: number;
  count: number;
  children: (from: number, to: number) => ReactNode;
  className?: string;
  pageButtonClass?: string;
  showCounter?: boolean;
}) {
  const [page, setPage] = useState(0);
  const total = Math.max(1, Math.ceil(count / Math.max(1, pageSize)));
  const safePage = Math.min(page, total - 1);
  const from = safePage * pageSize;
  const to = Math.min(count, from + pageSize);

  useEffect(() => {
    setPage(0);
  }, [count]);

  function go(delta: number) {
    const next = Math.min(total - 1, Math.max(0, page + delta));
    if (next === page) return;
    sfxTap();
    setPage(next);
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="min-h-0 flex-1">{children(from, to)}</div>
      <div className="flex items-center justify-center gap-4 pb-3 pt-2">
        <button
          type="button"
          aria-label="上一页"
          disabled={page <= 0}
          onClick={() => go(-1)}
          className={`tap grid place-items-center disabled:grayscale ${pageButtonClass}`}
        >
          <img src="/ui/back-btn.png" alt="" className="h-10 w-10 object-contain drop-shadow-md" />
        </button>
        {showCounter ? (
          <span className="ink-chip paper-glow px-3.5 py-1 text-[11px] tracking-[0.3em] text-paper/95">
            {safePage + 1} / {total}
          </span>
        ) : null}
        <button
          type="button"
          aria-label="下一页"
          disabled={page >= total - 1}
          onClick={() => go(1)}
          className={`tap grid place-items-center disabled:grayscale ${pageButtonClass}`}
        >
          <img src="/ui/back-btn.png" alt="" className="h-10 w-10 -scale-x-100 object-contain drop-shadow-md" />
        </button>
      </div>
    </div>
  );
}
