/**
 * 墨潮远征：三节点远征状态（P0 深重构，docs/deep-reboot-brief.md §3/§6）。
 *
 * - 状态只服务「当前一局远征」，持久化到 localStorage，刷新不丢；
 * - 诗印/分数/成就仍走 PlayerSave（本模块不读写存档）；
 * - 所有转移都是纯函数：组件持快照 → mutate → 同步落盘，避免导航时序问题。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { POEMS, findCollection, findPoem } from "./content";
import type { Stars } from "./types";

export const EXPEDITION_STORAGE_KEY = "tangxiaoshi.expedition.v1";
export const EXPEDITION_NODES = 3;
export const EXPEDITION_START_FIRE = 3;
export const EXPEDITION_MAX_FIRE = 4;
/** 风雨险滩：每题正确的额外加分（高收益）。 */
export const RISK_SCORE_BONUS = 50;
/** 磨墨：节点首答正确的额外加分。 */
export const INKSTONE_BONUS = 100;

export type ExpeditionPath = "safe" | "risk" | "mystery";
export type RelicId = "none" | "renew" | "inkstone" | "listen";
export type NodeStatus = "pending" | "done" | "failed";
/** 远征结局：三页清声 / 带伤归卷 / 墨潮未退。 */
export type ExpeditionEnding = "clear" | "scarred" | "failed";

export type ExpeditionNode = {
  path: ExpeditionPath;
  poemId: string;
  status: NodeStatus;
  /** 本节点生效的修页奖励（进入节点时从 state.relic 转正）。 */
  relic: RelicId;
  mistakes: number;
  score: number;
};

export type ExpeditionState = {
  /** 当前待攻略节点（0 起）。 */
  nodeIndex: number;
  /** 下一节点开局诗火（1..4）。 */
  fire: number;
  /** 已获得、待下一节点生效的修页奖励。 */
  relic: RelicId;
  /** 路线候选随机种子（每完成一节点刷新）。 */
  offerSeed: number;
  /** 恒定 3 槽位；null = 未走到的节点。 */
  nodes: (ExpeditionNode | null)[];
  finished: ExpeditionEnding | null;
  updatedAt: number;
};

/** 三条墨路的展示信息与真实收益。 */
export const PATH_DEFS: Record<ExpeditionPath, { name: string; tag: string; blurb: string; reward: string }> = {
  safe: {
    name: "青灯小径",
    tag: "稳健",
    blurb: "灯火相伴，步步为营。",
    reward: "通关回复 1 盏诗火",
  },
  risk: {
    name: "风雨险滩",
    tag: "险",
    blurb: "风急浪高，连对才走得快。",
    reward: `每题正确额外 +${RISK_SCORE_BONUS} 分`,
  },
  mystery: {
    name: "无名残卷",
    tag: "随机",
    blurb: "残页无序，落笔皆天意。",
    reward: "完成后三选修页奖励",
  },
};

export const EXPEDITION_PATHS: readonly ExpeditionPath[] = ["safe", "risk", "mystery"];

export function isExpeditionPath(value: unknown): value is ExpeditionPath {
  return typeof value === "string" && (EXPEDITION_PATHS as readonly string[]).includes(value);
}

/** 修页奖励（下一节点生效）：续灯 / 磨墨 / 听句。 */
export const RELIC_DEFS: Record<Exclude<RelicId, "none">, { name: string; desc: string }> = {
  renew: { name: "续灯", desc: "诗火 +1" },
  inkstone: { name: "磨墨", desc: "首答正确 +100 分" },
  listen: { name: "听句", desc: "开局先听一行诗文" },
};

export function isRelicId(value: unknown): value is Exclude<RelicId, "none"> {
  return value === "renew" || value === "inkstone" || value === "listen";
}

/** 节点胜利后可选的修页奖励：无名残卷给三选，其余二选。 */
export function relicChoices(path: ExpeditionPath): Exclude<RelicId, "none">[] {
  return path === "mystery" ? ["renew", "inkstone", "listen"] : ["renew", "inkstone"];
}

