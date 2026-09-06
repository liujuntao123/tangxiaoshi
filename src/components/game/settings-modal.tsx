import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { sfxTap } from "@/lib/game/sfx";
import { useState } from "react";
import { PlaqueButton } from "./choice-slip";

/** 玉佩设置入口：任何页面右上角都有，点击弹出设置弹窗。 */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="设置"
        className="tap pointer-events-auto shrink-0"
        onClick={() => {
          sfxTap();
          setOpen(true);
        }}
      >
        <img src="/ui/btn-settings.png" alt="" className="h-9 w-9 object-contain drop-shadow-md" />
      </button>
      {open ? <SettingsModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div
      className="pop-in pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-ink/60 px-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ui-speech w-full max-w-[300px]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="设置"
      >
        <div className="relative px-2 py-5 text-center">
          {/* 梅枝角饰：面板左上角的一枝，柔化弹窗的「表单感」 */}
          <img
            src="/ui/branch-plum.png"
            alt=""
            className="pointer-events-none absolute -left-1.5 -top-1.5 z-0 w-14 opacity-80"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
          <p className="title-ink relative z-10 text-2xl">设置</p>
          <p className="relative z-10 mt-2 truncate px-4 text-[11px] tracking-widest text-ink-soft">
            {user?.primaryEmail ?? user?.displayName ?? "旅人"}
          </p>
          <div className="ink-divider mx-auto mt-3.5 max-w-[11rem]" aria-hidden>
            <span className="font-display text-[9px]">◈</span>
          </div>
          <div className="relative z-10 mt-3.5 flex flex-col items-center gap-3">
            <PlaqueButton
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut("/login").catch(() => setSigningOut(false));
              }}
            >
              {signingOut ? "退出中…" : "退出登录"}
            </PlaqueButton>
            <button
              type="button"
              className="tap text-xs tracking-widest text-ink-soft"
              onClick={() => {
                sfxTap();
                onClose();
              }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
