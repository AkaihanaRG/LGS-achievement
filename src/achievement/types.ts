/**
 * 成就系统的数据契约。
 *
 * - AchievementDef：一条成就定义。既可能来自 Studio「扩展设置 → 成就列表」，
 *   也可能由「注册全局成就 / 触发成就」卡片在运行时注册。
 * - UnlockedRecord：一条解锁记录，写入 shared 存档（跨周目共享）。
 */

/** 简单条件可用的比较运算符。 */
export const ACHIEVEMENT_OPERATORS = [">=", ">", "<=", "<", "==", "!="] as const;

export type AchievementOperator = (typeof ACHIEVEMENT_OPERATORS)[number];

/** 触发方式：card = 卡片播放到该处直接解锁；global = 全局监听条件。 */
export type AchievementMode = "card" | "global";

export interface AchievementDef {
  /** 稳定唯一 ID，卡片引用与解锁记录都用它。 */
  key: string;
  /** 成就名称（显示在横幅与成就页面）。 */
  name: string;
  /** 成就介绍。 */
  description: string;
  /** 成就图标（项目素材 URI，可为空）。 */
  icon: string;
  /** 隐藏成就：未解锁前图标显示为大问号、介绍全部替换为问号，并永远排在列表最下方。 */
  hidden: boolean;
  /** 触发方式。 */
  mode: AchievementMode;
  /** 简单条件：判断变量名（可为空）。 */
  variable: string;
  /** 简单条件：比较方式。 */
  operator: AchievementOperator;
  /** 简单条件：比较值（数字原样比较；true/false 按布尔；其余按文本）。 */
  value: string;
  /** 高级条件表达式（非空时优先于简单条件）。 */
  condition: string;
  /** 横幅停留时长（ms）；0 = 使用全局默认值。 */
  duration: number;
  /** 该成就专属音效（项目素材 URI，可为空 = 使用扩展内置音效）。 */
  sound: string;
}

export interface UnlockedRecord {
  key: string;
  /** 解锁时间（epoch ms），用于列表排序展示。 */
  at: number;
  /**
   * 解锁时的历史记录条数（游戏内时间轴位置）。
   * 回退时间轴后，历史条数变少，h 大于当前位置的成就视为未解锁；
   * 再次播放到触发卡片时会用新的位置重写。
   */
  h?: number;
}

export const OPERATOR_OPTIONS: Array<{ label: string; value: AchievementOperator }> = [
  { label: "大于等于 (>=)", value: ">=" },
  { label: "大于 (>)", value: ">" },
  { label: "小于等于 (<=)", value: "<=" },
  { label: "小于 (<)", value: "<" },
  { label: "等于 (==)", value: "==" },
  { label: "不等于 (!=)", value: "!=" },
];