export function endingTitle(ending: ExpeditionEnding): string {
  return ending === "clear" ? "诗声复明" : ending === "scarred" ? "带伤归卷" : "墨潮未退";
}

/** 节点评价：零错误「清声」，通关有错「留痕」。 */
export function nodeQuality(mistakes: number): "清声" | "留痕" {
  return mistakes <= 0 ? "清声" : "留痕";
}

function clampFire(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : EXPEDITION_START_FIRE;
  return Math.min(Math.max(n, 1), EXPEDITION_MAX_FIRE);
}

function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export function newExpedition(): ExpeditionState {
  return {
    nodeIndex: 0,
    fire: EXPEDITION_START_FIRE,
    relic: "none",
    offerSeed: newSeed(),
    nodes: [null, null, null],
    finished: null,
    updatedAt: Date.now(),
  };
}

function normalizeNode(raw: unknown): ExpeditionNode | null {
  if (typeof raw !== "object" || raw === null) return null;
  const node = raw as Record<string, unknown>;
  if (!isExpeditionPath(node.path) || typeof node.poemId !== "string" || !node.poemId) return null;
  const status = node.status === "done" || node.status === "failed" || node.status === "pending" ? node.status : "pending";
  const mistakes = typeof node.mistakes === "number" && Number.isFinite(node.mistakes) ? Math.max(0, Math.trunc(node.mistakes)) : 0;
  const score = typeof node.score === "number" && Number.isFinite(node.score) ? Math.max(0, Math.trunc(node.score)) : 0;
  return {
    path: node.path,
    poemId: node.poemId,
    status,
    relic: isRelicId(node.relic) ? node.relic : "none",
    mistakes,
    score,
  };
}

/** 任意来源整理成合法快照；结构不合法返回 null（调用方按无远征处理）。 */
export function normalizeExpedition(raw: unknown): ExpeditionState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const input = raw as Record<string, unknown>;
  const rawNodes = Array.isArray(input.nodes) ? input.nodes : [];
  const nodes: (ExpeditionNode | null)[] = [
    normalizeNode(rawNodes[0]),
    normalizeNode(rawNodes[1]),
    normalizeNode(rawNodes[2]),
  ];
  const nodeIndex = Math.min(
    Math.max(typeof input.nodeIndex === "number" && Number.isFinite(input.nodeIndex) ? Math.trunc(input.nodeIndex) : 0, 0),
    EXPEDITION_NODES - 1,
  );
  const finished: ExpeditionEnding | null =
    input.finished === "clear" || input.finished === "scarred" || input.finished === "failed" ? input.finished : null;
  return {
    nodeIndex,
    fire: clampFire(input.fire),
    relic: isRelicId(input.relic) ? input.relic : "none",
    offerSeed: typeof input.offerSeed === "number" && Number.isFinite(input.offerSeed) ? input.offerSeed >>> 0 : newSeed(),
    nodes,
    finished,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : Date.now(),
  };
}

export function loadExpedition(): ExpeditionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EXPEDITION_STORAGE_KEY);
    if (!raw) return null;
    return normalizeExpedition(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function persistExpedition(state: ExpeditionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXPEDITION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 隐私模式/配额失败时静默：远征退化为单局状态，不影响存档。
  }
}

export function clearExpedition(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(EXPEDITION_STORAGE_KEY);
  } catch {
    // 同上，忽略。
  }
}

/** 点击路线卡时调用：锁定本节点的诗卡，并把待生效奖励转正到本节点。
 *  若本节点已有待攻略记录（如进诗题页又返回），已携带的奖励不丢失。 */
