/**
 * 成就存档读写与解锁流程。
 *
 * 存档字段（slot，跟随当前存档 / 游戏内进度）：
 *   - `<扩展id>.unlocked`   已解锁记录 UnlockedRecord[]
 *   - `<扩展id>.registered` 运行时注册的成就定义（扫描失败时的兜底）
 *
 * 列表优先按数组写入；若宿主变量 API 只接受基础类型，会自动回退成
 * JSON 字符串（读取端两种形态都兼容）。
 */

import type { ExtensionContext, VariableValue } from "@avg-studio/sdk";
import manifest from "../../extension.json";
import { normalizeDefinitions, normalizeUnlocked } from "./definitions";
import { getNumberSetting } from "./settings-access";
import { enqueueAchievementToast } from "./toast";
import type { AchievementDef, UnlockedRecord } from "./types";

export const EXTENSION_ID = manifest.id;
export const MODULE_ID = "achievement-system";
export const OVERLAY_ID = "achievement-overlay";

export const UNLOCKED_KEY = `${EXTENSION_ID}.unlocked`;
export const REGISTERED_KEY = `${EXTENSION_ID}.registered`;

function writeList(
  ctx: ExtensionContext,
  key: string,
  list: readonly unknown[],
): void {
  try {
    ctx.variables.set(key, list as unknown as VariableValue);
    return;
  } catch (error) {
    console.warn(`[成就系统] 变量 ${key} 不接受数组，改用 JSON 字符串存储。`, error);
  }
  try {
    ctx.variables.set(key, JSON.stringify(list));
  } catch (error) {
    console.error(`[成就系统] 变量 ${key} 写入失败。`, error);
  }
}

export function readUnlocked(ctx: ExtensionContext): UnlockedRecord[] {
  return normalizeUnlocked(ctx.variables.get(UNLOCKED_KEY));
}

export function writeUnlocked(
  ctx: ExtensionContext,
  records: readonly UnlockedRecord[],
): void {
  writeList(ctx, UNLOCKED_KEY, records);
}

export function readRegistered(ctx: ExtensionContext): AchievementDef[] {
  return normalizeDefinitions(ctx.variables.get(REGISTERED_KEY));
}

export function writeRegistered(
  ctx: ExtensionContext,
  defs: readonly AchievementDef[],
): void {
  writeList(ctx, REGISTERED_KEY, defs);
}

export function isUnlocked(ctx: ExtensionContext, key: string): boolean {
  return readEffectiveUnlocked(ctx).some((record) => record.key === key);
}

/** 当前游戏内时间轴位置（历史记录条数）；读不到时返回 null 表示不裁剪。 */
export function currentHistoryLength(ctx: ExtensionContext): number | null {
  try {
    return ctx.history.entries().length;
  } catch {
    return null;
  }
}

/** 按当前时间轴位置过滤一组解锁记录（不读写存档）。 */
export function applyHistoryWindow(
  ctx: ExtensionContext,
  records: readonly UnlockedRecord[],
): UnlockedRecord[] {
  const length = currentHistoryLength(ctx);
  if (length === null) return [...records];
  return records.filter((record) => (record.h ?? 0) <= length);
}

/**
 * 按游戏内时间轴过滤解锁记录：
 * 历史条数回退后（时间轴拖到前面 / 读早期档），解锁位置在其后的成就视为未解锁。
 * 不修改存档数据，只影响当前显示与判断；再次播放到触发卡片时会重写记录位置。
 */
export function readEffectiveUnlocked(
  ctx: ExtensionContext,
): UnlockedRecord[] {
  return applyHistoryWindow(ctx, readUnlocked(ctx));
}

/** 注册（或更新）一条仅运行时存在的成就定义。 */
export function upsertRegistered(
  ctx: ExtensionContext,
  def: AchievementDef,
): void {
  const current = readRegistered(ctx);
  const index = current.findIndex((item) => item.key === def.key);
  if (index >= 0) {
    const next = current.slice();
    next[index] = def;
    writeRegistered(ctx, next);
    return;
  }
  writeRegistered(ctx, [...current, def]);
}

/**
 * 确保常驻成就浮层处于打开且位于最上层。
 * 引擎重开或标题画面后打开的界面可能盖住浮层，这里重新 show 一次抬高它。
 */
function raiseOverlay(ctx: ExtensionContext): void {
  try {
    void ctx.ui.show(OVERLAY_ID, undefined, {
      size: "(100%, 100%)",
      position: "(0, 0)",
      pointerEventsPassthrough: true,
    });
  } catch (error) {
    console.warn("[成就系统] 成就浮层不可用。", error);
  }
}

/**
 * 解锁一条成就：写入记录、弹出横幅、播放音效。
 * 已解锁时直接返回 false，不会重复弹窗。
 *
 * 记录使用 slot 持久化并附带时间轴位置（历史条数）：
 * 新游戏 / 读早期档 / 时间轴回退都会回到对应位置的成就状态；
 * 回退后再次播放到触发卡片会按新位置重写记录。
 */
export function unlockAchievement(
  ctx: ExtensionContext,
  def: AchievementDef,
): boolean {
  const raw = readUnlocked(ctx);
  const length = currentHistoryLength(ctx) ?? 0;
  const index = raw.findIndex((record) => record.key === def.key);

  if (index >= 0 && (raw[index]!.h ?? 0) <= length) {
    return false;
  }

  const record: UnlockedRecord = { key: def.key, at: Date.now(), h: length };
  const next =
    index >= 0
      ? raw.map((item, itemIndex) => (itemIndex === index ? record : item))
      : [...raw, record];
  writeUnlocked(ctx, next);

  const fallbackDuration = getNumberSetting(ctx, "defaultDuration", 3000);
  const duration = def.duration > 0 ? def.duration : fallbackDuration;
  raiseOverlay(ctx);
  enqueueAchievementToast(ctx, def, duration);
  console.log(`[成就系统] 解锁成就：${def.key}（${def.name}）`);
  return true;
}
