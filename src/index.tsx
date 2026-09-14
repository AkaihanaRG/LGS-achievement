/**
 * 成就系统扩展入口。
 *
 * 两种触发方式：
 *   1. 全局条件成就：在「扩展设置 → 成就列表」里配置触发方式为「全局条件」，
 *      或用剧本「注册全局成就」卡片注册；引擎自动监听变量并判断条件。
 *   2. 剧情触发成就：剧本「触发成就」卡片，播放到该处立即解锁。
 *
 * 解锁时由成就浮层（游戏 UI 层）在左上角弹出圆角横幅并播放音效，
 * 统一记录进成就页面；页面可通过标题画面的「成就」按钮、悬浮按钮、
 * 快捷键（默认 J）或剧本「打开成就界面」卡片进入。
 *
 * 卡片里新定义的成就会写回「扩展设置 → 成就列表」（Studio 持久化），
 * 因此在个性化扩展配置里可以直接看到和管理。
 */

import {
  Extension,
  extension,
  defineSave,
  method,
  settings,
  type ExtensionContext,
  type ExtensionProps,
  type ExtensionRenderData,
} from "@avg-studio/sdk";
import { AchievementPanel } from "./achievement/panel";
import { AchievementOverlay } from "./achievement/overlay";
import {
  collectGlobalDefinitions,
  effectiveCondition,
  normalizeDefinition,
} from "./achievement/definitions";
import { evaluateExpression } from "./achievement/expression";
import {
  getStoryDefs,
  scanStoryAchievements,
} from "./achievement/story-defs";
import { installMenuEntries } from "./achievement/title-screen-button";
import {
  EXTENSION_ID,
  MODULE_ID,
  OVERLAY_ID,
  isUnlocked,
  readRegistered,
  unlockAchievement,
  upsertRegistered,
  writeRegistered,
  writeUnlocked,
} from "./achievement/store";
import {
  ACHIEVEMENT_OPERATORS,
  OPERATOR_OPTIONS,
  type AchievementDef,
  type AchievementMode,
} from "./achievement/types";

const OPEN_ACTION_ID = `${EXTENSION_ID}.open-achievements`;

let evaluating = false;
let checkTimer: number | null = null;

/** 打开成就页面（模态，关闭后返回）。 */
function openAchievementPanel(ctx: ExtensionContext): void | Promise<void> {
  return ctx.ui.show(MODULE_ID, undefined, {
    modal: true,
    size: "(100%, 100%)",
    position: "(0, 0)",
    interactable: true,
  });
}

/**
 * 打开常驻成就浮层（横幅 + 可选入口按钮）。
 * 浮层根节点不接管指针，只有入口按钮可点击。
 */