export function beginNode(state: ExpeditionState, path: ExpeditionPath, poemId: string): ExpeditionState {
  const nodes = state.nodes.slice();
  const existing = nodes[state.nodeIndex];
  const carriedRelic: RelicId =
    state.relic !== "none" ? state.relic : existing && existing.status === "pending" ? existing.relic : "none";
  nodes[state.nodeIndex] = { path, poemId, status: "pending", relic: carriedRelic, mistakes: 0, score: 0 };
  return { ...state, nodes, relic: "none", fire: clampFire(state.fire), updatedAt: Date.now() };
}

/** 结算页选择修页奖励：续灯立即回火，其余在下一节点开局转正。 */
export function grantRelic(state: ExpeditionState, relic: Exclude<RelicId, "none">): ExpeditionState {
  return {
    ...state,
    relic,
    fire: relic === "renew" ? Math.min(EXPEDITION_MAX_FIRE, state.fire + 1) : state.fire,
    updatedAt: Date.now(),
  };
}

export function totalMistakes(state: ExpeditionState): number {
  return state.nodes.reduce((sum, node) => sum + (node?.mistakes ?? 0), 0);
}

/**
 * 一节点结束：
 * - 胜利 → 记录本页表现；诗火结转（青灯小径额外 +1），推进到下一节点或定结局；
 * - 失败 → 不清场：诗火重燃回初始值，本节点回到待攻略，玩家可重走此页或另选墨路
 *   （「墨潮未退」的因果在答题结算面板里呈现）。
 */
export function completeNode(
  state: ExpeditionState,
  outcome: { won: boolean; mistakes: number; score: number; fireLeft: number },
): ExpeditionState {
  const current = state.nodes[state.nodeIndex];
  if (!current) return state;
  const mistakes = Math.max(0, Math.trunc(outcome.mistakes));
  const score = Math.max(0, Math.trunc(outcome.score));
  const nodes = state.nodes.slice();
  if (!outcome.won) {
    nodes[state.nodeIndex] = { ...current, status: "pending", mistakes, score };
    return { ...state, nodes, fire: EXPEDITION_START_FIRE, finished: null, updatedAt: Date.now() };
  }
  nodes[state.nodeIndex] = { ...current, status: "done", mistakes, score };
  const safeBonus = current.path === "safe" ? 1 : 0;
  const fire = Math.min(EXPEDITION_MAX_FIRE, Math.max(1, Math.trunc(outcome.fireLeft) + safeBonus));
  if (state.nodeIndex + 1 < EXPEDITION_NODES) {
    return {
      ...state,
      nodes,
      fire,
      nodeIndex: state.nodeIndex + 1,
      offerSeed: newSeed(),
      relic: "none",
      updatedAt: Date.now(),
    };
  }
  const ending: ExpeditionEnding = totalMistakes({ ...state, nodes }) === 0 ? "clear" : "scarred";
  return { ...state, nodes, fire, finished: ending, relic: "none", updatedAt: Date.now() };
}

/** 失败后重走本节点：清失败标记、重燃诗火、本页表现清零。 */
export function retryNode(state: ExpeditionState): ExpeditionState {
  const nodes = state.nodes.slice();
  const current = nodes[state.nodeIndex];
  if (current) nodes[state.nodeIndex] = { ...current, status: "pending", mistakes: 0, score: 0 };
  return { ...state, nodes, fire: EXPEDITION_START_FIRE, finished: null, updatedAt: Date.now() };
}

/** 结算摘要节点：给结局面板按页复盘（标题缺失时回退「无名诗页」）。 */
export type ExpeditionSummaryNode = {
  path: ExpeditionPath;
  title: string;
  status: NodeStatus;
  mistakes: number;
  score: number;
};

export function summarizeNodes(
  state: ExpeditionState,
  outcome: { won: boolean; mistakes: number; score: number },
): ExpeditionSummaryNode[] {
  return state.nodes.map((node, index) => {
    if (node && index === state.nodeIndex) {
      const title = findPoem(node.poemId)?.title ?? "无名诗页";
      return {
        path: node.path,
        title,
        status: outcome.won ? ("done" as const) : ("failed" as const),
        mistakes: outcome.mistakes,
        score: outcome.score,
      };
    }
    return {
      path: node?.path ?? "safe",
      title: node ? (findPoem(node.poemId)?.title ?? "无名诗页") : "未至之页",
      status: node?.status ?? "pending",
      mistakes: node?.mistakes ?? 0,
      score: node?.score ?? 0,
    };
  });
}

