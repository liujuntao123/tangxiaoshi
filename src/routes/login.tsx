import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PlaqueButton } from "@/components/game/choice-slip";
import { ArtPanel } from "@/components/game/stage";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CORE_IMAGES, preloadImages } from "@/lib/game/preload";
import { FormEvent, useEffect, useState } from "react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bgReady, setBgReady] = useState(false);

  useEffect(() => {
    preloadImages(CORE_IMAGES);
  }, []);

  // 题库预热：诗库数据 chunk 是全部游戏页面的公共依赖（性能走查 2026-09）。
  // 在用户提交登录/注册时后台动态 import，下载解析正好与鉴权请求、跳转并行；
  // 动态 import 不阻塞水合，也不会拖慢登录页本身。
  const warmContentBank = () => {
    void import("@/lib/game/content");
  };

  // 背景就绪兜底：预载可能先于 React onLoad 完成，此时 onLoad 不再触发，
  // 必须用 Image() 检查 complete，否则背景永远透明（看起来没背景）。
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (live) setBgReady(true);
    };
    img.src = "/art/bg/home.png";
    if (img.complete) setBgReady(true);
    return () => {
      live = false;
    };
  }, []);

  if (!isPending && user) {
    return <Navigate to="/" />;
  }

  const registering = mode === "up";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!authEnabled) return;
    if (registering && password !== confirm) {
      setError("两次密码不一致");
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    setBusy(true);
    warmContentBank();
    setError(null);
    try {
      if (registering) {
        const signedUp = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0] || "唐小诗",
        });
        if (signedUp.error) throw new Error(signedUp.error.message || "注册失败");
      } else {
        const signedIn = await authClient.signIn.email({ email, password });
        if (signedIn.error) throw new Error(signedIn.error.message || "登录失败");
      }
      await authClient.getSession();
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "请再试一次");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-ink">
      <div className="relative mx-auto h-dvh w-full max-w-[430px] overflow-hidden">
        <img
          src="/art/bg/home.png"
          alt=""
          decoding="async"
          onLoad={() => setBgReady(true)}
          className={`absolute inset-0 h-full w-full object-cover object-[center_48%] stage-photo ${bgReady ? "is-in" : ""}`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/35 via-transparent to-ink/25" />
        {/* 梅枝角饰：自左上垂下的一枝，给纯场景登录页一点「庭院」细节 */}
        <img
          src="/ui/branch-plum.png"
          alt=""
          className="pointer-events-none absolute left-0 top-0 z-0 w-24 opacity-90 drop-shadow-md"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
        <p className="title-art paper-glow absolute inset-x-0 top-[24%] z-10 px-4 text-center text-[clamp(1.8rem,8vw,2.4rem)] text-paper">
          唐小诗环游记
        </p>
        <form
          onSubmit={onSubmit}
          className="absolute inset-x-3 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-20 flex flex-col"
        >
          {/* hero 容器 mb-3：消除小诗脚部与下方卡片边线的穿插挤压 */}
          <div className="mb-3 flex justify-center">
            <div className="relative flex h-28 w-28 items-end justify-center">
              <span className="sprite-shadow" />
              <img
                src="/sprites/hero.png"
                alt=""
                className="relative z-10 h-28 w-auto object-contain object-bottom drop-shadow-lg idle-bob"
              />
            </div>
          </div>
          <ArtPanel>
            <p className="title-ink text-xl">{registering ? "注册" : "登录"}</p>
            <div className="ink-divider mx-auto mt-2 max-w-[10rem]" aria-hidden>
              <span className="font-display text-[9px]">◈</span>
            </div>
            <label className="mt-2.5 block text-[11px] tracking-widest text-ink-soft">
              邮箱
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="paper-input mt-0.5 block w-full px-3 py-1.5 text-base text-ink outline-none"
              />
            </label>
            <label className="mt-1.5 block text-[11px] tracking-widest text-ink-soft">
              密码
              <input
                type="password"
                required
                minLength={8}
                autoComplete={registering ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="paper-input mt-0.5 block w-full px-3 py-1.5 text-base text-ink outline-none"
              />
            </label>
            {registering ? (
              <label className="mt-1.5 block text-[11px] tracking-widest text-ink-soft">
                再写一遍密码
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="paper-input mt-0.5 block w-full px-3 py-1.5 text-base text-ink outline-none"
                />
              </label>
            ) : null}
            {error ? <p className="mt-1.5 text-sm text-seal">{error}</p> : null}
            {/* 主提交按钮：改用 PlaqueButton 牌匾，树立正确的视觉重量 */}
            <div className="mt-3 flex justify-center">
              <PlaqueButton
                type="submit"
                disabled={busy || !authEnabled}
                className="tap-deep flex w-full justify-center"
              >
                {busy ? "稍候" : registering ? "注册" : "进入"}
              </PlaqueButton>
            </div>
            {/* 去注册/去登录：降级为轻量文字链接按钮 */}
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                className="tap text-xs tracking-widest text-ink-soft underline-offset-4 hover:underline"
                onClick={() => {
                  setMode(registering ? "in" : "up");
                  setConfirm("");
                  setError(null);
                }}
              >
                {registering ? "去登录" : "去注册"}
              </button>
            </div>
          </ArtPanel>
        </form>
      </div>
    </main>
  );
}
