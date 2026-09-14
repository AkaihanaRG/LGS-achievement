/**
 * 在原生标题画面的「鉴赏」与「设置」之间插入「成就」按钮。
 *
 * 标题画面是默认游戏壳的可视化界面，扩展无法改写它的 JSON，也不含
 * 元素引用名，因此这里在标题界面打开后做一次 DOM 增强：
 *   1. 找到同时包含「鉴赏」「设置」等菜单文案的最小容器（标题画面根）；
 *   2. 克隆「鉴赏」行作为「成就」行，插到「设置」行前面，并把行内文字
 *      换成「成就」；
 *   3. 把「设置」及其下方的行整体下移一个行距，克隆编号并重新编号；
 *   4. 标题界面关闭时还原。
 *
 * 全过程容错：找不到结构就什么都不做，不影响标题画面本身。
 */

import { INTERNAL_SYSTEM_SLOT, type ExtensionContext } from "@avg-studio/sdk";
import { getSetting } from "./settings-access";

const DEFAULT_TITLE_UI = "@avg.internal.default-shell/title-screen";
const MENU_TEXTS = ["开始游戏", "新游戏", "读取存档", "鉴赏", "设置", "退出"] as const;
const GALLERY_TEXT = "鉴赏";
const SETTINGS_TEXT = "设置";
const NEW_LABEL = "成就";
const MARK = "data-achievement-title-entry";

interface ShiftRecord {
  element: HTMLElement;
  marginTop: string;
  top: string;
}

interface TextRecord {
  element: HTMLElement;
  text: string;
}

interface Injection {
  inserted: HTMLElement[];
  shifted: ShiftRecord[];
  renamed: TextRecord[];
}

function compactText(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, "").trim();
}

function replaceLeafText(element: HTMLElement, text: string): void {
  const leaf = Array.from(element.querySelectorAll<HTMLElement>("*")).find(
    (child) => child.children.length === 0 && compactText(child).length > 0,
  );
  if (leaf) {
    leaf.textContent = text;
    return;
  }
  element.textContent = text;
}

/** 找到标题画面根：同时包含「鉴赏」「设置」，且命中最多个菜单文案的最小容器。 */
function findTitleRoot(): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestLength = Number.POSITIVE_INFINITY;

  for (const element of Array.from(
    document.body.querySelectorAll<HTMLElement>("*"),
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

/** 在根容器内按文字找菜单行（该文字所在的最上层子元素）。 */
function findRowByText(root: HTMLElement, text: string): HTMLElement | null {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
    (element) => compactText(element) === text,
  );
  if (candidates.length === 0) return null;

  let node: HTMLElement = candidates[0]!;
  while (node.parentElement && node.parentElement !== root) {
    node = node.parentElement;
  }
  return node;
}

function isNumberRow(element: HTMLElement): boolean {
  return /^\d{1,2}$/.test(compactText(element));
}

function findNumberRowNear(
  root: HTMLElement,
  row: HTMLElement,
): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (!isNumberRow(child)) continue;
    const distance = Math.abs(child.offsetTop - row.offsetTop);
    if (distance < bestDistance && distance <= 80) {
      best = child;
      bestDistance = distance;
    }
  }
  return best;
}

