import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ArtPanel, JadeEnter } from "@/components/game/stage";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { FormEvent, useState } from "react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
          src="/art/scene-moon.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_72%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/35 via-transparent to-ink/20" />
        <p className="title-art paper-glow absolute inset-x-0 top-[9%] z-10 text-center text-4xl text-paper">
          唐小诗历险记
        </p>
        <div className={`absolute inset-x-0 z-10 flex justify-center ${registering ? "bottom-[46%]" : "bottom-[34%]"}`}>
          <div className="relative flex h-40 w-36 items-end justify-center">
            <span className="sprite-shadow" />
            <img
              src="/sprites/hero.png"
              alt=""
              className="relative z-10 h-40 w-auto object-contain object-bottom drop-shadow-lg idle-bob"
            />
          </div>
        </div>
        <form
          onSubmit={onSubmit}
          className="absolute inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-20"
        >
          <ArtPanel className="px-7 pb-5 pt-7">
            <p className="title-ink text-2xl">{registering ? "注册" : "登录"}</p>
            <label className="mt-2 block text-[11px] tracking-widest text-ink-soft">
              邮箱
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full border-x-0 border-t-0 border-b border-ink/25 bg-transparent text-base text-ink outline-none"
              />
            </label>
            <label className="mt-2 block text-[11px] tracking-widest text-ink-soft">
              密码
              <input
                type="password"
                required
                minLength={8}
                autoComplete={registering ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-10 w-full border-x-0 border-t-0 border-b border-ink/25 bg-transparent text-base text-ink outline-none"
              />
            </label>
            {registering ? (
              <label className="mt-2 block text-[11px] tracking-widest text-ink-soft">
                再写一遍密码
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 h-10 w-full border-x-0 border-t-0 border-b border-ink/25 bg-transparent text-base text-ink outline-none"
                />
              </label>
            ) : null}
            {error ? <p className="mt-2 text-sm text-seal">{error}</p> : null}
            <div className="mt-3">
              <JadeEnter
                type="submit"
                label={busy ? "请稍候" : registering ? "注册并进入" : "进入游戏"}
                disabled={busy || !authEnabled}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setMode(registering ? "in" : "up");
                setConfirm("");
                setError(null);
              }}
              className="mt-1 block w-full text-center text-[11px] tracking-widest text-ink-soft"
            >
              {registering ? "已有账号，去登录" : "没有账号，去注册"}
            </button>
          </ArtPanel>
        </form>
      </div>
    </main>
  );
}
