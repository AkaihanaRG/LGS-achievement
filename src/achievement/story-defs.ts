/**
 * 从剧本中收集「触发成就 / 注册全局成就」卡片定义的成就。
 *
 * 引擎在调用扩展方法前会把卡片参数解析成运行时值，但成就页面需要在
 * 卡片执行之前就知道全部成就（包括未解锁、隐藏的）。这里在启动时用
 * ctx.story.getAllChapters() 扫描剧本里的 callExtensionFunction Block，
 * 解析 paramsJson（形如 { key: { kind:"lit", value:"成就ID" } }）得到定义。
 *
 * 这样成就页面的条目数始终与剧本里的成就卡片一致：改 ID / 删卡片后，
 * 下次启动重新扫描，旧条目自动消失。
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import manifest from "../../extension.json";
import { normalizeDefinition } from "./definitions";
import type { AchievementDef } from "./types";

const METHOD_MODES: Record<string, "card" | "global"> = {
  "trigger-achievement": "card",
  "register-achievement": "global",
};

let defs: AchievementDef[] = [];
let scanned = false;
const listeners = new Set<() => void>();

export function subscribeStoryDefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStoryDefs(): AchievementDef[] {
  return defs;
}

export function areStoryDefsScanned(): boolean {
  return scanned;
}

function emit(): void {
  for (const listener of [...listeners]) listener();
}

/** 把卡片参数描述对象还原成普通值（只取字面量，变量引用取默认值）。 */
function parseParams(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string" || raw.trim().length === 0) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(parsed)) {
      if (
        descriptor &&
        typeof descriptor === "object" &&
        "value" in (descriptor as Record<string, unknown>)
      ) {
        out[key] = (descriptor as { value: unknown }).value;
      } else {
        out[key] = descriptor;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function collectFromBlocks(
  blocks: unknown,
  found: Map<string, AchievementDef>,
): void {
  if (!Array.isArray(blocks)) return;
  for (const raw of blocks) {
    if (!raw || typeof raw !== "object") continue;
    const block = raw as {
      type?: string;
      props?: Record<string, unknown>;
      children?: unknown;
    };

    if (block.type === "callExtensionFunction" && block.props) {
      const target = String(block.props.target ?? "");
      const slash = target.lastIndexOf("/");
      const extensionId = slash >= 0 ? target.slice(0, slash) : "";
      const methodId = slash >= 0 ? target.slice(slash + 1) : "";
      const mode = METHOD_MODES[methodId];
      if (
        extensionId === manifest.id &&
        mode &&
        block.props.disabled !== true
      ) {
        const def = normalizeDefinition({
          ...parseParams(block.props.paramsJson),
          mode,
        });
        if (def && !found.has(def.key)) found.set(def.key, def);
      }
    }

    if (block.children) collectFromBlocks(block.children, found);
  }
}

/** 扫描剧本，刷新卡片成就定义缓存；完成后通知订阅者。 */
export async function scanStoryAchievements(
  ctx: ExtensionContext,
): Promise<AchievementDef[]> {
  const found = new Map<string, AchievementDef>();
  try {
    const chapters = await ctx.story.getAllChapters();
    for (const chapter of chapters) {
      for (const fragment of chapter.fragments ?? []) {
        collectFromBlocks(fragment.blocks, found);
      }
    }
  } catch (error) {
    console.warn("[成就系统] 扫描剧本收集成就卡片失败。", error);
  }
  defs = [...found.values()];
  scanned = true;
  emit();
  return defs;
}
