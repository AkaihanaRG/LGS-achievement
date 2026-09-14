/**
 * 集成冒烟测试：用 esbuild 把扩展源码与 mock SDK 打包后在 Node 里跑一遍，
 * 验证模块加载、onRegister、剧本扫描、全局条件解锁、卡片触发、查询与成就页面渲染。
 *
 * 运行：node scripts/smoke-test.mjs
 */

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outfile = path.join(root, "node_modules", ".cache", "achievement-smoke.mjs");

// ---------------------------------------------------------------------------
// 极简 DOM / 浏览器 API 替身
// ---------------------------------------------------------------------------

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.style = {};
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this._html = "";
    this.textContent = "";
    this.parentNode = null;
  }

  set innerHTML(value) {
    this._html = value;
  }

  get innerHTML() {
    return this._html;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }

  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
  }

  addEventListener(type, handler) {
    (this.listeners[type] ??= []).push(handler);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }

  animate() {
    return { finished: Promise.resolve(), cancel() {} };
  }
}

globalThis.document = {
  createElement: (tagName) => new FakeElement(tagName),
  body: new FakeElement("body"),
  querySelectorAll: () => [],
};

globalThis.window = {
  setTimeout: (handler, delay) => setTimeout(handler, delay),
  clearTimeout: (handle) => clearTimeout(handle),
  addEventListener: () => {},
  removeEventListener: () => {},
};

globalThis.requestAnimationFrame = (handler) => setTimeout(handler, 16);
globalThis.cancelAnimationFrame = (handle) => clearTimeout(handle);
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  disconnect() {}
};

globalThis.Audio = class Audio {
  constructor(url) {
    this.url = url;
    this.volume = 1;
  }

  play() {
    return Promise.resolve();
  }
};

// ---------------------------------------------------------------------------
// mock ExtensionContext
// ---------------------------------------------------------------------------

const SETTINGS_SCOPE_ID = "achievement-system";

/** 模拟游戏内时间轴：历史记录条数可增减。 */
const historyEntries = [];

function makeCardBlock(method, values) {
  const params = {};
  for (const [key, value] of Object.entries(values)) {
    params[key] = { kind: "lit", value };
  }
  return {
    id: `block-${method}-${values.key}`,
    type: "callExtensionFunction",
    props: {
      disabled: false,
      target: `user.achievement-system/${method}`,
      paramsJson: JSON.stringify(params),
    },
  };
}

const storyChapters = [
  {
    id: "chapter-1",
    name: "序章",
    fragments: [
      {
        id: "main",
        name: "main",
        blocks: [
          makeCardBlock("trigger-achievement", {
            key: "secret-ending",
            name: "???",
            description: "看过了隐藏结局",
            hidden: true,
          }),
          makeCardBlock("trigger-achievement", {
            key: "hidden-locked",
            name: "隐藏成就名",
            description: "秘密描述",
            hidden: true,
          }),
          makeCardBlock("trigger-achievement", {
            key: "card-only",
            name: "卡片成就",
            description: "由卡片现场定义",
            hidden: true,
          }),
          makeCardBlock("register-achievement", {
            key: "affection-50",
            name: "羁绊",
            description: "好感度达到 50",
            variable: "好感度",
            operator: ">=",
            value: "50",
            hidden: false,
          }),
        ],
      },
    ],
  },
];

