/**
 * 读取扩展项目设置。
 *
 * 设置的存储 key 会带上 UI/模块前缀（如 `achievement-system.achievements`）。
 * 在 UI 上下文里 ctx.settings 已按模块 scope，`get("achievements")` 即可；
 * 但在 onRegister / 方法等上下文里 scope 可能只到扩展级，因此这里做
 * 「短 key → 带前缀 key → cross 访问」三级回退，两种上下文都能取到值。
 */

import type { ExtensionContext } from "@avg-studio/sdk";

export const SETTINGS_SCOPE_ID = "achievement-system";

export function getSetting<T>(ctx: ExtensionContext, key: string): T | undefined {
  try {
    const direct = ctx.settings.get<T>(key);
    if (direct !== undefined) return direct;
  } catch {
    // 宿主未提供 settings 时静默降级到默认值。
  }

  try {
    const scoped = ctx.settings.get<T>(`${SETTINGS_SCOPE_ID}.${key}`);
    if (scoped !== undefined) return scoped;
  } catch {
    // 同上。
  }

  try {
    const cross = ctx.settings.cross.get<T>(SETTINGS_SCOPE_ID, key);
    if (cross !== undefined) return cross;
  } catch {
    // 旧宿主可能没有 cross 访问。
  }

  return undefined;
}

export function getNumberSetting(
  ctx: ExtensionContext,
  key: string,
  fallback: number,
): number {
  const value = getSetting<number>(ctx, key);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getStringSetting(
  ctx: ExtensionContext,
  key: string,
  fallback: string,
): string {
  const value = getSetting<string>(ctx, key);
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

/** 命令式订阅一个设置（两种 key 都订阅，回调可能触发两次，调用方需幂等）。 */
export function subscribeSetting(
  ctx: ExtensionContext,
  key: string,
  callback: () => void,
): () => void {
  const disposers: Array<() => void> = [];
  try {
    disposers.push(ctx.settings.subscribe(key, callback));
  } catch {
    // 忽略。
  }
  try {
    disposers.push(ctx.settings.subscribe(`${SETTINGS_SCOPE_ID}.${key}`, callback));
  } catch {
    // 忽略。
  }
  return () => {
    for (const dispose of disposers) {
      try {
        dispose();
      } catch {
        // 忽略。
      }
    }
  };
}