function showOverlay(ctx: ExtensionContext, attempt = 0): void {
  try {
    const result = ctx.ui.show(OVERLAY_ID, undefined, {
      size: "(100%, 100%)",
      position: "(0, 0)",
      pointerEventsPassthrough: true,
    });
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch((error) => {
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

/**
 * 扫描所有全局条件成就，满足条件即解锁。
 * 变量变化后由 scheduleGlobalCheck 触发；也可由「刷新全局成就」卡片手动触发。
 */
function runGlobalCheck(ctx: ExtensionContext): number {
  if (evaluating) return 0;
  evaluating = true;
  try {
    const definitions = collectGlobalDefinitions([], [
      ...getStoryDefs(),
      ...readRegistered(ctx),
    ]);
    let unlockedCount = 0;
    for (const def of definitions) {
      const expression = effectiveCondition(def);
      if (!expression) continue;
      if (isUnlocked(ctx, def.key)) continue;
      const matched = evaluateExpression(expression, (name) =>
        ctx.variables.get(name),
      );
      if (!matched) continue;
      if (unlockAchievement(ctx, def)) unlockedCount += 1;
    }
    return unlockedCount;
  } finally {
    evaluating = false;
  }
}

/** 合并同一帧内的多次变量变化，避免重复扫描。 */
function scheduleGlobalCheck(ctx: ExtensionContext): void {
  if (checkTimer !== null) return;
  checkTimer = window.setTimeout(() => {
    checkTimer = null;
    runGlobalCheck(ctx);
  }, 50);
}

type CardParams = Record<string, unknown>;

function readString(params: CardParams, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function readNumber(params: CardParams, key: string): number {
  const value = Number(params[key]);
  return Number.isFinite(value) ? value : 0;
}

/**
 * 用卡片参数构造成就定义：
 *   - key 命中「成就列表」时以列表信息为底，卡片里填了的字段覆盖显示信息；
 *   - key 未命中时，卡片参数就是完整定义（随后会写回成就列表）。
 */
function buildCardDefinition(
  ctx: ExtensionContext,
  params: CardParams,
  mode: AchievementMode,
): AchievementDef | null {
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

  const base: Record<string, unknown> = existing
    ? { ...existing }
    : {
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
        condition: "",
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
  if ((ACHIEVEMENT_OPERATORS as readonly string[]).includes(operator)) {
    base.operator = operator;
  }

  return normalizeDefinition(base);
}

/**
 * 扫描不到定义时（例如剧本尚未加载完 / 运行时动态创建）的兜底：
 * 把定义放进运行时注册表，保证成就页面与全局判断仍能使用它。
 */
function registerRuntimeDefinition(
  ctx: ExtensionContext,
  def: AchievementDef,
): void {
  const known = getStoryDefs().some((item) => item.key === def.key);
  if (!known) upsertRegistered(ctx, def);
}

@extension({ id: MODULE_ID, label: "成就系统 v1.0.4" })
class AchievementSystemExtension extends Extension {
  /** 项目级配置：外观。成就定义来自剧本里的成就卡片。 */
  static settings = settings((s) => ({
    defaultDuration: s
      .number("默认横幅停留(ms)")
      .default(3000)
      .range(300, 60000)
      .step(100),
    soundVolume: s.number("成就音效音量(%)").default(100).range(0, 100).step(5),
    defaultSound: s
      .asset("默认成就音效")
      .accepts("audio")
      .describe("留空时使用扩展内置的成就音效；单个成就可以单独覆盖"),
    revealHiddenOnUnlock: s
      .boolean("隐藏成就解锁后揭示内容")
      .default(true)
      .describe("关闭后隐藏成就即使解锁也保持问号图标与问号介绍"),
    titleScreenButton: s
      .boolean("标题画面插入成就按钮")
      .default(true)
      .describe("在默认标题画面的「鉴赏」和「设置」之间插入「成就」入口"),
    settingsScreenButton: s
      .boolean("系统设置成就按钮生效")
      .default(true)
      .describe("绑定扩展自带的「系统设置（含成就）」后，右下角成就按钮可用"),
    showFloatingButton: s
      .boolean("显示常驻入口按钮")
      .default(false)
      .describe("在游戏画面角落常驻一个「成就」悬浮按钮"),
    buttonPosition: s
      .enum("常驻按钮位置", [
        "top-right",
        "top-left",
        "bottom-right",
        "bottom-left",
      ] as const)
      .labels({
        "top-right": "右上",
        "top-left": "左上",
        "bottom-right": "右下",
        "bottom-left": "左下",
      })
      .default("top-right")
      .enabledWhen("showFloatingButton"),
    buttonLabel: s
      .string("常驻按钮文字")
      .default("成就")
      .enabledWhen("showFloatingButton"),
    accentColor: s.color("主题强调色").default("#ffd76a"),
  }));

  /**
   * 成就数据跟随游戏内进度（slot）：
   * 新游戏 / 读早期档 / 时间轴回退都会回到对应位置的成就状态。
   */
  static saveSchema = defineSave({
    unlocked: {
      type: "list",
      persistence: "slot",
      default: [] as Array<{ key: string; at: number }>,
      label: "已解锁成就",
    },
    registered: {
      type: "list",
      persistence: "slot",
      default: [] as AchievementDef[],
      label: "运行时注册的成就定义",
    },
  });

  /** 启动期：浮层、剧本扫描、全局条件监听、快捷键、标题画面入口。 */
  static onRegister(ctx: ExtensionContext) {
    showOverlay(ctx);

    // 扫描剧本里的成就卡片，让成就页面与卡片数量一致；
    // 扫描完成后立即判断一次全局条件。
    void scanStoryAchievements(ctx).then(() => runGlobalCheck(ctx));

    ctx.subscribe("variable:changed", () => scheduleGlobalCheck(ctx));
    ctx.subscribe("archive:changed", () => scheduleGlobalCheck(ctx));
    window.setTimeout(() => runGlobalCheck(ctx), 1200);

    ctx.input.registerAction({
      id: OPEN_ACTION_ID,
      label: "打开成就界面",
      defaultKeys: ["KeyJ"],
    });
    ctx.input.onAction(OPEN_ACTION_ID, () => {
      void openAchievementPanel(ctx);
    });

    installMenuEntries(ctx, (closeCurrent) => {
      closeCurrent?.();
      void openAchievementPanel(ctx);
    });
  }

  /** 卡片：触发成就（剧情播放到这里立即解锁）。 */
  static triggerAchievement = method({
    id: "trigger-achievement",
    title: "触发成就",
    description:
      "剧情播放到这里立即解锁成就并弹出横幅。填写成就ID、名称、介绍和图标即可；同 ID 只记录一次，成就页面按剧本里的卡片自动收集。",
    schema: {
      key: {
        type: "string",
        label: "成就ID",
        required: true,
        suggestions: { key: "achievement-key" },
      },
      name: { type: "string", label: "成就名称（选填）" },
      description: {
        type: "string",
        label: "成就介绍（选填）",
        multiline: true,
      },
      icon: { type: "asset", label: "成就图标（选填）", assetType: "image" },
      hidden: { type: "boolean", label: "隐藏成就", default: false },
      duration: {
        type: "number",
        label: "横幅停留(ms)",
        default: 0,
        min: 0,
        max: 60000,
        step: 100,
        unit: "ms",
      },
      sound: { type: "asset", label: "成就音效（选填）", assetType: "audio" },
    },
    run(ctx, params) {
      try {
        const def = buildCardDefinition(ctx, params as CardParams, "card");
        if (!def) return;
        registerRuntimeDefinition(ctx, def);
        unlockAchievement(ctx, def);
      } catch (error) {
        console.error("[成就系统] 触发成就失败。", error);
      }
    },
  });

  /** 卡片：注册全局成就（用变量/表达式判断，满足时自动解锁）。 */
  static registerAchievement = method({
    id: "register-achievement",
    title: "注册全局成就",
    description:
      "注册一条全局条件成就：引擎启动时自动扫描该卡片并监听变量，满足条件时解锁。条件可用变量选择器，也可写高级表达式。",
    schema: {
      key: {
        type: "string",
        label: "成就ID",
        required: true,
        suggestions: { key: "achievement-key" },
      },
      name: { type: "string", label: "成就名称" },
      description: {
        type: "string",
        label: "成就介绍",
        multiline: true,
      },
      icon: { type: "asset", label: "成就图标", assetType: "image" },
      hidden: { type: "boolean", label: "隐藏成就", default: false },
      variable: { type: "variable", label: "判断变量（选填）" },
      operator: {
        type: "enum",
        label: "比较方式",
        default: ">=",
        options: OPERATOR_OPTIONS,
      },
      value: { type: "string", label: "比较值", default: "0" },
      condition: {
        type: "string",
        label: "高级条件表达式（选填，填写后优先）",
        multiline: true,
      },
      duration: {
        type: "number",
        label: "横幅停留(ms)",
        default: 0,
        min: 0,
        max: 60000,
        step: 100,
        unit: "ms",
      },
      sound: { type: "asset", label: "成就音效（选填）", assetType: "audio" },
    },
    run(ctx, params) {
      try {
        const def = buildCardDefinition(ctx, params as CardParams, "global");
        if (!def) return;
        if (!effectiveCondition(def)) {
          console.warn(
            `[成就系统] 成就「${def.key}」没有可用条件（判断变量和高级表达式都为空）。`,
          );
        }
        registerRuntimeDefinition(ctx, def);
        runGlobalCheck(ctx);
      } catch (error) {
        console.error("[成就系统] 注册全局成就失败。", error);
      }
    },
  });

  /** 卡片：刷新全局成就判断（条件依赖非变量状态时手动补一次）。 */
  static refreshAchievements = method({
    id: "refresh-achievements",
    title: "刷新全局成就",
    description: "立即重新判断一遍所有全局条件成就。",
    run(ctx) {
      try {
        runGlobalCheck(ctx);
      } catch (error) {
        console.error("[成就系统] 刷新全局成就失败。", error);
      }
    },
  });

  /** 卡片：清空成就数据（解锁记录 + 运行时注册的定义，用于测试）。 */
  static resetAchievements = method({
    id: "reset-achievements",
    title: "重置成就数据",
    description: "清空所有解锁记录与运行时注册的成就定义，用于测试。",
    run(ctx) {
      writeUnlocked(ctx, []);
      writeRegistered(ctx, []);
    },
  });

  /** 卡片：打开成就界面（可接到自定义标题画面的按钮上）。 */
  static openAchievements = method({
    id: "open-achievements",
    title: "打开成就界面",
    description: "打开成就页面，玩家关闭后剧情继续。",
    async run(ctx) {
      await openAchievementPanel(ctx);
    },
  });

  /** 卡片：检查成就是否已解锁（可在 If 条件里使用返回值）。 */
  static checkAchievement = method({
    id: "check-achievement",
    title: "检查成就是否已解锁",
    description: "返回该成就是否已经解锁，可用于 If 条件。",
    returns: { type: "boolean", label: "是否已解锁" },
    schema: {
      key: {
        type: "string",
        label: "成就ID",
        required: true,
        suggestions: { key: "achievement-key" },
      },
    },
    run(ctx, params) {
      return isUnlocked(ctx, params.key.trim());
    },
  });

  render(): ExtensionRenderData<ExtensionProps> {
    return { component: AchievementPanel, props: {} };
  }
}

/** 常驻浮层模块：解锁横幅 + 可选入口按钮（由主模块在启动时打开）。 */
@extension({ id: OVERLAY_ID, label: "成就浮层" })
class AchievementOverlayExtension extends Extension {
  render(): ExtensionRenderData<ExtensionProps> {
    return { component: AchievementOverlay, props: {} };
  }
}

export default AchievementSystemExtension;
export { AchievementSystemExtension, AchievementOverlayExtension };
