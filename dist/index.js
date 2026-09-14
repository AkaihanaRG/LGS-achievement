var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __decoratorStart = (base) => [, , , __create((base == null ? void 0 : base[__knownSymbol("metadata")]) ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : { get [name]() {
    return __privateGet(this, extra);
  }, set [name](x) {
    return __privateSet(this, extra, x);
  } }, name));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => name in x };
      if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name];
      if (k > 2) access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p ? k ^ 4 ? extra : desc : target;
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method2) => (__accessCheck(obj, member, "access private method"), method2);
var _AchievementSystemExtension_decorators, _init, _a, _AchievementOverlayExtension_decorators, _init2, _b;
import { useExtensionContext, INTERNAL_SYSTEM_SLOT, Extension, settings, defineSave, method, extension } from "@avg-studio/sdk";
import { jsx, jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useMemo, useSyncExternalStore } from "react";
const ACHIEVEMENT_OPERATORS = [">=", ">", "<=", "<", "==", "!="];
const OPERATOR_OPTIONS = [
  { label: "大于等于 (>=)", value: ">=" },
  { label: "大于 (>)", value: ">" },
  { label: "小于等于 (<=)", value: "<=" },
  { label: "小于 (<)", value: "<" },
  { label: "等于 (==)", value: "==" },
  { label: "不等于 (!=)", value: "!=" }
];
function normalizeDefinition(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = raw;
  const key = String(source.key ?? "").trim();
  if (!key) return null;
  const mode = source.mode === "global" ? "global" : "card";
  const operator = ACHIEVEMENT_OPERATORS.includes(
    source.operator
  ) ? source.operator : ">=";
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
    sound: String(source.sound ?? "").trim()
  };
}
function toList(raw) {
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
function normalizeDefinitions(raw) {
  const list = toList(raw);
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of list) {
    const def = normalizeDefinition(item);
    if (!def || seen.has(def.key)) continue;
    seen.add(def.key);
    result.push(def);
  }
  return result;
}
function normalizeUnlocked(raw) {
  const list = toList(raw);
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const source = item;
    const key = String(source.key ?? "").trim();
    if (!key || seen.has(key)) continue;
    const at = Number(source.at);
    const h = Number(source.h);
    seen.add(key);
    result.push({
      key,
      at: Number.isFinite(at) ? at : 0,
      h: Number.isFinite(h) ? Math.max(0, h) : 0
    });
  }
  return result;
}
function literalValue(raw) {
  const value = (raw ?? "").trim();
  if (value === "") return "0";
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  if (/^(true|false)$/i.test(value)) return value.toLowerCase();
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value;
  }
  return JSON.stringify(value);
}
function effectiveCondition(def) {
  const advanced = (def.condition ?? "").trim();
  if (advanced) return advanced;
  const variable = (def.variable ?? "").trim();
  if (!variable) return "";
  return `var(${JSON.stringify(variable)}) ${def.operator} ${literalValue(def.value)}`;
}
function mergeDefinitions(...lists) {
  const map = /* @__PURE__ */ new Map();
  for (const list of lists) {
    for (const def of list) {
      if (!map.has(def.key)) map.set(def.key, def);
    }
  }
  return [...map.values()];
}
function collectGlobalDefinitions(library, registered) {
  const map = /* @__PURE__ */ new Map();
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
      sound: def.sound || existing.sound
    });
  }
  return [...map.values()].filter((def) => def.mode === "global");
}
function collectDisplayDefinitions(story, registered, storyScanned) {
  if (!storyScanned) {
    return mergeDefinitions(registered);
  }
  return mergeDefinitions(story, registered);
}
function sortForDisplay(defs2, unlockedAt) {
  return defs2.map((def, index) => ({ def, index, at: unlockedAt.get(def.key) })).sort((a, b) => {
    const groupA = a.def.hidden ? 1 : 0;
    const groupB = b.def.hidden ? 1 : 0;
    if (groupA !== groupB) return groupA - groupB;
    const unlockedA = a.at !== void 0 ? 0 : 1;
    const unlockedB = b.at !== void 0 ? 0 : 1;
    if (unlockedA !== unlockedB) return unlockedA - unlockedB;
    if (a.at !== void 0 && b.at !== void 0) {
      return b.at - a.at;
    }
    return a.index - b.index;
  }).map((entry) => entry.def);
}
function maskDescription(text) {
  return (text ?? "").replace(/[^\s]/g, "？");
}
const id = "user.achievement-system";
const manifest = {
  id
};
const METHOD_MODES = {
  "trigger-achievement": "card",
  "register-achievement": "global"
};
let defs = [];
let scanned = false;
const listeners$1 = /* @__PURE__ */ new Set();
function subscribeStoryDefs(listener) {
  listeners$1.add(listener);
  return () => {
    listeners$1.delete(listener);
  };
}
function getStoryDefs() {
  return defs;
}
function areStoryDefsScanned() {
  return scanned;
}
function emit$1() {
  for (const listener of [...listeners$1]) listener();
}
function parseParams(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0) return {};
  try {
    const parsed = JSON.parse(raw);
    const out = {};
    for (const [key, descriptor] of Object.entries(parsed)) {
      if (descriptor && typeof descriptor === "object" && "value" in descriptor) {
        out[key] = descriptor.value;
      } else {
        out[key] = descriptor;
      }
    }
    return out;
  } catch {
    return {};
  }
}
function collectFromBlocks(blocks, found) {
  if (!Array.isArray(blocks)) return;
  for (const raw of blocks) {
    if (!raw || typeof raw !== "object") continue;
    const block = raw;
    if (block.type === "callExtensionFunction" && block.props) {
      const target = String(block.props.target ?? "");
      const slash = target.lastIndexOf("/");
      const extensionId = slash >= 0 ? target.slice(0, slash) : "";
      const methodId = slash >= 0 ? target.slice(slash + 1) : "";
      const mode = METHOD_MODES[methodId];
      if (extensionId === manifest.id && mode && block.props.disabled !== true) {
        const def = normalizeDefinition({
          ...parseParams(block.props.paramsJson),
          mode
        });
        if (def && !found.has(def.key)) found.set(def.key, def);
      }
    }
    if (block.children) collectFromBlocks(block.children, found);
  }
}
async function scanStoryAchievements(ctx) {
  const found = /* @__PURE__ */ new Map();
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
  emit$1();
  return defs;
}
const SETTINGS_SCOPE_ID = "achievement-system";
function getSetting(ctx, key) {
  try {
    const direct = ctx.settings.get(key);
    if (direct !== void 0) return direct;
  } catch {
  }
  try {
    const scoped = ctx.settings.get(`${SETTINGS_SCOPE_ID}.${key}`);
    if (scoped !== void 0) return scoped;
  } catch {
  }
  try {
    const cross = ctx.settings.cross.get(SETTINGS_SCOPE_ID, key);
    if (cross !== void 0) return cross;
  } catch {
  }
  return void 0;
}
function getNumberSetting(ctx, key, fallback) {
  const value = getSetting(ctx, key);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function getStringSetting(ctx, key, fallback) {
  const value = getSetting(ctx, key);
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}
let nextId = 1;
let current = null;
const queue = [];
const listeners = /* @__PURE__ */ new Set();
let suppressed = false;
const suppressListeners = /* @__PURE__ */ new Set();
function emit() {
  for (const listener of [...listeners]) listener();
}
function subscribeToast(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function getToast() {
  return current;
}
function finishToast(id2) {
  if (!current || current.id !== id2) return;
  current = null;
  emit();
  pump();
}
function pump() {
  if (current || queue.length === 0) return;
  current = queue.shift();
  emit();
}
function enqueueAchievementToast(ctx, def, duration) {
  queue.push({
    id: nextId++,
    key: def.key,
    name: def.name || def.key,
    iconUrl: safeResolveIcon$1(ctx, def.icon),
    accent: getStringSetting(ctx, "accentColor", "#ffd76a"),
    duration: Math.max(300, duration)
  });
  playAchievementSound(ctx, def);
  pump();
}
function emitSuppressed() {
  for (const listener of [...suppressListeners]) listener();
}
function subscribeSuppressed(listener) {
  suppressListeners.add(listener);
  return () => {
    suppressListeners.delete(listener);
  };
}
function getSuppressed() {
  return suppressed;
}
function setOverlayButtonSuppressed(value) {
  if (suppressed === value) return;
  suppressed = value;
  emitSuppressed();
}
function safeResolveIcon$1(ctx, uri) {
  if (!uri) return "";
  try {
    return ctx.asset.resolve(uri).url ?? "";
  } catch {
    return "";
  }
}
function playAchievementSound(ctx, def) {
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
    const ratio = Math.min(1, Math.max(0, volume / 100 * (seVolume / 100)));
    audio.volume = ratio;
    void audio.play().catch(() => {
    });
  } catch (error) {
    console.warn("[成就系统] 内置成就音效播放失败。", error);
  }
}
function useAchievementSetting(ctx, key) {
  const [direct] = ctx.settings.useValue(key);
  const [scoped] = ctx.settings.useValue(`${SETTINGS_SCOPE_ID}.${key}`);
  return direct !== void 0 ? direct : scoped;
}
const EXTENSION_ID = manifest.id;
const MODULE_ID = "achievement-system";
const OVERLAY_ID = "achievement-overlay";
const UNLOCKED_KEY = `${EXTENSION_ID}.unlocked`;
const REGISTERED_KEY = `${EXTENSION_ID}.registered`;
function writeList(ctx, key, list) {
  try {
    ctx.variables.set(key, list);
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
function readUnlocked(ctx) {
  return normalizeUnlocked(ctx.variables.get(UNLOCKED_KEY));
}
function writeUnlocked(ctx, records) {
  writeList(ctx, UNLOCKED_KEY, records);
}
function readRegistered(ctx) {
  return normalizeDefinitions(ctx.variables.get(REGISTERED_KEY));
}
function writeRegistered(ctx, defs2) {
  writeList(ctx, REGISTERED_KEY, defs2);
}
function isUnlocked(ctx, key) {
  return readEffectiveUnlocked(ctx).some((record) => record.key === key);
}
function currentHistoryLength(ctx) {
  try {
    return ctx.history.entries().length;
  } catch {
    return null;
  }
}
function applyHistoryWindow(ctx, records) {
  const length = currentHistoryLength(ctx);
  if (length === null) return [...records];
  return records.filter((record) => (record.h ?? 0) <= length);
}
function readEffectiveUnlocked(ctx) {
  return applyHistoryWindow(ctx, readUnlocked(ctx));
}
function upsertRegistered(ctx, def) {
  const current2 = readRegistered(ctx);
  const index = current2.findIndex((item) => item.key === def.key);
  if (index >= 0) {
    const next = current2.slice();
    next[index] = def;
    writeRegistered(ctx, next);
    return;
  }
  writeRegistered(ctx, [...current2, def]);
}
function raiseOverlay(ctx) {
  try {
    void ctx.ui.show(OVERLAY_ID, void 0, {
      size: "(100%, 100%)",
      position: "(0, 0)",
      pointerEventsPassthrough: true
    });
  } catch (error) {
    console.warn("[成就系统] 成就浮层不可用。", error);
  }
}
function unlockAchievement(ctx, def) {
  const raw = readUnlocked(ctx);
  const length = currentHistoryLength(ctx) ?? 0;
  const index = raw.findIndex((record2) => record2.key === def.key);
  if (index >= 0 && (raw[index].h ?? 0) <= length) {
    return false;
  }
  const record = { key: def.key, at: Date.now(), h: length };
  const next = index >= 0 ? raw.map((item, itemIndex) => itemIndex === index ? record : item) : [...raw, record];
  writeUnlocked(ctx, next);
  const fallbackDuration = getNumberSetting(ctx, "defaultDuration", 3e3);
  const duration = def.duration > 0 ? def.duration : fallbackDuration;
  raiseOverlay(ctx);
  enqueueAchievementToast(ctx, def, duration);
  console.log(`[成就系统] 解锁成就：${def.key}（${def.name}）`);
  return true;
}
const DESIGN_WIDTH = 1920;
function useDesignScale(ref) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const width = element.clientWidth || element.offsetWidth || DESIGN_WIDTH;
      const next = Math.min(2, Math.max(0.35, width / DESIGN_WIDTH));
      setScale(next);
    };
    update();
    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(element);
    }
    window.addEventListener("resize", update);
    return () => {
      observer == null ? void 0 : observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref]);
  return scale;
}
const DESIGN_CANVAS = { width: DESIGN_WIDTH, height: 1080 };
function useHistoryRevision(ctx) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const unsubscribe = ctx.subscribe("history:changed", () => {
      setRevision((value) => value + 1);
    });
    return unsubscribe;
  }, [ctx]);
  return revision;
}
function safeResolveIcon(ctx, uri) {
  if (!uri) return "";
  try {
    return ctx.asset.resolve(uri).url ?? "";
  } catch {
    return "";
  }
}
function formatTime(at) {
  const date = new Date(at);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
const TrophyIcon$1 = ({
  color,
  size = 64
}) => /* @__PURE__ */ jsxs(
  "svg",
  {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    children: [
      /* @__PURE__ */ jsx("path", { d: "M8 21h8" }),
      /* @__PURE__ */ jsx("path", { d: "M12 17v4" }),
      /* @__PURE__ */ jsx("path", { d: "M7 4h10v5a5 5 0 0 1-10 0V4z" }),
      /* @__PURE__ */ jsx("path", { d: "M7 6H4.5A1.5 1.5 0 0 0 3 7.5 3.5 3.5 0 0 0 6.5 11H7" }),
      /* @__PURE__ */ jsx("path", { d: "M17 6h2.5A1.5 1.5 0 0 1 21 7.5 3.5 3.5 0 0 1 17.5 11H17" })
    ]
  }
);
const AchievementCard = ({
  def,
  unlockedAt,
  accent,
  ctx,
  revealHidden
}) => {
  const [iconFailed, setIconFailed] = useState(false);
  const unlocked = unlockedAt !== void 0;
  const masked = def.hidden && (!unlocked || !revealHidden);
  const iconUrl = def.icon && !iconFailed ? safeResolveIcon(ctx, def.icon) : "";
  const description = masked ? maskDescription(def.description) : def.description;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        display: "flex",
        gap: 32,
        padding: "28px 32px",
        borderRadius: 32,
        background: "rgba(26,29,42,0.86)",
        border: `2px solid ${unlocked ? `${accent}59` : "rgba(255,255,255,0.07)"}`,
        boxShadow: unlocked ? `0 0 48px ${accent}1f` : "none",
        opacity: unlocked ? 1 : 0.86,
        transition: "border-color 0.2s ease, box-shadow 0.2s ease"
      },
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              width: 132,
              height: 132,
              flex: "0 0 auto",
              borderRadius: 28,
              overflow: "hidden",
              background: "rgba(255,255,255,0.05)",
              border: `2px solid ${unlocked ? `${accent}40` : "rgba(255,255,255,0.08)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: masked ? /* @__PURE__ */ jsx(
              "span",
              {
                style: {
                  fontSize: 68,
                  fontWeight: 700,
                  color: "#767e92",
                  lineHeight: 1,
                  transform: "translateY(-4px)"
                },
                children: "？"
              }
            ) : iconUrl ? /* @__PURE__ */ jsx(
              "img",
              {
                src: iconUrl,
                alt: "",
                onError: () => setIconFailed(true),
                style: {
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: unlocked ? "none" : "grayscale(1) brightness(0.72)",
                  opacity: unlocked ? 1 : 0.55
                }
              }
            ) : /* @__PURE__ */ jsx(TrophyIcon$1, { color: unlocked ? accent : "#6b7280" })
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap"
              },
              children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    style: {
                      fontSize: 34,
                      fontWeight: 600,
                      color: unlocked ? "#f4f6fb" : "#9aa2b4"
                    },
                    children: def.name || def.key
                  }
                ),
                unlocked && /* @__PURE__ */ jsx(
                  "span",
                  {
                    style: {
                      fontSize: 22,
                      letterSpacing: 2,
                      color: accent,
                      border: `2px solid ${accent}66`,
                      borderRadius: 999,
                      padding: "2px 16px"
                    },
                    children: "已解锁"
                  }
                ),
                def.hidden && /* @__PURE__ */ jsx(
                  "span",
                  {
                    style: {
                      fontSize: 22,
                      letterSpacing: 2,
                      color: "#8b93a7",
                      border: "2px solid rgba(255,255,255,0.16)",
                      borderRadius: 999,
                      padding: "2px 16px"
                    },
                    children: "隐藏"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                marginTop: 12,
                fontSize: 26,
                lineHeight: 1.65,
                color: unlocked ? "#c3cad9" : "#6f7686",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              },
              children: description || "——"
            }
          ),
          unlocked && (unlockedAt ?? 0) > 0 && /* @__PURE__ */ jsxs("div", { style: { marginTop: 12, fontSize: 20, color: "#6b7280" }, children: [
            "解锁于 ",
            formatTime(unlockedAt)
          ] })
        ] })
      ]
    }
  );
};
const AchievementPanel = () => {
  const ctx = useExtensionContext();
  const rootRef = useRef(null);
  const scale = useDesignScale(rootRef);
  const [unlockedRaw] = ctx.variables.useValue(UNLOCKED_KEY);
  const [registeredRaw] = ctx.variables.useValue(REGISTERED_KEY);
  const accentRaw = useAchievementSetting(ctx, "accentColor");
  const revealHiddenRaw = useAchievementSetting(
    ctx,
    "revealHiddenOnUnlock"
  );
  const storyDefs = React.useSyncExternalStore(
    subscribeStoryDefs,
    getStoryDefs,
    getStoryDefs
  );
  const accent = accentRaw && accentRaw.trim() ? accentRaw : "#ffd76a";
  const revealHidden = revealHiddenRaw !== false;
  const historyRevision = useHistoryRevision(ctx);
  const unlocked = useMemo(
    () => applyHistoryWindow(ctx, normalizeUnlocked(unlockedRaw)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, unlockedRaw, historyRevision]
  );
  const registered = useMemo(
    () => normalizeDefinitions(registeredRaw),
    [registeredRaw]
  );
  const definitions = useMemo(
    () => collectDisplayDefinitions(storyDefs, registered, areStoryDefsScanned()),
    [storyDefs, registered]
  );
  const unlockedAt = useMemo(
    () => new Map(unlocked.map((record) => [record.key, record.at])),
    [unlocked]
  );
  const sorted = useMemo(
    () => sortForDisplay(definitions, unlockedAt),
    [definitions, unlockedAt]
  );
  const unlockedCount = definitions.filter(
    (def) => unlockedAt.has(def.key)
  ).length;
  const percent = definitions.length > 0 ? Math.round(unlockedCount / definitions.length * 100) : 0;
  const close = () => {
    void ctx.ui.hide(MODULE_ID);
  };
  useEffect(() => {
    setOverlayButtonSuppressed(true);
    return () => setOverlayButtonSuppressed(false);
  }, []);
  useEffect(() => {
    const unbind = ctx.input.bindShortcut("Escape", close);
    return unbind;
  }, [ctx]);
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: rootRef,
      onClick: (event) => {
        if (event.target === event.currentTarget) close();
      },
      onWheel: (event) => event.stopPropagation(),
      style: {
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "radial-gradient(circle at 50% 0%, rgba(30,34,52,0.92), rgba(6,8,14,0.94))",
        backdropFilter: "blur(8px)",
        color: "#eef1f8",
        fontFamily: "inherit"
      },
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: DESIGN_CANVAS.width,
            height: DESIGN_CANVAS.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            display: "flex",
            flexDirection: "column"
          },
          children: [
            /* @__PURE__ */ jsxs(
              "header",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "44px 64px 28px"
                },
                children: [
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 32 }, children: [
                    /* @__PURE__ */ jsx(
                      "h1",
                      {
                        style: {
                          margin: 0,
                          fontSize: 52,
                          fontWeight: 600,
                          letterSpacing: 16
                        },
                        children: "成就"
                      }
                    ),
                    /* @__PURE__ */ jsxs("span", { style: { fontSize: 26, color: "#8b93a7" }, children: [
                      "已解锁 ",
                      unlockedCount,
                      " / ",
                      definitions.length
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: close,
                      style: {
                        width: 80,
                        height: 80,
                        borderRadius: 999,
                        border: "2px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#dfe4f0",
                        fontSize: 34,
                        cursor: "pointer",
                        lineHeight: 1
                      },
                      children: "✕"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              "div",
              {
                style: {
                  height: 6,
                  margin: "0 64px 20px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden"
                },
                children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    style: {
                      width: `${percent}%`,
                      height: "100%",
                      background: accent,
                      transition: "width 0.3s ease"
                    }
                  }
                )
              }
            ),
            /* @__PURE__ */ jsx(
              "div",
              {
                style: {
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px 64px 72px"
                },
                children: sorted.length === 0 ? /* @__PURE__ */ jsx(
                  "div",
                  {
                    style: {
                      marginTop: 160,
                      textAlign: "center",
                      color: "#6f7686",
                      fontSize: 28
                    },
                    children: "还没有配置任何成就"
                  }
                ) : /* @__PURE__ */ jsx(
                  "div",
                  {
                    style: {
                      maxWidth: 1360,
                      margin: "0 auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 24
                    },
                    children: sorted.map((def) => /* @__PURE__ */ jsx(
                      AchievementCard,
                      {
                        def,
                        unlockedAt: unlockedAt.get(def.key),
                        accent,
                        ctx,
                        revealHidden
                      },
                      def.key
                    ))
                  }
                )
              }
            )
          ]
        }
      )
    }
  );
};
const TrophyIcon = ({
  color,
  size = 56
}) => /* @__PURE__ */ jsxs(
  "svg",
  {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    children: [
      /* @__PURE__ */ jsx("path", { d: "M8 21h8" }),
      /* @__PURE__ */ jsx("path", { d: "M12 17v4" }),
      /* @__PURE__ */ jsx("path", { d: "M7 4h10v5a5 5 0 0 1-10 0V4z" }),
      /* @__PURE__ */ jsx("path", { d: "M7 6H4.5A1.5 1.5 0 0 0 3 7.5 3.5 3.5 0 0 0 6.5 11H7" }),
      /* @__PURE__ */ jsx("path", { d: "M17 6h2.5A1.5 1.5 0 0 1 21 7.5 3.5 3.5 0 0 1 17.5 11H17" })
    ]
  }
);
const ToastBanner = ({ item }) => {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setLeaving(true), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.duration]);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => finishToast(item.id), 340);
    return () => window.clearTimeout(timer);
  }, [leaving, item.id]);
  const shown = entered && !leaving;
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        position: "absolute",
        top: 12,
        left: 12,
        maxWidth: 1120,
        pointerEvents: "none",
        transform: shown ? "translateY(0)" : "translateY(-160%)",
        opacity: shown ? 1 : 0,
        transition: "transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1)"
      },
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 26,
            minWidth: 680,
            padding: "28px 46px 28px 28px",
            borderRadius: 34,
            background: "linear-gradient(135deg, rgba(28,30,44,0.97), rgba(14,16,24,0.97))",
            border: `2px solid ${item.accent}66`,
            boxShadow: "0 28px 72px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.04)",
            fontFamily: "inherit"
          },
          children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                style: {
                  width: 120,
                  height: 120,
                  flex: "0 0 auto",
                  borderRadius: 30,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.06)",
                  border: "2px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                },
                children: item.iconUrl && !iconFailed ? /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: item.iconUrl,
                    alt: "",
                    onError: () => setIconFailed(true),
                    style: { width: "100%", height: "100%", objectFit: "cover" }
                  }
                ) : /* @__PURE__ */ jsx(TrophyIcon, { color: item.accent })
              }
            ),
            /* @__PURE__ */ jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  minWidth: 0
                },
                children: [
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      style: {
                        fontSize: 26,
                        letterSpacing: 6,
                        color: item.accent
                      },
                      children: "成就解锁"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      style: {
                        fontSize: 44,
                        fontWeight: 600,
                        color: "#f6f8ff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      },
                      children: item.name
                    }
                  )
                ]
              }
            )
          ]
        }
      )
    }
  );
};
const BUTTON_POSITIONS = {
  "top-right": { top: 24, right: 24 },
  "top-left": { top: 24, left: 24 },
  "bottom-right": { bottom: 24, right: 24 },
  "bottom-left": { bottom: 24, left: 24 }
};
const AchievementOverlay = () => {
  const ctx = useExtensionContext();
  const rootRef = useRef(null);
  const scale = useDesignScale(rootRef);
  const toast = useSyncExternalStore(subscribeToast, getToast, getToast);
  const suppressed2 = useSyncExternalStore(
    subscribeSuppressed,
    getSuppressed,
    getSuppressed
  );
  const showButton = useAchievementSetting(ctx, "showFloatingButton") ?? false;
  const position = useAchievementSetting(ctx, "buttonPosition") ?? "top-right";
  const label = useAchievementSetting(ctx, "buttonLabel") ?? "成就";
  const accent = useAchievementSetting(ctx, "accentColor") ?? "#ffd76a";
  const open = () => {
    void ctx.ui.show(MODULE_ID, void 0, {
      modal: true,
      size: "(100%, 100%)",
      position: "(0, 0)",
      interactable: true
    });
  };
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: rootRef,
      style: {
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        fontFamily: "inherit"
      },
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: DESIGN_CANVAS.width,
            height: DESIGN_CANVAS.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none"
          },
          children: [
            toast && /* @__PURE__ */ jsx(ToastBanner, { item: toast }, toast.id),
            showButton && !suppressed2 && /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: open,
                style: {
                  position: "absolute",
                  ...BUTTON_POSITIONS[position] ?? BUTTON_POSITIONS["top-right"],
                  pointerEvents: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "18px 32px",
                  borderRadius: 999,
                  border: `2px solid ${accent}73`,
                  background: "rgba(18,20,30,0.82)",
                  color: "#f2f4fa",
                  fontSize: 28,
                  fontFamily: "inherit",
                  letterSpacing: 2,
                  cursor: "pointer",
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.35)"
                },
                children: [
                  /* @__PURE__ */ jsx("span", { style: { display: "inline-flex", color: accent }, children: /* @__PURE__ */ jsx(TrophyIcon, { color: accent, size: 34 }) }),
                  /* @__PURE__ */ jsx("span", { children: label })
                ]
              }
            )
          ]
        }
      )
    }
  );
};
const OPERATORS = [
  "===",
  "!==",
  ">=",
  "<=",
  "==",
  "!=",
  "&&",
  "||",
  ">",
  "<",
  "!",
  "+",
  "-",
  "*",
  "/",
  "%"
];
const astCache = /* @__PURE__ */ new Map();
function isIdentifierChar(ch) {
  return !/[\s()!<>=&|+\-*/%'",]/.test(ch);
}
function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch, pos: i });
      i += 1;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma", value: ch, pos: i });
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      let text = "";
      let closed = false;
      while (j < input.length) {
        const current2 = input[j];
        if (current2 === "\\" && j + 1 < input.length) {
          text += input[j + 1];
          j += 2;
          continue;
        }
        if (current2 === quote) {
          closed = true;
          j += 1;
          break;
        }
        text += current2;
        j += 1;
      }
      if (!closed) {
        throw new Error(`字符串缺少收尾引号（位置 ${i}）`);
      }
      tokens.push({ type: "string", value: text, pos: i });
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < input.length && /[0-9]/.test(input[j])) j += 1;
      if (input[j] === "." && /[0-9]/.test(input[j + 1] ?? "")) {
        j += 1;
        while (j < input.length && /[0-9]/.test(input[j])) j += 1;
      }
      tokens.push({ type: "number", value: input.slice(i, j), pos: i });
      i = j;
      continue;
    }
    const op = OPERATORS.find((candidate) => input.startsWith(candidate, i));
    if (op) {
      tokens.push({ type: "operator", value: op, pos: i });
      i += op.length;
      continue;
    }
    if (isIdentifierChar(ch)) {
      let j = i;
      while (j < input.length && isIdentifierChar(input[j])) j += 1;
      tokens.push({ type: "identifier", value: input.slice(i, j), pos: i });
      i = j;
      continue;
    }
    throw new Error(`无法识别的字符 "${ch}"（位置 ${i}）`);
  }
  return tokens;
}
class Parser {
  constructor(tokens) {
    this.pos = 0;
    this.tokens = tokens;
  }
  parse() {
    if (this.tokens.length === 0) {
      throw new Error("表达式为空");
    }
    const node = this.parseOr();
    if (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      throw new Error(`多余的内容 "${token.value}"（位置 ${token.pos}）`);
    }
    return node;
  }
  peek() {
    return this.tokens[this.pos];
  }
  consumeOperator(...values) {
    const token = this.peek();
    if (token && token.type === "operator" && values.includes(token.value)) {
      this.pos += 1;
      return token.value;
    }
    return null;
  }
  consumeParen(value) {
    const token = this.peek();
    if (token && token.type === "paren" && token.value === value) {
      this.pos += 1;
      return true;
    }
    return false;
  }
  parseOr() {
    let left = this.parseAnd();
    let op = this.consumeOperator("||");
    while (op) {
      const right = this.parseAnd();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator("||");
    }
    return left;
  }
  parseAnd() {
    let left = this.parseEquality();
    let op = this.consumeOperator("&&");
    while (op) {
      const right = this.parseEquality();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator("&&");
    }
    return left;
  }
  parseEquality() {
    let left = this.parseComparison();
    let op = this.consumeOperator("==", "!=", "===", "!==");
    while (op) {
      const right = this.parseComparison();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator("==", "!=", "===", "!==");
    }
    return left;
  }
  parseComparison() {
    let left = this.parseAdditive();
    let op = this.consumeOperator(">", ">=", "<", "<=");
    while (op) {
      const right = this.parseAdditive();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator(">", ">=", "<", "<=");
    }
    return left;
  }
  parseAdditive() {
    let left = this.parseMultiplicative();
    let op = this.consumeOperator("+", "-");
    while (op) {
      const right = this.parseMultiplicative();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator("+", "-");
    }
    return left;
  }
  parseMultiplicative() {
    let left = this.parseUnary();
    let op = this.consumeOperator("*", "/", "%");
    while (op) {
      const right = this.parseUnary();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator("*", "/", "%");
    }
    return left;
  }
  parseUnary() {
    const op = this.consumeOperator("!", "-");
    if (op) {
      return { kind: "unary", op, arg: this.parseUnary() };
    }
    return this.parsePrimary();
  }
  parsePrimary() {
    const token = this.peek();
    if (!token) {
      throw new Error("表达式不完整");
    }
    if (token.type === "number") {
      this.pos += 1;
      return { kind: "literal", value: Number(token.value) };
    }
    if (token.type === "string") {
      this.pos += 1;
      return { kind: "literal", value: token.value };
    }
    if (token.type === "identifier") {
      this.pos += 1;
      const name = token.value;
      const lower = name.toLowerCase();
      if (lower === "true") return { kind: "literal", value: true };
      if (lower === "false") return { kind: "literal", value: false };
      if (lower === "null") return { kind: "literal", value: null };
      if (this.consumeParen("(")) {
        const args = [];
        if (!this.consumeParen(")")) {
          do {
            args.push(this.parseOr());
          } while (this.consumeComma());
          if (!this.consumeParen(")")) {
            throw new Error(`函数 ${name} 缺少右括号`);
          }
        }
        return { kind: "call", name: lower, args };
      }
      return { kind: "variable", name };
    }
    if (token.type === "paren" && token.value === "(") {
      this.pos += 1;
      const inner = this.parseOr();
      if (!this.consumeParen(")")) {
        throw new Error("缺少右括号");
      }
      return inner;
    }
    throw new Error(`意外的符号 "${token.value}"（位置 ${token.pos}）`);
  }
  consumeComma() {
    const token = this.peek();
    if (token && token.type === "comma") {
      this.pos += 1;
      return true;
    }
    return false;
  }
}
function isNumericLike(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 && !Number.isNaN(Number(text));
  }
  return false;
}
function toNumber(value) {
  if (typeof value === "number") return value;
  return Number(value);
}
function isTruthy(value) {
  if (value === void 0 || value === null || value === false) return false;
  if (typeof value === "number") return value !== 0 && !Number.isNaN(value);
  if (typeof value === "string") return value.length > 0;
  return true;
}
function looseEquals(left, right) {
  if (left === void 0 || right === void 0) return false;
  const leftNull = left === null;
  const rightNull = right === null;
  if (leftNull || rightNull) return leftNull && rightNull;
  if (typeof left === "boolean" || typeof right === "boolean") {
    return Boolean(left) === Boolean(right);
  }
  if (isNumericLike(left) && isNumericLike(right)) {
    return toNumber(left) === toNumber(right);
  }
  return String(left) === String(right);
}
function relational(op, left, right) {
  if (left === void 0 || left === null || right === void 0 || right === null) {
    return false;
  }
  if (isNumericLike(left) && isNumericLike(right)) {
    const a2 = toNumber(left);
    const b2 = toNumber(right);
    switch (op) {
      case ">":
        return a2 > b2;
      case ">=":
        return a2 >= b2;
      case "<":
        return a2 < b2;
      case "<=":
        return a2 <= b2;
      default:
        return false;
    }
  }
  const a = String(left);
  const b = String(right);
  switch (op) {
    case ">":
      return a > b;
    case ">=":
      return a >= b;
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    default:
      return false;
  }
}
function argumentName(node) {
  if (!node) return null;
  if (node.kind === "literal" && typeof node.value === "string") return node.value;
  if (node.kind === "variable") return node.name;
  return null;
}
function evaluateNode(node, resolve) {
  switch (node.kind) {
    case "literal":
      return node.value;
    case "variable":
      return resolve(node.name);
    case "unary": {
      const value = evaluateNode(node.arg, resolve);
      if (node.op === "!") return !isTruthy(value);
      return -toNumber(value);
    }
    case "call": {
      const name = argumentName(node.args[0]);
      if (name === null) {
        throw new Error(`函数 ${node.name} 需要变量名参数`);
      }
      const value = resolve(name);
      switch (node.name) {
        case "var":
          return value;
        case "has":
          return value !== void 0 && value !== null;
        case "len":
          if (typeof value === "string") return value.length;
          if (Array.isArray(value)) return value.length;
          return 0;
        default:
          throw new Error(`不支持的函数 ${node.name}`);
      }
    }
    case "binary": {
      if (node.op === "&&") {
        return isTruthy(evaluateNode(node.left, resolve)) ? isTruthy(evaluateNode(node.right, resolve)) : false;
      }
      if (node.op === "||") {
        return isTruthy(evaluateNode(node.left, resolve)) ? true : isTruthy(evaluateNode(node.right, resolve));
      }
      const left = evaluateNode(node.left, resolve);
      const right = evaluateNode(node.right, resolve);
      switch (node.op) {
        case "==":
        case "===":
          return looseEquals(left, right);
        case "!=":
        case "!==":
          if (left === void 0 || right === void 0) return false;
          return !looseEquals(left, right);
        case ">":
        case ">=":
        case "<":
        case "<=":
          return relational(node.op, left, right);
        case "+":
          if (typeof left === "string" || typeof right === "string") {
            return `${left ?? ""}${right ?? ""}`;
          }
          return toNumber(left) + toNumber(right);
        case "-":
          return toNumber(left) - toNumber(right);
        case "*":
          return toNumber(left) * toNumber(right);
        case "/":
          return toNumber(left) / toNumber(right);
        case "%":
          return toNumber(left) % toNumber(right);
        default:
          throw new Error(`不支持的运算符 ${node.op}`);
      }
    }
    default:
      return void 0;
  }
}
function parseExpression(expression) {
  if (astCache.has(expression)) {
    return astCache.get(expression) ?? null;
  }
  try {
    const ast = new Parser(tokenize(expression)).parse();
    astCache.set(expression, ast);
    return ast;
  } catch (error) {
    console.warn(`[成就系统] 条件表达式解析失败：${expression}`, error);
    astCache.set(expression, null);
    return null;
  }
}
function evaluateExpression(expression, resolve) {
  const text = expression.trim();
  if (!text) return false;
  const ast = parseExpression(text);
  if (!ast) return false;
  try {
    return isTruthy(evaluateNode(ast, resolve));
  } catch (error) {
    console.warn(`[成就系统] 条件表达式求值失败：${text}`, error);
    return false;
  }
}
const DEFAULT_TITLE_UI = "@avg.internal.default-shell/title-screen";
const MENU_TEXTS = ["开始游戏", "新游戏", "读取存档", "鉴赏", "设置", "退出"];
const GALLERY_TEXT = "鉴赏";
const SETTINGS_TEXT = "设置";
const NEW_LABEL = "成就";
const MARK = "data-achievement-title-entry";
function compactText(element) {
  return (element.textContent ?? "").replace(/\s+/g, "").trim();
}
function replaceLeafText(element, text) {
  const leaf = Array.from(element.querySelectorAll("*")).find(
    (child) => child.children.length === 0 && compactText(child).length > 0
  );
  if (leaf) {
    leaf.textContent = text;
    return;
  }
  element.textContent = text;
}
function findTitleRoot() {
  let best = null;
  let bestLength = Number.POSITIVE_INFINITY;
  for (const element of Array.from(
    document.body.querySelectorAll("*")
  )) {
    const text = compactText(element);
    if (text.length < 6 || text.length >= 600) continue;
    if (!text.includes(GALLERY_TEXT) || !text.includes(SETTINGS_TEXT)) continue;
    let hits = 0;
    for (const label of MENU_TEXTS) {
      if (text.includes(label)) hits += 1;
    }
    if (hits < 3) continue;
    if (text.length < bestLength) {
      best = element;
      bestLength = text.length;
    }
  }
  return best;
}
function findRowByText(root, text) {
  const candidates = Array.from(root.querySelectorAll("*")).filter(
    (element) => compactText(element) === text
  );
  if (candidates.length === 0) return null;
  let node = candidates[0];
  while (node.parentElement && node.parentElement !== root) {
    node = node.parentElement;
  }
  return node;
}
function isNumberRow(element) {
  return /^\d{1,2}$/.test(compactText(element));
}
function findNumberRowNear(root, row) {
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const child of Array.from(root.children)) {
    if (!isNumberRow(child)) continue;
    const distance = Math.abs(child.offsetTop - row.offsetTop);
    if (distance < bestDistance && distance <= 80) {
      best = child;
      bestDistance = distance;
    }
  }
  return best;
}
function cleanup(state) {
  for (const item of state.shifted) {
    item.element.style.marginTop = item.marginTop;
    item.element.style.top = item.top;
  }
  for (const item of state.renamed) {
    replaceLeafText(item.element, item.text);
  }
  for (const element of state.inserted) {
    element.remove();
  }
}
function inject(onOpen) {
  const root = findTitleRoot();
  if (!root || root.querySelector(`[${MARK}]`)) return null;
  const existing = Array.from(root.children).some(
    (child) => compactText(child) === NEW_LABEL
  );
  if (existing) return null;
  const galleryRow = findRowByText(root, GALLERY_TEXT);
  const settingsRow = findRowByText(root, SETTINGS_TEXT);
  if (!galleryRow || !settingsRow) return null;
  if (galleryRow.parentElement !== root || settingsRow.parentElement !== root) {
    return null;
  }
  const layoutPitch = settingsRow.offsetTop - galleryRow.offsetTop;
  const rectPitch = settingsRow.getBoundingClientRect().top - galleryRow.getBoundingClientRect().top;
  const pitch = layoutPitch > 1 ? layoutPitch : rectPitch;
  if (!(pitch > 1)) return null;
  const state = { inserted: [], shifted: [], renamed: [] };
  const shiftElement = (element, amount) => {
    state.shifted.push({
      element,
      marginTop: element.style.marginTop,
      top: element.style.top
    });
    const computedTop = parseFloat(getComputedStyle(element).top);
    if (Number.isFinite(computedTop)) {
      element.style.top = `${computedTop + amount}px`;
    } else {
      const margin = parseFloat(getComputedStyle(element).marginTop) || 0;
      element.style.marginTop = `${margin + amount}px`;
    }
  };
  const clone = galleryRow.cloneNode(true);
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  clone.setAttribute(MARK, "true");
  replaceLeafText(clone, NEW_LABEL);
  clone.style.cursor = "pointer";
  clone.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpen();
  });
  root.insertBefore(clone, settingsRow);
  state.inserted.push(clone);
  const originalSettingsTop = settingsRow.offsetTop;
  const beforeTop = settingsRow.getBoundingClientRect().top;
  shiftElement(settingsRow, pitch);
  const moved = settingsRow.getBoundingClientRect().top - beforeTop;
  if (moved < rectPitch * 0.5) {
    cleanup(state);
    return null;
  }
  const galleryNumber = findNumberRowNear(root, galleryRow);
  if (galleryNumber) {
    const numberClone = galleryNumber.cloneNode(true);
    numberClone.removeAttribute("id");
    numberClone.setAttribute(MARK, "true");
    replaceLeafText(numberClone, "04");
    root.insertBefore(numberClone, galleryNumber.nextSibling);
    state.inserted.push(numberClone);
    shiftElement(numberClone, pitch);
  }
  for (const child of Array.from(root.children)) {
    if (child === settingsRow || child === clone || state.inserted.includes(child)) {
      continue;
    }
    if (child.offsetTop >= originalSettingsTop - 1) {
      shiftElement(child, pitch);
    }
  }
  shiftElement(clone, pitch);
  const numberRows = Array.from(root.children).filter((child) => isNumberRow(child)).sort((a, b) => a.offsetTop - b.offsetTop);
  numberRows.forEach((row, index) => {
    const next = String(index + 1).padStart(2, "0");
    const currentText = compactText(row);
    if (currentText !== next) {
      state.renamed.push({ element: row, text: currentText });
      replaceLeafText(row, next);
    }
  });
  return () => cleanup(state);
}
const MENU_BINDINGS = [
  {
    slot: INTERNAL_SYSTEM_SLOT.Title,
    settingKey: "titleScreenButton",
    ownUI: "@user.achievement-system/title-screen",
    domFallback: true
  },
  {
    slot: INTERNAL_SYSTEM_SLOT.Settings,
    settingKey: "settingsScreenButton",
    ownUI: "@user.achievement-system/settings-screen",
    domFallback: false
  }
];
function installMenuEntries(ctx, onOpen) {
  for (const binding of MENU_BINDINGS) {
    const names = /* @__PURE__ */ new Set();
    try {
      const resolved = ctx.system.getBinding(binding.slot);
      if (resolved) names.add(resolved.replace(/^ui:/, ""));
    } catch {
    }
    if (binding.ownUI) names.add(binding.ownUI);
    if (binding.domFallback) names.add(DEFAULT_TITLE_UI);
    for (const name of names) {
      try {
        ctx.visualUI.onOpen(name, (view) => {
          if (getSetting(ctx, binding.settingKey) === false) return;
          try {
            const entry = view.get("achievement-entry");
            if (entry) {
              entry.on("click", () => {
                const closeCurrent = binding.slot === INTERNAL_SYSTEM_SLOT.Settings ? () => view.close() : void 0;
                onOpen(closeCurrent);
              });
              return;
            }
          } catch {
          }
          if (!binding.domFallback) return;
          let dispose = null;
          let cancelled = false;
          let attempts = 0;
          const attempt = () => {
            if (cancelled || dispose) return;
            try {
              dispose = inject(onOpen);
            } catch (error) {
              console.warn("[成就系统] 标题画面插入成就按钮失败。", error);
            }
            if (dispose) return;
            attempts += 1;
            if (attempts <= 25) {
              window.setTimeout(attempt, 100);
            }
          };
          attempt();
          view.onClose(() => {
            cancelled = true;
            try {
              dispose == null ? void 0 : dispose();
            } catch {
            }
            dispose = null;
          });
        });
      } catch (error) {
        console.warn(`[成就系统] 无法监听界面 ${name}。`, error);
      }
    }
  }
}
const OPEN_ACTION_ID = `${EXTENSION_ID}.open-achievements`;
let evaluating = false;
let checkTimer = null;
function openAchievementPanel(ctx) {
  return ctx.ui.show(MODULE_ID, void 0, {
    modal: true,
    size: "(100%, 100%)",
    position: "(0, 0)",
    interactable: true
  });
}
function showOverlay(ctx, attempt = 0) {
  try {
    const result = ctx.ui.show(OVERLAY_ID, void 0, {
      size: "(100%, 100%)",
      position: "(0, 0)",
      pointerEventsPassthrough: true
    });
    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        console.warn("[成就系统] 成就浮层打开失败。", error);
      });
    }
  } catch (error) {
    console.warn("[成就系统] 成就浮层打开失败。", error);
    if (attempt < 2) {
      window.setTimeout(() => showOverlay(ctx, attempt + 1), 800);
    }
  }
}
function runGlobalCheck(ctx) {
  if (evaluating) return 0;
  evaluating = true;
  try {
    const definitions = collectGlobalDefinitions([], [
      ...getStoryDefs(),
      ...readRegistered(ctx)
    ]);
    let unlockedCount = 0;
    for (const def of definitions) {
      const expression = effectiveCondition(def);
      if (!expression) continue;
      if (isUnlocked(ctx, def.key)) continue;
      const matched = evaluateExpression(
        expression,
        (name) => ctx.variables.get(name)
      );
      if (!matched) continue;
      if (unlockAchievement(ctx, def)) unlockedCount += 1;
    }
    return unlockedCount;
  } finally {
    evaluating = false;
  }
}
function scheduleGlobalCheck(ctx) {
  if (checkTimer !== null) return;
  checkTimer = window.setTimeout(() => {
    checkTimer = null;
    runGlobalCheck(ctx);
  }, 50);
}
function readString(params, key) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}
function readNumber(params, key) {
  const value = Number(params[key]);
  return Number.isFinite(value) ? value : 0;
}
function buildCardDefinition(ctx, params, mode) {
  const key = readString(params, "key").trim();
  if (!key) {
    console.warn("[成就系统] 卡片缺少成就 ID，已跳过。");
    return null;
  }
  const existing = getStoryDefs().find((def) => def.key === key);
  const name = readString(params, "name").trim();
  const icon = readString(params, "icon").trim();
  const sound = readString(params, "sound").trim();
  const description = readString(params, "description");
  const duration = readNumber(params, "duration");
  const variable = readString(params, "variable").trim();
  const condition = readString(params, "condition");
  const value = readString(params, "value");
  const base = existing ? { ...existing } : {
    key,
    name: key,
    description: "",
    icon: "",
    hidden: false,
    duration: 0,
    sound: "",
    variable: "",
    operator: ">=",
    value: "0",
    condition: ""
  };
  base.key = key;
  base.mode = mode;
  if (name) base.name = name;
  if (icon) base.icon = icon;
  if (sound) base.sound = sound;
  if (description) base.description = description;
  if (duration > 0) base.duration = duration;
  if (params.hidden === true) base.hidden = true;
  if (variable) base.variable = variable;
  if (value) base.value = value;
  if (condition.trim()) base.condition = condition;
  const operator = readString(params, "operator");
  if (ACHIEVEMENT_OPERATORS.includes(operator)) {
    base.operator = operator;
  }
  return normalizeDefinition(base);
}
function registerRuntimeDefinition(ctx, def) {
  const known = getStoryDefs().some((item) => item.key === def.key);
  if (!known) upsertRegistered(ctx, def);
}
_AchievementSystemExtension_decorators = [extension({ id: MODULE_ID, label: "成就系统 v1.0.4" })];
let _AchievementSystemExtension = class _AchievementSystemExtension extends (_a = Extension) {
  /** 启动期：浮层、剧本扫描、全局条件监听、快捷键、标题画面入口。 */
  static onRegister(ctx) {
    showOverlay(ctx);
    void scanStoryAchievements(ctx).then(() => runGlobalCheck(ctx));
    ctx.subscribe("variable:changed", () => scheduleGlobalCheck(ctx));
    ctx.subscribe("archive:changed", () => scheduleGlobalCheck(ctx));
    window.setTimeout(() => runGlobalCheck(ctx), 1200);
    ctx.input.registerAction({
      id: OPEN_ACTION_ID,
      label: "打开成就界面",
      defaultKeys: ["KeyJ"]
    });
    ctx.input.onAction(OPEN_ACTION_ID, () => {
      void openAchievementPanel(ctx);
    });
    installMenuEntries(ctx, (closeCurrent) => {
      closeCurrent == null ? void 0 : closeCurrent();
      void openAchievementPanel(ctx);
    });
  }
  render() {
    return { component: AchievementPanel, props: {} };
  }
};
_init = __decoratorStart(_a);
_AchievementSystemExtension = __decorateElement(_init, 0, "AchievementSystemExtension", _AchievementSystemExtension_decorators, _AchievementSystemExtension);
_AchievementSystemExtension.settings = settings((s) => ({
  defaultDuration: s.number("默认横幅停留(ms)").default(3e3).range(300, 6e4).step(100),
  soundVolume: s.number("成就音效音量(%)").default(100).range(0, 100).step(5),
  defaultSound: s.asset("默认成就音效").accepts("audio").describe("留空时使用扩展内置的成就音效；单个成就可以单独覆盖"),
  revealHiddenOnUnlock: s.boolean("隐藏成就解锁后揭示内容").default(true).describe("关闭后隐藏成就即使解锁也保持问号图标与问号介绍"),
  titleScreenButton: s.boolean("标题画面插入成就按钮").default(true).describe("在默认标题画面的「鉴赏」和「设置」之间插入「成就」入口"),
  settingsScreenButton: s.boolean("系统设置成就按钮生效").default(true).describe("绑定扩展自带的「系统设置（含成就）」后，右下角成就按钮可用"),
  showFloatingButton: s.boolean("显示常驻入口按钮").default(false).describe("在游戏画面角落常驻一个「成就」悬浮按钮"),
  buttonPosition: s.enum("常驻按钮位置", [
    "top-right",
    "top-left",
    "bottom-right",
    "bottom-left"
  ]).labels({
    "top-right": "右上",
    "top-left": "左上",
    "bottom-right": "右下",
    "bottom-left": "左下"
  }).default("top-right").enabledWhen("showFloatingButton"),
  buttonLabel: s.string("常驻按钮文字").default("成就").enabledWhen("showFloatingButton"),
  accentColor: s.color("主题强调色").default("#ffd76a")
}));
_AchievementSystemExtension.saveSchema = defineSave({
  unlocked: {
    type: "list",
    persistence: "slot",
    default: [],
    label: "已解锁成就"
  },
  registered: {
    type: "list",
    persistence: "slot",
    default: [],
    label: "运行时注册的成就定义"
  }
});
_AchievementSystemExtension.triggerAchievement = method({
  id: "trigger-achievement",
  title: "触发成就",
  description: "剧情播放到这里立即解锁成就并弹出横幅。填写成就ID、名称、介绍和图标即可；同 ID 只记录一次，成就页面按剧本里的卡片自动收集。",
  schema: {
    key: {
      type: "string",
      label: "成就ID",
      required: true,
      suggestions: { key: "achievement-key" }
    },
    name: { type: "string", label: "成就名称（选填）" },
    description: {
      type: "string",
      label: "成就介绍（选填）",
      multiline: true
    },
    icon: { type: "asset", label: "成就图标（选填）", assetType: "image" },
    hidden: { type: "boolean", label: "隐藏成就", default: false },
    duration: {
      type: "number",
      label: "横幅停留(ms)",
      default: 0,
      min: 0,
      max: 6e4,
      step: 100,
      unit: "ms"
    },
    sound: { type: "asset", label: "成就音效（选填）", assetType: "audio" }
  },
  run(ctx, params) {
    try {
      const def = buildCardDefinition(ctx, params, "card");
      if (!def) return;
      registerRuntimeDefinition(ctx, def);
      unlockAchievement(ctx, def);
    } catch (error) {
      console.error("[成就系统] 触发成就失败。", error);
    }
  }
});
_AchievementSystemExtension.registerAchievement = method({
  id: "register-achievement",
  title: "注册全局成就",
  description: "注册一条全局条件成就：引擎启动时自动扫描该卡片并监听变量，满足条件时解锁。条件可用变量选择器，也可写高级表达式。",
  schema: {
    key: {
      type: "string",
      label: "成就ID",
      required: true,
      suggestions: { key: "achievement-key" }
    },
    name: { type: "string", label: "成就名称" },
    description: {
      type: "string",
      label: "成就介绍",
      multiline: true
    },
    icon: { type: "asset", label: "成就图标", assetType: "image" },
    hidden: { type: "boolean", label: "隐藏成就", default: false },
    variable: { type: "variable", label: "判断变量（选填）" },
    operator: {
      type: "enum",
      label: "比较方式",
      default: ">=",
      options: OPERATOR_OPTIONS
    },
    value: { type: "string", label: "比较值", default: "0" },
    condition: {
      type: "string",
      label: "高级条件表达式（选填，填写后优先）",
      multiline: true
    },
    duration: {
      type: "number",
      label: "横幅停留(ms)",
      default: 0,
      min: 0,
      max: 6e4,
      step: 100,
      unit: "ms"
    },
    sound: { type: "asset", label: "成就音效（选填）", assetType: "audio" }
  },
  run(ctx, params) {
    try {
      const def = buildCardDefinition(ctx, params, "global");
      if (!def) return;
      if (!effectiveCondition(def)) {
        console.warn(
          `[成就系统] 成就「${def.key}」没有可用条件（判断变量和高级表达式都为空）。`
        );
      }
      registerRuntimeDefinition(ctx, def);
      runGlobalCheck(ctx);
    } catch (error) {
      console.error("[成就系统] 注册全局成就失败。", error);
    }
  }
});
_AchievementSystemExtension.refreshAchievements = method({
  id: "refresh-achievements",
  title: "刷新全局成就",
  description: "立即重新判断一遍所有全局条件成就。",
  run(ctx) {
    try {
      runGlobalCheck(ctx);
    } catch (error) {
      console.error("[成就系统] 刷新全局成就失败。", error);
    }
  }
});
_AchievementSystemExtension.resetAchievements = method({
  id: "reset-achievements",
  title: "重置成就数据",
  description: "清空所有解锁记录与运行时注册的成就定义，用于测试。",
  run(ctx) {
    writeUnlocked(ctx, []);
    writeRegistered(ctx, []);
  }
});
_AchievementSystemExtension.openAchievements = method({
  id: "open-achievements",
  title: "打开成就界面",
  description: "打开成就页面，玩家关闭后剧情继续。",
  async run(ctx) {
    await openAchievementPanel(ctx);
  }
});
_AchievementSystemExtension.checkAchievement = method({
  id: "check-achievement",
  title: "检查成就是否已解锁",
  description: "返回该成就是否已经解锁，可用于 If 条件。",
  returns: { type: "boolean", label: "是否已解锁" },
  schema: {
    key: {
      type: "string",
      label: "成就ID",
      required: true,
      suggestions: { key: "achievement-key" }
    }
  },
  run(ctx, params) {
    return isUnlocked(ctx, params.key.trim());
  }
});
__runInitializers(_init, 1, _AchievementSystemExtension);
let AchievementSystemExtension = _AchievementSystemExtension;
_AchievementOverlayExtension_decorators = [extension({ id: OVERLAY_ID, label: "成就浮层" })];
class AchievementOverlayExtension extends (_b = Extension) {
  render() {
    return { component: AchievementOverlay, props: {} };
  }
}
_init2 = __decoratorStart(_b);
AchievementOverlayExtension = __decorateElement(_init2, 0, "AchievementOverlayExtension", _AchievementOverlayExtension_decorators, AchievementOverlayExtension);
__runInitializers(_init2, 1, AchievementOverlayExtension);
export {
  AchievementOverlayExtension,
  AchievementSystemExtension,
  AchievementSystemExtension as default
};
//# sourceMappingURL=index.js.map
