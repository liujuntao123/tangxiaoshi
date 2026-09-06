import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { findPoem } from "@/lib/game/content";
import { GAME_BACKGROUNDS } from "@/lib/game/content/meta";
import {
  completeNode,
  grantRelic,
  isExpeditionPath,
  newExpedition,
  retryNode,
  summarizeNodes,
  totalMistakes,
  useExpedition,
  type ExpeditionPath,
  type ExpeditionPlay,
  type ExpeditionResultView,
  type RelicId,
} from "@/lib/game/expedition";
import { MissingCard } from "@/components/game/missing-card";
import { PoemQuiz, type QuizMode } from "@/components/game/poem-quiz";

type PlaySearch = { from?: string; route?: ExpeditionPath; node?: number };

export const Route = createFileRoute("/_app/play/$poemId")({
  validateSearch: (search: Record<string, unknown>): PlaySearch => {
    const rawNode = typeof search.node === "string" ? Number(search.node) : search.node;
    const node = typeof rawNode === "number" && Number.isInteger(rawNode) && rawNode >= 0 && rawNode <= 2 ? rawNode : undefined;
    return {
      from: typeof search.from === "string" ? search.from : undefined,
      route: isExpeditionPath(search.route) ? search.route : undefined,
      node,
    };
  },
  component: PlayPoemRoute,
});

function PlayPoemRoute() {
  const { poemId } = Route.useParams();
  const { from, route, node } = Route.useSearch();
  const navigate = useNavigate();
  const expeditionCtl = useExpedition();
  // 远征结算快照：onWin/onLose 时写入，经 expedition.result 传回答题页驱动结局面板。
  const [expResult, setExpResult] = useState<ExpeditionResultView | null>(null);

  // 旧书签/旧 PWA 深链可能带着已下线的 id（如旧关卡 xianqin-caishiguan-1）：
  // 温和降级，不进错误边界。
  const poem = findPoem(poemId);
  if (!poem) {
    return (
      <MissingCard
        bg={GAME_BACKGROUNDS.home}
        title="诗卡未找到"
        hint="这张诗卡不存在，或已随内容编排更新搬了家。去环游里挑一张吧。"
      />
    );
  }

  const practice = from === "practice";
  const mode: QuizMode = practice ? "practice" : "tour";

  const state = expeditionCtl.state;
  // 结算后 completeNode 会把 nodeIndex 推到下一页，但当前路由仍停在旧诗卡。
  // 结算期间按 URL 节点锁定原节点，避免结果面板丢失修页奖励/结局上下文。
  const resultNodeIndex = expResult && node !== undefined ? node : state?.nodeIndex;
  const entry = state && resultNodeIndex !== undefined ? (state.nodes[resultNodeIndex] ?? null) : null;
  // 远征模式：/tour 选卡时已把诗卡/路线写进当前节点；结算快照允许旧节点已标记 done。
  const expeditionActive = Boolean(
    state &&
      entry &&
      (entry.status === "pending" || Boolean(expResult)) &&
      route &&
      node === resultNodeIndex &&
      entry.path === route &&
      entry.poemId === poem.id &&
      !practice,
  );

  // 深链带了 route 参数但对不上远征状态（如刷新后状态已推进）：
  // 只保留 HUD 里的节点/路线语义，不启用远征规则。
  const badge = !expeditionActive && route ? { nodeIndex: node ?? state?.nodeIndex ?? 0, path: route } : null;

  let expedition: ExpeditionPlay | undefined;
  if (expeditionActive && state && entry) {
    const snapshot = state;
    expedition = {
      // 结算期锁定到 URL 节点（snapshot.nodeIndex 已被 completeNode 推进），
      // 中盘结局面板的「赶往第 N 页」以本节点为准（expeditionActive 已保证有值）。
      nodeIndex: resultNodeIndex ?? 0,
      path: entry.path,
      fire: snapshot.fire,
      relic: entry.relic,
      result: expResult,
      onWin: (outcome) => {
        const total = totalMistakes(snapshot) + outcome.mistakes;
        setExpResult({
          won: true,
          ending: snapshot.nodeIndex + 1 >= 3 ? (total === 0 ? "clear" : "scarred") : null,
          mistakes: outcome.mistakes,
          totalMistakes: total,
          score: outcome.score,
          maxCombo: outcome.maxCombo,
          stars: outcome.stars,
          fireLeft: outcome.fireLeft,
          nodes: summarizeNodes(snapshot, { won: true, mistakes: outcome.mistakes, score: outcome.score }),
        });
        expeditionCtl.mutate((current) =>
          completeNode(current, {
            won: true,
            mistakes: outcome.mistakes,
            score: outcome.score,
            fireLeft: outcome.fireLeft,
          }),
        );
      },
      onLose: (outcome) => {
        const total = totalMistakes(snapshot) + outcome.mistakes;
        setExpResult({
          won: false,
          ending: "failed",
          mistakes: outcome.mistakes,
          totalMistakes: total,
          score: outcome.score,
          maxCombo: 0,
          stars: 0,
          fireLeft: 0,
          nodes: summarizeNodes(snapshot, { won: false, ...outcome }),
        });
        expeditionCtl.mutate((current) =>
          completeNode(current, { won: false, mistakes: outcome.mistakes, score: outcome.score, fireLeft: 0 }),
        );
      },
      onRetry: () => {
        setExpResult(null);
        expeditionCtl.mutate(retryNode);
      },
      onChooseRelic: (relic: Exclude<RelicId, "none">) => {
        expeditionCtl.mutate((current) => grantRelic(current, relic));
        void navigate({ to: "/tour" });
      },
      onToTour: () => {
        void navigate({ to: "/tour" });
      },
      onRelaunch: () => {
        expeditionCtl.mutate(() => newExpedition());
        void navigate({ to: "/tour" });
      },
      onHome: () => {
        void navigate({ to: "/" });
      },
    };
  }

  const backTo = practice ? "/practice" : expeditionActive || badge ? "/tour" : `/library/${poem.collectionId}/${poem.collectionId}-c${poem.chapterIndex}/${poem.authorId}`;
  return (
    <PoemQuiz
      poem={poem}
      mode={mode}
      backTo={backTo}
      expedition={expedition}
      expeditionBadge={badge}
      onExit={() => {
        if (practice) void navigate({ to: "/practice" });
        else if (expeditionActive || badge) void navigate({ to: "/tour" });
        else
          void navigate({
            to: "/library/$collectionId/$chapterId/$authorId",
            params: {
              collectionId: poem.collectionId,
              chapterId: `${poem.collectionId}-c${poem.chapterIndex}`,
              authorId: poem.authorId,
            },
          });
      }}
    />
  );
}
