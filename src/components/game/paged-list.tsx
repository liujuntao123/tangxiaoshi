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
  showCounter = true,
}: {
  pageSize: number;
  count: number;
  children: (from: number, to: number) => ReactNode;
  className?: string;
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
      {/* overflow-y-auto：页内容超出预算时在本区内滚动（移动端隐藏滚动条），
          绝不溢出盖住下方的翻页玉钮；m-auto 让短页（如只有 2 章）垂直居中不显空 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="m-auto w-full">{children(from, to)}</div>
      </div>
      {/* 翻页玉钮：page-prev/next.png 玉盘箭头（缺图回退字衬 ‹ ›），游戏 UI 风格 */}
      <div className="flex items-center justify-center gap-4 pb-4 pt-2">
        <PageArrow dir="prev" disabled={page <= 0} onClick={() => go(-1)} />
        {showCounter ? (
          <span className="ink-chip paper-glow px-3.5 py-1 text-[11px] tracking-[0.3em] text-paper/95">
            {safePage + 1} / {total}
          </span>
        ) : null}
        <PageArrow dir="next" disabled={page >= total - 1} onClick={() => go(1)} />
      </div>
    </div>
  );
}

/** 翻页玉钮：玉盘箭头贴图 + 字衬兜底；禁用态整钮置灰失去按压反馈。 */
function PageArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "上一页" : "下一页"}
      disabled={disabled}
      onClick={onClick}
      className="tap relative grid h-11 w-11 place-items-center disabled:opacity-60"
    >
      {/* 字衬兜底：贴图缺失时露出（生成图正常时被完全盖住） */}
      <span className="absolute inset-0 grid place-items-center rounded-full border border-paper/30 bg-paper/85 font-display text-xl leading-none text-ink-soft">
        {dir === "prev" ? "‹" : "›"}
      </span>
      <img
        src={`/ui/page-${dir}.png`}
        alt=""
        className={`relative h-11 w-11 object-contain drop-shadow-md ${disabled ? "saturate-[0.45]" : ""}`}
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
      />
    </button>
  );
}