/** 结算页回传给答题组件的远征快照（由 /play 路由写入，驱动结局/奖励面板）。 */
export type ExpeditionResultView = {
  won: boolean;
  /** null = 中盘节点胜利，进入修页奖励二/三选；否则为整局结局。 */
  ending: ExpeditionEnding | null;
  mistakes: number;
  totalMistakes: number;
  score: number;
  maxCombo: number;
  stars: Stars;
  fireLeft: number;
  nodes: ExpeditionSummaryNode[];
};

/** 答题页拿到的远征上下文；/play 路由负责所有持久化回调。 */
export type ExpeditionPlay = {
  nodeIndex: number;
  path: ExpeditionPath;
  /** 开局诗火 = 本轮机会灯笼数。 */
  fire: number;
  /** 本节点生效的修页奖励。 */
  relic: RelicId;
  result: ExpeditionResultView | null;
  onWin: (outcome: { stars: Stars; score: number; maxCombo: number; mistakes: number; fireLeft: number }) => void;
  onLose: (outcome: { mistakes: number; score: number }) => void;
  onRetry: () => void;
  onChooseRelic: (relic: Exclude<RelicId, "none">) => void;
  onToTour: () => void;
  onRelaunch: () => void;
  onHome: () => void;
};

// ---------------------------------------------------------------------------
// 路线候选：三条墨路各从真实题库锁定一张诗卡（确定性，刷新/回看不换卡）。
// ---------------------------------------------------------------------------

export type RouteOffer = {
  path: ExpeditionPath;
  poemId: string;
  title: string;
  authorName: string;
  collectionTitle: string;
};

/** mulberry32：小而够用的确定性随机（只用于选卡展示）。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function routeOffers(seed: number, clearedIds: readonly string[]): RouteOffer[] {
  const cleared = new Set(clearedIds);
  const allIds = POEMS.map((poem) => poem.id);
  const pools: Record<ExpeditionPath, string[]> = {
    safe: POEMS.filter((poem) => !cleared.has(poem.id)).map((poem) => poem.id),
    risk: POEMS.filter((poem) => cleared.has(poem.id)).map((poem) => poem.id),
    mystery: allIds,
  };
  const used = new Set<string>();
  return EXPEDITION_PATHS.map((path, index) => {
    let pool = pools[path].filter((id) => !used.has(id));
    if (pool.length === 0) pool = allIds.filter((id) => !used.has(id));
    if (pool.length === 0) pool = allIds;
    const rng = mulberry32((seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0);
    const poemId = pool[Math.floor(rng() * pool.length) % pool.length] ?? allIds[0] ?? "";
    used.add(poemId);
    const poem = POEMS.find((item) => item.id === poemId);
    return {
      path,
      poemId,
      title: poem?.title ?? "无名诗页",
      authorName: poem?.authorName ?? "",
      collectionTitle: poem ? (findCollection(poem.collectionId)?.title ?? "") : "",
    };
  });
}

// ---------------------------------------------------------------------------
// useExpedition：挂载后读盘；mutate 同步计算 + 落盘 + 更新视图。
// ---------------------------------------------------------------------------

export function useExpedition() {
  const ref = useRef<ExpeditionState | null>(null);
  const [state, setState] = useState<ExpeditionState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadExpedition();
    ref.current = loaded;
    setState(loaded);
    setReady(true);
  }, []);

  const mutate = useCallback((fn: (current: ExpeditionState) => ExpeditionState) => {
    const next = fn(ref.current ?? newExpedition());
    ref.current = next;
    persistExpedition(next);
    setState(next);
    return next;
  }, []);

  return { state, ready, mutate };
}