function cleanup(state: Injection): void {
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

function inject(onOpen: () => void): (() => void) | null {
  const root = findTitleRoot();
  if (!root || root.querySelector(`[${MARK}]`)) return null;

  // 标题画面已经带有「成就」按钮（例如项目副本里手改/补丁加的）就不重复插入。
  const existing = (Array.from(root.children) as HTMLElement[]).some(
    (child) => compactText(child) === NEW_LABEL,
  );
  if (existing) return null;

  const galleryRow = findRowByText(root, GALLERY_TEXT);
  const settingsRow = findRowByText(root, SETTINGS_TEXT);
  if (!galleryRow || !settingsRow) return null;
  if (galleryRow.parentElement !== root || settingsRow.parentElement !== root) {
    return null;
  }

  const layoutPitch = settingsRow.offsetTop - galleryRow.offsetTop;
  const rectPitch =
    settingsRow.getBoundingClientRect().top - galleryRow.getBoundingClientRect().top;
  const pitch = layoutPitch > 1 ? layoutPitch : rectPitch;
  if (!(pitch > 1)) return null;

  const state: Injection = { inserted: [], shifted: [], renamed: [] };

  const shiftElement = (element: HTMLElement, amount: number) => {
    state.shifted.push({
      element,
      marginTop: element.style.marginTop,
      top: element.style.top,
    });
    const computedTop = parseFloat(getComputedStyle(element).top);
    if (Number.isFinite(computedTop)) {
      element.style.top = `${computedTop + amount}px`;
    } else {
      const margin = parseFloat(getComputedStyle(element).marginTop) || 0;
      element.style.marginTop = `${margin + amount}px`;
    }
  };

  // 1. 克隆「鉴赏」行 → 「成就」行
  const clone = galleryRow.cloneNode(true) as HTMLElement;
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

  // 2. 先移动「设置」行验证布局可移动，不可移动则整体回退
  const originalSettingsTop = settingsRow.offsetTop;
  const beforeTop = settingsRow.getBoundingClientRect().top;
  shiftElement(settingsRow, pitch);
  const moved = settingsRow.getBoundingClientRect().top - beforeTop;
  if (moved < rectPitch * 0.5) {
    cleanup(state);
    return null;
  }

  // 3. 克隆编号行并放到成就行位置
  const galleryNumber = findNumberRowNear(root, galleryRow);
  if (galleryNumber) {
    const numberClone = galleryNumber.cloneNode(true) as HTMLElement;
    numberClone.removeAttribute("id");
    numberClone.setAttribute(MARK, "true");
    replaceLeafText(numberClone, "04");
    root.insertBefore(numberClone, galleryNumber.nextSibling);
    state.inserted.push(numberClone);
    shiftElement(numberClone, pitch);
  }

  // 4. 「设置」以下的行整体下移（用移动前的原始位置比较）
  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (child === settingsRow || child === clone || state.inserted.includes(child)) {
      continue;
    }
    if (child.offsetTop >= originalSettingsTop - 1) {
      shiftElement(child, pitch);
    }
  }

  // 5. 克隆的成就行移动到「设置」原来的位置
  shiftElement(clone, pitch);

  // 6. 重新编号（按纵向位置排序，01、02、03…）
  const numberRows = (Array.from(root.children) as HTMLElement[])
    .filter((child) => isNumberRow(child))
    .sort((a, b) => a.offsetTop - b.offsetTop);
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

interface MenuBinding {
  /** 系统插槽 id。 */
  slot: string;
  /** 设置项 key，关闭后不绑定入口。 */
  settingKey: string;
  /** 扩展自带的界面（可选，供未绑定系统插槽的项目直接引用）。 */
  ownUI?: string;
  /** 是否允许 DOM 兜底（默认标题画面没有 refId 按钮时使用）。 */
  domFallback: boolean;
}

const MENU_BINDINGS: MenuBinding[] = [
  {
    slot: INTERNAL_SYSTEM_SLOT.Title,
    settingKey: "titleScreenButton",
    ownUI: "@user.achievement-system/title-screen",
    domFallback: true,
  },
  {
    slot: INTERNAL_SYSTEM_SLOT.Settings,
    settingKey: "settingsScreenButton",
    ownUI: "@user.achievement-system/settings-screen",
    domFallback: false,
  },
];

/**
 * 监听标题 / 设置界面的打开事件：
 * 界面里带 `achievement-entry` 引用名的按钮会自动绑定为打开成就页面；
 * 原生标题画面没有引用名时走 DOM 兜底插入。
 *
 * 回调会带上 `closeCurrent`：从系统设置打开成就页时，先关掉设置界面，
 * 避免成就页关闭后又退回设置页（需要关两次）。
 */
export function installMenuEntries(
  ctx: ExtensionContext,
  onOpen: (closeCurrent?: () => void) => void,
): void {
  for (const binding of MENU_BINDINGS) {
    const names = new Set<string>();
    try {
      const resolved = ctx.system.getBinding(binding.slot);
      if (resolved) names.add(resolved.replace(/^ui:/, ""));
    } catch {
      // 旧宿主可能没有 getBinding。
    }
    if (binding.ownUI) names.add(binding.ownUI);
    if (binding.domFallback) names.add(DEFAULT_TITLE_UI);

    for (const name of names) {
      try {
        ctx.visualUI.onOpen(name, (view) => {
          if (getSetting<boolean>(ctx, binding.settingKey) === false) return;

          // 优先使用界面里带引用名（refId）的成就按钮。
          try {
            const entry = view.get("achievement-entry");
            if (entry) {
              entry.on("click", () => {
                const closeCurrent =
                  binding.slot === INTERNAL_SYSTEM_SLOT.Settings
                    ? () => view.close()
                    : undefined;
                onOpen(closeCurrent);
              });
              return;
            }
          } catch {
            // 旧宿主不支持引用名时继续走 DOM 兜底。
          }

          if (!binding.domFallback) return;

          let dispose: (() => void) | null = null;
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
              dispose?.();
            } catch {
              // 忽略清理异常。
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
