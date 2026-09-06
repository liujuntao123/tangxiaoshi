import { createServerFn } from "@tanstack/react-start";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { CORE_IMAGES, preloadImages } from "@/lib/game/preload";
import { useEffect, useState } from "react";
import appCss from "../styles.css?url";

const APP_NAME = "唐小诗环游记";

const fetchSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const u = await getSessionUser();
  return u ? { id: u.id, email: u.email } : null;
});

export const Route = createRootRoute({
  beforeLoad: async () => ({ sessionUser: await fetchSessionUser() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#3D5A4C" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      ...CORE_IMAGES.slice(0, 8).map((href) => ({
        rel: "preload" as const,
        href,
        as: "image" as const,
      })),
    ],
  }),
  component: RootDocument,
});

function BootPreload() {
  useEffect(() => {
    preloadImages(CORE_IMAGES);
  }, []);
  return null;
}

/**
 * 字体样式表异步注入（真·根因修复，性能走查 2026-09）：
 * 浏览器规定「脚本的执行要等它之前的所有样式表完成」——此前 Google Fonts 的
 * <link rel=stylesheet> 写死在 head 里，样式表在 Google 被墙/慢网络下长时间
 * 挂起时，后续全部 JS 不执行，SSR 先画出的页面整页可看不可点（实测挂起 75s
 * 仍不水合），这正是「点开始远征/继续远征没反应、过一阵自己好了」的根因。
 * 改为水合完成后由 JS 注入 <link>：永不阻塞脚本；能访问 Google 的用户稍后
 * 字体照常生效（display=swap），不能访问的用户用系统字体回退，应用完全可用。
 */
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@500;600&display=swap";

function AsyncFonts() {
  useEffect(() => {
    if (document.querySelector("link[data-async-fonts]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    link.dataset.asyncFonts = "true";
    document.head.appendChild(link);
  }, []);
  return null;
}

/**
 * 水合遮罩（性能走查 2026-09）：
 * 页面是 SSR 先画出来的，而题库数据 chunk（~4.6MB JS）在入口静态图里，
 * 手机上「已见其形、未闻其令」的窗口里点击全部无效——这正是
 * 「点开始远征没反应」的体感来源。遮罩 SSR 时可见、客户端水合完成后淡出，
 * 把死窗口变成诚实的加载态；SPA 内部跳转不会重挂根组件，只会出现这一次。
 */
function BootVeil() {
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    // 双 rAF：确保首帧遮罩已绘制、水合提交完成后再撤
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setBooted(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
  return (
    <div
      aria-hidden={booted}
      className={`fixed inset-0 z-50 grid place-items-center bg-ink transition-opacity duration-300 ${
        booted ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="px-6 text-center">
        <img
          src="/sprites/hero.png"
          alt=""
          className="idle-bob mx-auto h-28 w-auto object-contain"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
        <p className="title-art paper-glow mt-3 text-3xl text-paper">唐小诗环游记</p>
        <p className="paper-glow mt-2 text-xs tracking-widest text-paper/70">正在打开书卷</p>
      </div>
    </div>
  );
}

function RootDocument() {
  return (
    <html lang="zh-CN" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <BootPreload />
        <AsyncFonts />
        <BootVeil />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
