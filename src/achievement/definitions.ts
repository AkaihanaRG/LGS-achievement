/**
 * 成就定义的工具函数：归一化、条件拼装、合并、显示排序与隐藏遮罩。
 */

import {
  ACHIEVEMENT_OPERATORS,
  type AchievementDef,
  type AchievementMode,
  type AchievementOperator,
  type UnlockedRecord,
} from "./types";

/** 把 Studio 设置行 / 卡片参数 / 存档记录统一归一化成 AchievementDef。 */
export function normalizeDefinition(raw: unknown): AchievementDef | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const key = String(source.key ?? "").trim();
  if (!key) return null;

  const mode: AchievementMode = source.mode === "global" ? "global" : "card";
  const operator = ACHIEVEMENT_OPERATORS.includes(
    source.operator as AchievementOperator,
  )
    ? (source.operator as AchievementOperator)
    : ">=";
  const durationValue = Number(source.duration);

  return {
    key,
    name: String(source.name ?? "").trim() || key,
    description: String(source.description ?? ""),
    icon: String(source.icon ?? "").trim(),
    hidden: source.hidden === true || source.hidden === "true",
    mode,
    variable: String(source.variable ?? "").trim(),
    operator,
    value: String(source.value ?? ""),
    condition: String(source.condition ?? ""),
    duration: Number.isFinite(durationValue) ? Math.max(0, durationValue) : 0,
    sound: String(source.sound ?? "").trim(),
  };
}

/** 兼容两种存储形态：数组本身，或 JSON 字符串（宿主变量仅支持基础类型时使用）。 */
function toList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** 批量归一化，过滤掉无效项。 */
export function normalizeDefinitions(raw: unknown): AchievementDef[] {
  const list = toList(raw);
  const result: AchievementDef[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const def = normalizeDefinition(item);
    if (!def || seen.has(def.key)) continue;
    seen.add(def.key);
    result.push(def);
  }
  return result;
}

/** 归一化解锁记录（只保留结构正确的项）。 */
export function normalizeUnlocked(raw: unknown): UnlockedRecord[] {
  const list = toList(raw);
  const result: UnlockedRecord[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const source = item as Record<string, unknown>;
    const key = String(source.key ?? "").trim();
    if (!key || seen.has(key)) continue;
    const at = Number(source.at);
    const h = Number(source.h);
    seen.add(key);
    result.push({
      key,
      at: Number.isFinite(at) ? at : 0,
      h: Number.isFinite(h) ? Math.max(0, h) : 0,
    });
  }
  return result;
}

/** 把比较值转成表达式字面量。 */
function literalValue(raw: string): string {
  const value = (raw ?? "").trim();
  if (value === "") return "0";
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  if (/^(true|false)$/i.test(value)) return value.toLowerCase();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * 得到一条成就最终生效的条件表达式。
 * 高级表达式优先；否则用「变量 + 比较方式 + 比较值」拼装；两者都没有时返回空串。
 */
export function effectiveCondition(def: AchievementDef): string {
  const advanced = (def.condition ?? "").trim();
  if (advanced) return advanced;
  const variable = (def.variable ?? "").trim();
  if (!variable) return "";
  return `var(${JSON.stringify(variable)}) ${def.operator} ${literalValue(def.value)}`;
}

/** 按顺序合并多组定义，同一 key 以先出现的为准。 */
export function mergeDefinitions(
  ...lists: ReadonlyArray<readonly AchievementDef[]>
): AchievementDef[] {
  const map = new Map<string, AchievementDef>();
  for (const list of lists) {
    for (const def of list) {
      if (!map.has(def.key)) map.set(def.key, def);
    }
  }
  return [...map.values()];
}

/**
 * 合并出「全局条件成就」列表：
 *   - 显示信息优先取成就列表（名称/介绍/图标/隐藏）；
 *   - 触发配置（触发方式/条件/时长/音效）以卡片运行时注册为准，
 *     这样同一 key 在卡片里重新注册条件后能立即生效。
 */
export function collectGlobalDefinitions(
  library: readonly AchievementDef[],
  registered: readonly AchievementDef[],
): AchievementDef[] {
  const map = new Map<string, AchievementDef>();
  for (const def of library) {
    map.set(def.key, def);
  }
  for (const def of registered) {
    const existing = map.get(def.key);
    if (!existing) {
      map.set(def.key, def);
      continue;
    }
    map.set(def.key, {
      ...def,
      name: existing.name || def.name,
      description: existing.description || def.description,
      icon: existing.icon || def.icon,
      hidden: existing.hidden || def.hidden,
      duration: def.duration > 0 ? def.duration : existing.duration,
      sound: def.sound || existing.sound,
    });
  }
  return [...map.values()].filter((def) => def.mode === "global");
}

/**
 * 成就页面显示用的条目集合：
 *   - 剧本扫描成功：以剧本成就卡片为准（运行时注册的定义补充其后），
 *     页面条目数与卡片数量一致，改 ID / 删卡片后旧条目自动消失；
 *   - 扫描失败时退回运行时注册表。
 */
export function collectDisplayDefinitions(
  story: readonly AchievementDef[],
  registered: readonly AchievementDef[],
  storyScanned: boolean,
): AchievementDef[] {
  if (!storyScanned) {
    return mergeDefinitions(registered);
  }
  return mergeDefinitions(story, registered);
}

/**
 * 成就页面的排序：
 *   1. 普通成就组在前，隐藏成就组永远在列表最下方；
 *   2. 组内已解锁的排在未解锁的上面（已解锁按时间倒序，未解锁按定义顺序）。
 */
export function sortForDisplay(
  defs: readonly AchievementDef[],
  unlockedAt: ReadonlyMap<string, number>,
): AchievementDef[] {
  return defs
    .map((def, index) => ({ def, index, at: unlockedAt.get(def.key) }))
    .sort((a, b) => {
      const groupA = a.def.hidden ? 1 : 0;
      const groupB = b.def.hidden ? 1 : 0;
      if (groupA !== groupB) return groupA - groupB;

      const unlockedA = a.at !== undefined ? 0 : 1;
      const unlockedB = b.at !== undefined ? 0 : 1;
      if (unlockedA !== unlockedB) return unlockedA - unlockedB;

      if (a.at !== undefined && b.at !== undefined) {
        return b.at - a.at;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.def);
}

/** 隐藏成就的描述遮罩：每个非空白字符替换成问号，保留空格与换行。 */
export function maskDescription(text: string): string {
  return (text ?? "").replace(/[^\s]/g, "？");
}