function createContext(settingsStore) {
  const variables = new Map();
  const eventSubscribers = new Map();
  const actions = [];
  const actionHandlers = new Map();
  const shownUIs = [];
  const playedSounds = [];
  const openedVisualUIs = [];

  const resolveSettingKey = (key) =>
    settingsStore[key] !== undefined ? key : `${SETTINGS_SCOPE_ID}.${key}`;

  const fireEvent = (event) => {
    for (const handler of [...(eventSubscribers.get(event) ?? [])]) handler();
  };

  const context = {
    variables: {
      get: (key) => variables.get(key),
      set: (key, value) => {
        variables.set(key, value);
        fireEvent("variable:changed");
      },
      useValue: (key) => [variables.get(key), () => {}],
    },
    settings: {
      get: (key) => settingsStore[resolveSettingKey(key)],
      set: (key, value) => {
        settingsStore[key] = value;
      },
      snapshot: () => ({ ...settingsStore }),
      subscribe: () => () => {},
      useValue: (key) => [settingsStore[resolveSettingKey(key)], () => {}],
      cross: { get: () => undefined, set: () => {}, subscribe: () => () => {} },
    },
    story: {
      listChapters: () =>
        storyChapters.map(({ id, name }) => ({ id, name })),
      getChapter: async (id) =>
        storyChapters.find((chapter) => chapter.id === id) ?? null,
      getAllChapters: async () => storyChapters,
    },
    input: {
      registerAction: (action) => actions.push(action),
      onAction: (id, handler) => {
        actionHandlers.set(id, handler);
        return () => {};
      },
      bindShortcut: () => () => {},
    },
    ui: {
      show: (id, props, options) => {
        shownUIs.push({ id, props, options });
        return Promise.resolve();
      },
      hide: () => {},
      hideAll: () => {},
      isVisible: () => false,
    },
    system: {
      getBinding: () => "ui:@avg.internal.default-shell/title-screen",
      invoke: () => Promise.resolve(),
      close: () => Promise.resolve(),
      listSlots: () => [],
    },
    visualUI: {
      open: () =>
        Promise.resolve({
          name: "",
          get: () => null,
          close: () => {},
          onClose: () => () => {},
        }),
      attach: () => null,
      onBeforeOpen: () => () => {},
      onOpen: (name) => {
        openedVisualUIs.push(name);
        return () => {};
      },
    },
    asset: { resolve: (uri) => ({ url: `asset://${uri}` }) },
    sound: { play: (...args) => playedSounds.push(args) },
    history: {
      entries: () => historyEntries,
      choices: () => ({}),
      ifResults: () => ({}),
      inputs: () => ({}),
      useSnapshot: () => ({ entries: historyEntries, choices: {}, ifResults: {}, inputs: {} }),
    },
    config: { get: () => 100 },
    extensionResource: { url: (p) => `extension://${p}` },
    getHost: () => ({ mode: "engine" }),
    subscribe: (event, handler) => {
      const list = eventSubscribers.get(event) ?? [];
      list.push(handler);
      eventSubscribers.set(event, list);
      return () => {};
    },
  };

  return {
    context,
    variables,
    actions,
    actionHandlers,
    shownUIs,
    playedSounds,
    openedVisualUIs,
    fireVariableChanged: () => fireEvent("variable:changed"),
  };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// 打包并加载
// ---------------------------------------------------------------------------

await build({
  entryPoints: [path.join(root, "src", "index.tsx")],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  jsx: "automatic",
  alias: { "@avg-studio/sdk": path.join(root, "scripts", "sdk-mock.mjs") },
  external: ["react", "react-dom", "react/jsx-runtime", "react-dom/server"],
  logLevel: "silent",
});

const module = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
const ExtensionClass = module.default;
const OverlayClass = module.AchievementOverlayExtension;

assert.equal(ExtensionClass.meta.id, "achievement-system", "模块 id");
assert.equal(OverlayClass.meta.id, "achievement-overlay", "浮层模块 id");
assert.ok(ExtensionClass.settings, "声明了 settings");
assert.ok(ExtensionClass.saveSchema.unlocked, "声明了 unlocked 存档字段");
assert.equal(typeof ExtensionClass.triggerAchievement.run, "function", "触发成就方法");
assert.equal(typeof ExtensionClass.registerAchievement.run, "function", "注册全局成就方法");
assert.equal(typeof ExtensionClass.checkAchievement.run, "function", "检查成就方法");
assert.equal(typeof ExtensionClass.prototype.render, "function", "成就页面 render");
assert.equal(typeof OverlayClass.prototype.render, "function", "成就浮层 render");

// ---------------------------------------------------------------------------
// onRegister + 剧本扫描 + 全局条件解锁
// ---------------------------------------------------------------------------

const settingsStore = {
  [`${SETTINGS_SCOPE_ID}.defaultDuration`]: 600,
  [`${SETTINGS_SCOPE_ID}.soundVolume`]: 100,
  [`${SETTINGS_SCOPE_ID}.accentColor`]: "#ffd76a",
  [`${SETTINGS_SCOPE_ID}.revealHiddenOnUnlock`]: true,
  [`${SETTINGS_SCOPE_ID}.titleScreenButton`]: true,
  [`${SETTINGS_SCOPE_ID}.showFloatingButton`]: false,
};

const harness = createContext(settingsStore);
const ctx = harness.context;

ExtensionClass.onRegister(ctx);
await wait(30);

assert.ok(
  harness.actions.some((action) => action.id === "user.achievement-system.open-achievements"),
  "注册了打开成就的输入动作",
);
assert.ok(harness.actionHandlers.has("user.achievement-system.open-achievements"), "订阅了输入动作");
assert.ok(
  harness.shownUIs.some(
    (entry) =>
      entry.id === "achievement-overlay" &&
      entry.options?.pointerEventsPassthrough === true,
  ),
  "以指针穿透方式打开成就浮层",
);
assert.ok(
  harness.openedVisualUIs.includes("@avg.internal.default-shell/title-screen"),
  "监听了标题界面",
);

ctx.variables.set("好感度", 30);
harness.fireVariableChanged();
await wait(150);
assert.equal(
  ctx.variables.get("user.achievement-system.unlocked"),
  undefined,
  "条件未满足时不解锁",
);

ctx.variables.set("好感度", 60);
harness.fireVariableChanged();
await wait(200);
const unlocked = ctx.variables.get("user.achievement-system.unlocked");
assert.equal(Array.isArray(unlocked) && unlocked.length, 1, "条件满足后解锁一条");
assert.equal(unlocked[0].key, "affection-50", "解锁的是正确的成就");

// ---------------------------------------------------------------------------
// 卡片触发 + 时间轴回退 + 查询
// ---------------------------------------------------------------------------

// 模拟游戏推进到第 3 条历史记录
historyEntries.push("line-1", "line-2", "line-3");

ExtensionClass.triggerAchievement.run(ctx, {
  key: "card-only",
  name: "卡片成就",
  description: "由卡片现场定义",
  icon: "",
  hidden: true,
  duration: 300,
  sound: "",
});
const unlockedAfterCard = ctx.variables.get("user.achievement-system.unlocked");
assert.equal(unlockedAfterCard.length, 2, "卡片触发后共两条解锁记录");
assert.equal(unlockedAfterCard[1].h, 3, "解锁记录带有时间轴位置");

assert.equal(
  ExtensionClass.checkAchievement.run(ctx, { key: "card-only" }),
  true,
  "查询已解锁成就返回 true",
);
assert.equal(
  ExtensionClass.checkAchievement.run(ctx, { key: "not-exist" }),
  false,
  "查询未解锁成就返回 false",
);

// 时间轴回退到第 1 条历史：该成就回到未解锁状态
historyEntries.length = 1;
assert.equal(
  ExtensionClass.checkAchievement.run(ctx, { key: "card-only" }),
  false,
  "时间轴回退后成就重新变为未解锁",
);
assert.equal(
  ExtensionClass.checkAchievement.run(ctx, { key: "affection-50" }),
  true,
  "更早解锁的成就仍然保持解锁",
);

// 回退后再次播放到触发卡片：按新位置重写，不重复记录
ExtensionClass.triggerAchievement.run(ctx, {
  key: "card-only",
  name: "卡片成就",
  description: "由卡片现场定义",
  icon: "",
  hidden: true,
  duration: 300,
  sound: "",
});
assert.equal(
  ctx.variables.get("user.achievement-system.unlocked").length,
  2,
  "回退后再次触发不重复记录",
);
assert.equal(
  ExtensionClass.checkAchievement.run(ctx, { key: "card-only" }),
  true,
  "按新位置重新解锁",
);

// 时间轴前进到第 5 条：仍然解锁，重复触发不新增
historyEntries.push("line-4", "line-5", "line-6", "line-7");
assert.equal(
  ExtensionClass.checkAchievement.run(ctx, { key: "card-only" }),
  true,
  "时间轴前进后保持解锁",
);
ExtensionClass.triggerAchievement.run(ctx, {
  key: "card-only",
  name: "卡片成就",
  description: "由卡片现场定义",
  icon: "",
  hidden: true,
  duration: 300,
  sound: "",
});
assert.equal(
  ctx.variables.get("user.achievement-system.unlocked").length,
  2,
  "重复触发不重复记录",
);

// 引用剧本里扫描到的成就（卡片只填 ID）
ExtensionClass.triggerAchievement.run(ctx, {
  key: "secret-ending",
  name: "",
  description: "",
  icon: "",
  hidden: false,
  duration: 0,
  sound: "",
});
assert.equal(
  ctx.variables.get("user.achievement-system.unlocked").length,
  3,
  "引用剧本成就也能解锁",
);

// 回退到第 2 条：晚解锁的成就锁定，早解锁的保持
historyEntries.length = 2;
assert.equal(
  ExtensionClass.checkAchievement.run(ctx, { key: "secret-ending" }),
  false,
  "回退后晚解锁的成就锁定",
);
assert.equal(
  ExtensionClass.checkAchievement.run(ctx, { key: "card-only" }),
  true,
  "回退后早解锁的成就保持",
);
historyEntries.push("line-3", "line-4", "line-5");

// 打开成就界面
await ExtensionClass.openAchievements.run(ctx);
assert.ok(
  harness.shownUIs.some((entry) => entry.id === "achievement-system"),
  "打开成就页面",
);

// ---------------------------------------------------------------------------
// 成就页面渲染（SSR 静态渲染，检查条目来源、排序与隐藏遮罩）
// ---------------------------------------------------------------------------

globalThis.__achievementSmokeContext = ctx;
const instance = new ExtensionClass();
const { component: Panel } = instance.render();
const html = renderToStaticMarkup(React.createElement(Panel));

assert.ok(html.includes("成就"), "页面标题");
assert.ok(html.includes("羁绊"), "显示剧本扫描到的全局成就");
assert.ok(html.includes("卡片成就"), "显示剧本扫描到的卡片成就");
assert.ok(html.includes("隐藏成就名"), "隐藏成就显示名称");
assert.ok(html.includes("？？？？"), "隐藏未解锁成就的介绍被替换为问号");
assert.ok(!html.includes("秘密描述"), "隐藏未解锁成就的介绍不泄露");
assert.ok(html.includes("已解锁 3 / 4"), "进度统计正确");

const indexUnlocked = html.indexOf("羁绊");
const indexHidden = html.indexOf("隐藏成就名");
assert.ok(
  indexUnlocked >= 0 && indexUnlocked < indexHidden,
  "已解锁成就排在隐藏未解锁成就之前",
);

console.log("Smoke test passed: overlay / story scan / global unlock / card trigger / panel.");
