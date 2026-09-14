/**
 * 成就解锁横幅的数据层（不含 DOM）。
 *
 * 横幅由成就浮层（achievement-overlay 程序 UI）渲染在游戏 UI 层里，
 * 这里只负责：队列、当前条目、图标地址解析与音效播放。
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import { getNumberSetting, getStringSetting } from "./settings-access";
import type { AchievementDef } from "./types";

export interface ToastItem {
  id: number;
  key: string;
  name: string;
  iconUrl: string;
  accent: string;
  /** 停留时长（ms）。 */
  duration: number;
}

let nextId = 1;
let current: ToastItem | null = null;
const queue: ToastItem[] = [];
const listeners = new Set<() => void>();

let suppressed = false;
const suppressListeners = new Set<() => void>();

function emit(): void {
  for (const listener of [...listeners]) listener();
}

export function subscribeToast(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToast(): ToastItem | null {
  return current;
}

/** 当前横幅播放结束后调用，自动播放下一条。 */
export function finishToast(id: number): void {
  if (!current || current.id !== id) return;
  current = null;
  emit();
  pump();
}

function pump(): void {
  if (current || queue.length === 0) return;
  current = queue.shift()!;
  emit();
}

export function enqueueAchievementToast(
  ctx: ExtensionContext,
  def: AchievementDef,
  duration: number,
): void {
  queue.push({
    id: nextId++,
    key: def.key,
    name: def.name || def.key,
    iconUrl: safeResolveIcon(ctx, def.icon),
    accent: getStringSetting(ctx, "accentColor", "#ffd76a"),
    duration: Math.max(300, duration),
  });
  playAchievementSound(ctx, def);
  pump();
}

/* ------------------------------------------------------------------ */
/* 悬浮入口按钮的显隐（成就页面打开时隐藏）                            */
/* ------------------------------------------------------------------ */

function emitSuppressed(): void {
  for (const listener of [...suppressListeners]) listener();
}

export function subscribeSuppressed(listener: () => void): () => void {
  suppressListeners.add(listener);
  return () => {
    suppressListeners.delete(listener);
  };
}

export function getSuppressed(): boolean {
  return suppressed;
}

export function setOverlayButtonSuppressed(value: boolean): void {
  if (suppressed === value) return;
  suppressed = value;
  emitSuppressed();
}

/* ------------------------------------------------------------------ */
/* 图标与音效                                                          */
/* ------------------------------------------------------------------ */

function safeResolveIcon(ctx: ExtensionContext, uri: string): string {
  if (!uri) return "";
  try {
    return ctx.asset.resolve(uri).url ?? "";
  } catch {
    return "";
  }
}

function playAchievementSound(ctx: ExtensionContext, def: AchievementDef): void {
  const custom = def.sound.trim() || getStringSetting(ctx, "defaultSound", "");
  if (custom) {
    try {
      void ctx.sound.play(custom, { id: "achievement-unlock" });
      return;
    } catch (error) {
      console.warn("[成就系统] 自定义成就音效播放失败，回退内置音效。", error);
    }
  }

  try {
    const url = ctx.extensionResource.url("assets/achievement.mp3");
    const audio = new Audio(url);
    const volume = getNumberSetting(ctx, "soundVolume", 100);
    const seVolume = Number(ctx.config.get("seVolume") ?? 100);
    const ratio = Math.min(1, Math.max(0, (volume / 100) * (seVolume / 100)));
    audio.volume = ratio;
    void audio.play().catch(() => {
      // 浏览器自动播放限制等场景静默失败，不影响成就解锁本身。
    });
  } catch (error) {
    console.warn("[成就系统] 内置成就音效播放失败。", error);
  }
}
