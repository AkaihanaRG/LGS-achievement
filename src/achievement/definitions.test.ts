import test from "node:test";
import assert from "node:assert/strict";
import {
  collectDisplayDefinitions,
  collectGlobalDefinitions,
  effectiveCondition,
  maskDescription,
  mergeDefinitions,
  normalizeDefinition,
  normalizeDefinitions,
  normalizeUnlocked,
  sortForDisplay,
} from "./definitions";
import type { AchievementDef } from "./types";

function makeDef(partial: Partial<AchievementDef> & { key: string }): AchievementDef {
  return normalizeDefinition(partial)!;
}

test("normalizeDefinition 填充默认值", () => {
  const def = normalizeDefinition({ key: " first-meet " });
  assert.ok(def);
  assert.equal(def!.key, "first-meet");
  assert.equal(def!.name, "first-meet");
  assert.equal(def!.mode, "card");
  assert.equal(def!.operator, ">=");
  assert.equal(def!.hidden, false);
  assert.equal(def!.duration, 0);
});

test("normalizeDefinition 拒绝空 key", () => {
  assert.equal(normalizeDefinition({ name: "没有ID" }), null);
  assert.equal(normalizeDefinition(null), null);
  assert.equal(normalizeDefinition("x"), null);
});

test("normalizeDefinitions 去重", () => {
  const defs = normalizeDefinitions([
    { key: "a", name: "A" },
    { key: "a", name: "A2" },
    { key: "b" },
    { name: "no-key" },
  ]);
  assert.deepEqual(
    defs.map((def) => def.key),
    ["a", "b"],
  );
});

test("normalizeDefinitions / normalizeUnlocked 兼容 JSON 字符串存储", () => {
  const defs = normalizeDefinitions(JSON.stringify([{ key: "a", name: "A" }]));
  assert.deepEqual(
    defs.map((def) => def.key),
    ["a"],
  );
  assert.deepEqual(normalizeDefinitions("{bad json"), []);

  const records = normalizeUnlocked(JSON.stringify([{ key: "a", at: 5 }]));
  assert.deepEqual(records, [{ key: "a", at: 5, h: 0 }]);
  assert.deepEqual(normalizeUnlocked("not-json"), []);
});

test("effectiveCondition 拼装简单条件", () => {
  const numeric = makeDef({ key: "a", variable: "affection", operator: ">=", value: "50" });
  assert.equal(effectiveCondition(numeric), 'var("affection") >= 50');

  const text = makeDef({ key: "b", variable: "route", operator: "==", value: "yuki" });
  assert.equal(effectiveCondition(text), 'var("route") == "yuki"');

  const boolean = makeDef({ key: "c", variable: "seen", operator: "==", value: "true" });
  assert.equal(effectiveCondition(boolean), 'var("seen") == true');

  const none = makeDef({ key: "d" });
  assert.equal(effectiveCondition(none), "");
});

test("effectiveCondition 高级表达式优先", () => {
  const def = makeDef({
    key: "a",
    variable: "affection",
    value: "50",
    condition: 'affection > 50 && route == "yuki"',
  });
  assert.equal(effectiveCondition(def), 'affection > 50 && route == "yuki"');
});

test("mergeDefinitions 按顺序合并，先出现的优先", () => {
  const first = [makeDef({ key: "a", name: "第一个A" })];
  const second = [
    makeDef({ key: "a", name: "第二个A" }),
    makeDef({ key: "b", name: "B" }),
  ];
  const merged = mergeDefinitions(first, second);
  assert.deepEqual(
    merged.map((def) => def.name),
    ["第一个A", "B"],
  );
});

test("collectGlobalDefinitions 卡片注册覆盖触发配置", () => {
  const library = [
    makeDef({ key: "a", name: "列表A", mode: "global", condition: "x > 1" }),
  ];
  const registered = [
    makeDef({ key: "a", name: "", mode: "global", condition: "x > 2" }),
  ];
  const merged = collectGlobalDefinitions(library, registered);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, "列表A");
  assert.equal(merged[0].condition, "x > 2");

  assert.equal(collectGlobalDefinitions([], [makeDef({ key: "b" })]).length, 0);
});

test("collectDisplayDefinitions 以剧本卡片为准", () => {
  const story = [
    makeDef({ key: "card-1", name: "卡片1", mode: "card" }),
    makeDef({ key: "global-1", name: "全局卡片", mode: "global" }),
  ];
  const registered = [
    makeDef({ key: "runtime", name: "运行时", mode: "card" }),
    makeDef({ key: "card-1", name: "重复", mode: "card" }),
  ];

  const display = collectDisplayDefinitions(story, registered, true);
  assert.deepEqual(
    display.map((def) => def.key),
    ["card-1", "global-1", "runtime"],
  );
  assert.equal(display.find((def) => def.key === "card-1")?.name, "卡片1");

  const fallback = collectDisplayDefinitions(story, registered, false);
  assert.deepEqual(
    fallback.map((def) => def.key),
    ["runtime", "card-1"],
  );
});

test("sortForDisplay 已解锁在上、隐藏成就永远最下", () => {
  const defs = [
    makeDef({ key: "locked" }),
    makeDef({ key: "hidden-locked", hidden: true }),
    makeDef({ key: "unlocked" }),
    makeDef({ key: "hidden-unlocked", hidden: true }),
  ];
  const unlockedAt = new Map<string, number>([
    ["unlocked", 100],
    ["hidden-unlocked", 200],
  ]);
  assert.deepEqual(
    sortForDisplay(defs, unlockedAt).map((def) => def.key),
    ["unlocked", "locked", "hidden-unlocked", "hidden-locked"],
  );
});

test("sortForDisplay 已解锁按时间倒序", () => {
  const defs = [makeDef({ key: "a" }), makeDef({ key: "b" })];
  const unlockedAt = new Map<string, number>([
    ["a", 100],
    ["b", 200],
  ]);
  assert.deepEqual(
    sortForDisplay(defs, unlockedAt).map((def) => def.key),
    ["b", "a"],
  );
});

test("maskDescription 每个非空白字符替换为问号", () => {
  assert.equal(maskDescription("击败Boss"), "？？？？？？");
  assert.equal(maskDescription("和 雪 相遇"), "？ ？ ？？");
  assert.equal(maskDescription(""), "");
});

test("normalizeUnlocked 过滤无效记录", () => {
  const records = normalizeUnlocked([
    { key: "a", at: 123 },
    { key: "a", at: 456 },
    { at: 1 },
    "bad",
  ]);
  assert.deepEqual(records, [{ key: "a", at: 123, h: 0 }]);
});
