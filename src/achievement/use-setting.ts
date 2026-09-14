/**
 * React Hook：读取扩展设置（兼容带模块前缀 / 不带前缀两种 scope）。
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import { SETTINGS_SCOPE_ID } from "./settings-access";

export function useAchievementSetting<T>(
  ctx: ExtensionContext,
  key: string,
): T | undefined {
  const [direct] = ctx.settings.useValue<T>(key);
  const [scoped] = ctx.settings.useValue<T>(`${SETTINGS_SCOPE_ID}.${key}`);
  return direct !== undefined ? direct : scoped;
}
