import test from "node:test";
import assert from "node:assert/strict";
import { evaluateExpression } from "./expression";

function check(
  expression: string,
  variables: Record<string, unknown>,
  expected: boolean,
): void {
  assert.equal(
    evaluateExpression(expression, (name) => variables[name]),
    expected,
    `表达式 "${expression}" 期望 ${expected}`,
  );
}

test("数字比较", () => {
  check("var(\"affection\") >= 50", { affection: 60 }, true);
  check("var(\"affection\") >= 50", { affection: 40 }, false);
  check("var(\"affection\") > 50", { affection: 50 }, false);
  check("var(\"affection\") < 50", { affection: 49.5 }, true);
});

test("数字字符串按数字比较", () => {
  check("var(\"affection\") >= 50", { affection: "60" }, true);
  check("var(\"affection\") == 50", { affection: "50" }, true);
  check("var(\"affection\") != 50", { affection: "50.0" }, false);
});

test("中文变量名", () => {
  check("好感度 > 10", { 好感度: 12 }, true);
  check("好感度 <= 10", { 好感度: 12 }, false);
});

test("逻辑运算与优先级", () => {
  const vars = { a: 5, b: "yuki", c: true };
  check("a > 1 && b == \"yuki\"", vars, true);
  check("a > 10 || b == \"yuki\"", vars, true);
  check("a > 10 || b == \"akira\"", vars, false);
  check("!(a > 10) && c", vars, true);
  check("1 + 2 * 3 == 7", {}, true);
  check("(1 + 2) * 3 == 9", {}, true);
});

test("has / len / var 函数", () => {
  const vars = { flag: false, name: "yuki" };
  check("has(\"flag\")", vars, true);
  check("has(\"missing\")", vars, false);
  check("len(\"name\") == 4", vars, true);
  check("var(\"user.ext.value\") == 1", { "user.ext.value": 1 }, true);
  check("has(\"user.ext.value\")", { "user.ext.value": 1 }, true);
});

test("未定义变量不参与比较（避免误触发）", () => {
  check("missing > 0", {}, false);
  check("missing == null", {}, false);
  check("missing != 5", {}, false);
  check("missing == 0", {}, false);
  check("missing", {}, false);
  check("has(\"missing\") == false", {}, true);
});

test("布尔与文本", () => {
  check("flag == true", { flag: true }, true);
  check("flag == \"true\"", { flag: true }, true);
  check("route == \"yuki\"", { route: "yuki" }, true);
  check("route != 'akira'", { route: "yuki" }, true);
});

test("非法表达式安全返回 false", () => {
  check("1 +", {}, false);
  check("a && (b", {}, false);
  check("", {}, false);
  check("eval('x')", {}, false);
  check("unknownFunc(1)", {}, false);
});
