/**
 * 成就浮层：渲染在游戏 UI 层里的常驻程序界面。
 *
 *   - 解锁横幅：左上角圆角矩形向下弹出，停留后收回（音效由数据层播放）；
 *   - 可选悬浮入口按钮：默认关闭，可在扩展设置里开启（位置 / 文案可配）。
 *
 * 浮层按设计画布（1920×1080）尺寸渲染并整体缩放，视觉大小与游戏画面协调；
 * 根节点 pointer-events: none，只有入口按钮显式开启 pointer-events。
 */

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useExtensionContext } from "@avg-studio/sdk";
import { MODULE_ID } from "./store";
import {
  finishToast,
  getSuppressed,
  getToast,
  subscribeSuppressed,
  subscribeToast,
  type ToastItem,
} from "./toast";
import { useAchievementSetting } from "./use-setting";
import { DESIGN_CANVAS, useDesignScale } from "./use-design-scale";

const TrophyIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 56,
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke={color}
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4.5A1.5 1.5 0 0 0 3 7.5 3.5 3.5 0 0 0 6.5 11H7" />
    <path d="M17 6h2.5A1.5 1.5 0 0 1 21 7.5 3.5 3.5 0 0 1 17.5 11H17" />
  </svg>
);

const ToastBanner: React.FC<{ item: ToastItem }> = ({ item }) => {
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

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        maxWidth: 1120,
        pointerEvents: "none",
        transform: shown ? "translateY(0)" : "translateY(-160%)",
        opacity: shown ? 1 : 0,
        transition:
          "transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          minWidth: 680,
          padding: "28px 46px 28px 28px",
          borderRadius: 34,
          background:
            "linear-gradient(135deg, rgba(28,30,44,0.97), rgba(14,16,24,0.97))",
          border: `2px solid ${item.accent}66`,
          boxShadow:
            "0 28px 72px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.04)",
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            flex: "0 0 auto",
            borderRadius: 30,
            overflow: "hidden",
            background: "rgba(255,255,255,0.06)",
            border: "2px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item.iconUrl && !iconFailed ? (
            <img
              src={item.iconUrl}
              alt=""
              onError={() => setIconFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <TrophyIcon color={item.accent} />
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 26,
              letterSpacing: 6,
              color: item.accent,
            }}
          >
            成就解锁
          </span>
          <span
            style={{
              fontSize: 44,
              fontWeight: 600,
              color: "#f6f8ff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.name}
          </span>
        </div>
      </div>
    </div>
  );
};

const BUTTON_POSITIONS: Record<string, React.CSSProperties> = {
  "top-right": { top: 24, right: 24 },
  "top-left": { top: 24, left: 24 },
  "bottom-right": { bottom: 24, right: 24 },
  "bottom-left": { bottom: 24, left: 24 },
};

export const AchievementOverlay: React.FC = () => {
  const ctx = useExtensionContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const scale = useDesignScale(rootRef);

  const toast = useSyncExternalStore(subscribeToast, getToast, getToast);
  const suppressed = useSyncExternalStore(
    subscribeSuppressed,
    getSuppressed,
    getSuppressed,
  );
  const showButton =
    useAchievementSetting<boolean>(ctx, "showFloatingButton") ?? false;
  const position =
    useAchievementSetting<string>(ctx, "buttonPosition") ?? "top-right";
  const label = useAchievementSetting<string>(ctx, "buttonLabel") ?? "成就";
  const accent =
    useAchievementSetting<string>(ctx, "accentColor") ?? "#ffd76a";

  const open = () => {
    void ctx.ui.show(MODULE_ID, undefined, {
      modal: true,
      size: "(100%, 100%)",
      position: "(0, 0)",
      interactable: true,
    });
  };

  return (
    <div
      ref={rootRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: DESIGN_CANVAS.width,
          height: DESIGN_CANVAS.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        {toast && <ToastBanner key={toast.id} item={toast} />}

        {showButton && !suppressed && (
          <button
            type="button"
            onClick={open}
            style={{
              position: "absolute",
              ...(BUTTON_POSITIONS[position] ?? BUTTON_POSITIONS["top-right"]),
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
              boxShadow: "0 12px 36px rgba(0,0,0,0.35)",
            }}
          >
            <span style={{ display: "inline-flex", color: accent }}>
              <TrophyIcon color={accent} size={34} />
            </span>
            <span>{label}</span>
          </button>
        )}
      </div>
    </div>
  );
};
