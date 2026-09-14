/**
 * 成就条件表达式求值器。
 *
 * 不依赖 eval / Function，纯手写词法 + 递归下降解析，保证安全。
 *
 * 支持：
 *   - 字面量：数字、单/双引号字符串、true / false / null
 *   - 变量：直接写变量名（支持中文、点号，如 `好感度`、`char.attr`）
 *   - 函数：var("变量名") 取变量值（变量名含 `-` 等特殊字符时用它）、
 *           has("变量名") 判断变量是否存在、len(x) 取字符串/数组长度
 *   - 运算：! - + * / %、> >= < <= == != === !==、&& ||、括号
 *   - 数值字符串（如 "50"）会自动按数字比较，兼容剧本变量以字符串存储的情况
 *
 * 解析失败或求值异常时返回 false 并输出一条警告，不会中断游戏。
 */

export type ExpressionResolver = (name: string) => unknown;

type TokenType = "number" | "string" | "identifier" | "operator" | "paren" | "comma";

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

type Node =
  | { kind: "literal"; value: unknown }
  | { kind: "variable"; name: string }
  | { kind: "unary"; op: string; arg: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "call"; name: string; args: Node[] };

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
  "%",
] as const;

const astCache = new Map<string, Node | null>();

function isIdentifierChar(ch: string): boolean {
  return !/[\s()!<>=&|+\-*/%'",]/.test(ch);
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i]!;

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
        const current = input[j]!;
        if (current === "\\" && j + 1 < input.length) {
          text += input[j + 1];
          j += 2;
          continue;
        }
        if (current === quote) {
          closed = true;
          j += 1;
          break;
        }
        text += current;
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
      while (j < input.length && /[0-9]/.test(input[j]!)) j += 1;
      if (input[j] === "." && /[0-9]/.test(input[j + 1] ?? "")) {
        j += 1;
        while (j < input.length && /[0-9]/.test(input[j]!)) j += 1;
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
      while (j < input.length && isIdentifierChar(input[j]!)) j += 1;
      tokens.push({ type: "identifier", value: input.slice(i, j), pos: i });
      i = j;
      continue;
    }

    throw new Error(`无法识别的字符 "${ch}"（位置 ${i}）`);
  }

  return tokens;
}

class Parser {
  private readonly tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Node {
    if (this.tokens.length === 0) {
      throw new Error("表达式为空");
    }
    const node = this.parseOr();
    if (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos]!;
      throw new Error(`多余的内容 "${token.value}"（位置 ${token.pos}）`);
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consumeOperator(...values: string[]): string | null {
    const token = this.peek();
    if (token && token.type === "operator" && values.includes(token.value)) {
      this.pos += 1;
      return token.value;
    }
    return null;
  }

  private consumeParen(value: "(" | ")"): boolean {
    const token = this.peek();
    if (token && token.type === "paren" && token.value === value) {
      this.pos += 1;
      return true;
    }
    return false;
  }

  private parseOr(): Node {
    let left = this.parseAnd();
    let op = this.consumeOperator("||");
    while (op) {
      const right = this.parseAnd();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator("||");
    }
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseEquality();
    let op = this.consumeOperator("&&");
    while (op) {
      const right = this.parseEquality();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator("&&");
    }
    return left;
  }

  private parseEquality(): Node {
    let left = this.parseComparison();
    let op = this.consumeOperator("==", "!=", "===", "!==");
    while (op) {
      const right = this.parseComparison();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator("==", "!=", "===", "!==");
    }
    return left;
  }

  private parseComparison(): Node {
    let left = this.parseAdditive();
    let op = this.consumeOperator(">", ">=", "<", "<=");
    while (op) {
      const right = this.parseAdditive();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator(">", ">=", "<", "<=");
    }
    return left;
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative();
    let op = this.consumeOperator("+", "-");
    while (op) {
      const right = this.parseMultiplicative();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator("+", "-");
    }
    return left;
  }

  private parseMultiplicative(): Node {
    let left = this.parseUnary();
    let op = this.consumeOperator("*", "/", "%");
    while (op) {
      const right = this.parseUnary();
      left = { kind: "binary", op, left, right };
      op = this.consumeOperator("*", "/", "%");
    }
    return left;
  }

  private parseUnary(): Node {
    const op = this.consumeOperator("!", "-");
    if (op) {
      return { kind: "unary", op, arg: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
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
        const args: Node[] = [];
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

  private consumeComma(): boolean {
    const token = this.peek();
    if (token && token.type === "comma") {
      this.pos += 1;
      return true;
    }
    return false;
  }
}

function isNumericLike(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 && !Number.isNaN(Number(text));
  }
  return false;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  return Number(value);
}

export function isTruthy(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return false;
  if (typeof value === "number") return value !== 0 && !Number.isNaN(value);
  if (typeof value === "string") return value.length > 0;
  return true;
}

function looseEquals(left: unknown, right: unknown): boolean {
  // 变量不存在（undefined）时不参与相等/不等判断：条件一律视为不满足。
  // 需要判断“变量是否存在”请使用 has("变量名")。
  if (left === undefined || right === undefined) return false;
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

function relational(op: string, left: unknown, right: unknown): boolean {
  if (left === undefined || left === null || right === undefined || right === null) {
    return false;
  }
  if (isNumericLike(left) && isNumericLike(right)) {
    const a = toNumber(left);
    const b = toNumber(right);
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

function argumentName(node: Node | undefined): string | null {
  if (!node) return null;
  if (node.kind === "literal" && typeof node.value === "string") return node.value;
  if (node.kind === "variable") return node.name;
  return null;
}

function evaluateNode(node: Node, resolve: ExpressionResolver): unknown {
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
          return value !== undefined && value !== null;
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
        return isTruthy(evaluateNode(node.left, resolve))
          ? isTruthy(evaluateNode(node.right, resolve))
          : false;
      }
      if (node.op === "||") {
        return isTruthy(evaluateNode(node.left, resolve))
          ? true
          : isTruthy(evaluateNode(node.right, resolve));
      }

      const left = evaluateNode(node.left, resolve);
      const right = evaluateNode(node.right, resolve);

      switch (node.op) {
        case "==":
        case "===":
          return looseEquals(left, right);
        case "!=":
        case "!==":
          // 变量不存在时不满足任何判断，!= 也视为不满足。
          if (left === undefined || right === undefined) return false;
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
      return undefined;
  }
}

function parseExpression(expression: string): Node | null {
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

/** 求值一个条件表达式；任何异常都按「条件不满足」处理。 */
export function evaluateExpression(
  expression: string,
  resolve: ExpressionResolver,
): boolean {
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
