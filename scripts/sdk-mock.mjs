/**
 * Smoke test 用的 @avg-studio/sdk 替身。
 * 只实现扩展源码真正 import 的运行时符号。
 */

export function extension(def) {
  return function decorate(value) {
    if (typeof value === "function") {
      value.meta = def;
    }
    return value;
  };
}

export class Extension {}

export function method(def) {
  return def;
}

export function settings(build) {
  return { build };
}

export function defineSave(schema) {
  return schema;
}

export function useExtensionContext() {
  const ctx = globalThis.__achievementSmokeContext;
  if (!ctx) {
    throw new Error("smoke test 尚未注入 ExtensionContext");
  }
  return ctx;
}

export const INTERNAL_SYSTEM_SLOT = {
  Title: "internal.system.title",
  Toolbar: "internal.system.toolbar",
  Save: "internal.system.save",
  Load: "internal.system.load",
  Settings: "internal.system.settings",
  History: "internal.system.history",
  Gallery: "internal.system.gallery",
  Input: "internal.system.input",
  Choice: "internal.system.choice",
};
