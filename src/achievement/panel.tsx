/**
 * 成就页面 —— 类原生「鉴赏 / 存档」风格的全屏界面。
 *
 * 列表规则：
 *   - 条目 = 扩展设置里的成就 + 剧本成就卡片扫描到的成就，数量与卡片一致；
 *   - 已解锁的成就排在未解锁的上面；
 *   - 隐藏成就（无论是否解锁）永远排在列表最下方；
 *   - 未解锁的图标显示为灰色，隐藏且未解锁的显示为大问号，
 *     介绍文字逐字替换为问号。
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useExtensionContext, type ExtensionContext } from "@avg-studio/sdk";
import {
  collectDisplayDefinitions,
  maskDescription,
  normalizeDefinitions,
  normalizeUnlocked,
  sortForDisplay,
} from "./definitions";
import {
  areStoryDefsScanned,
  getStoryDefs,
  subscribeStoryDefs,
} from "./story-defs";
import { setOverlayButtonSuppressed } from "./toast";
import { useAchievementSetting } from "./use-setting";
import {
  MODULE_ID,
  REGISTERED_KEY,
  UNLOCKED_KEY,
  applyHistoryWindow,
} from "./store";
import { DESIGN_CANVAS, useDesignScale } from "./use-design-scale";
import type { AchievementDef } from "./types";

/** 订阅历史记录变化：时间轴回退后让页面重新按当前位置过滤。 */
function useHistoryRevision(ctx: ExtensionContext): number {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const unsubscribe = ctx.subscribe("history:changed", () => {
      setRevision((value) => value + 1);
    });
    return unsubscribe;
  }, [ctx]);
  return revision;
}

function safeResolveIcon(ctx: ExtensionContext, uri: string): string {
  if (!uri) return "";
  try {
    return ctx.asset.resolve(uri).url ?? "";
  } catch {
    return "";
  }
}

function formatTime(at: number): string {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

const TrophyIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 64,
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

interface AchievementCardProps {
  def: AchievementDef;
  unlockedAt: number | undefined;
  accent: string;
  ctx: ExtensionContext;
  revealHidden: boolean;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  def,
  unlockedAt,
  accent,
  ctx,
  revealHidden,
}) => {
  const [iconFailed, setIconFailed] = useState(false);
  const unlocked = unlockedAt !== undefined;
  const masked = def.hidden && (!unlocked || !revealHidden);
  const iconUrl = def.icon && !iconFailed ? safeResolveIcon(ctx, def.icon) : "";
  const description = masked ? maskDescription(def.description) : def.description;

  return (
    <div
      style={{
        display: "flex",
        gap: 32,
        padding: "28px 32px",
        borderRadius: 32,
        background: "rgba(26,29,42,0.86)",
        border: `2px solid ${unlocked ? `${accent}59` : "rgba(255,255,255,0.07)"}`,
        boxShadow: unlocked ? `0 0 48px ${accent}1f` : "none",
        opacity: unlocked ? 1 : 0.86,
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      <div
        style={{
          width: 132,
          height: 132,
          flex: "0 0 auto",
          borderRadius: 28,
          overflow: "hidden",
          background: "rgba(255,255,255,0.05)",
          border: `2px solid ${unlocked ? `${accent}40` : "rgba(255,255,255,0.08)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {masked ? (
          <span
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: "#767e92",
              lineHeight: 1,
              transform: "translateY(-4px)",
            }}
          >
            ？
          </span>
        ) : iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            onError={() => setIconFailed(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: unlocked ? "none" : "grayscale(1) brightness(0.72)",
              opacity: unlocked ? 1 : 0.55,
            }}
          />
        ) : (
          <TrophyIcon color={unlocked ? accent : "#6b7280"} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 34,
              fontWeight: 600,
              color: unlocked ? "#f4f6fb" : "#9aa2b4",
            }}
          >
            {def.name || def.key}
          </span>
          {unlocked && (
            <span
              style={{
                fontSize: 22,
                letterSpacing: 2,
                color: accent,
                border: `2px solid ${accent}66`,
                borderRadius: 999,
                padding: "2px 16px",
              }}
            >
              已解锁
            </span>
          )}
          {def.hidden && (
            <span
              style={{
                fontSize: 22,
                letterSpacing: 2,
                color: "#8b93a7",
                border: "2px solid rgba(255,255,255,0.16)",
                borderRadius: 999,
                padding: "2px 16px",
              }}
            >
              隐藏
            </span>
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 26,
            lineHeight: 1.65,
            color: unlocked ? "#c3cad9" : "#6f7686",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {description || "——"}
        </div>

        {unlocked && (unlockedAt ?? 0) > 0 && (
          <div style={{ marginTop: 12, fontSize: 20, color: "#6b7280" }}>
            解锁于 {formatTime(unlockedAt!)}
          </div>
        )}
      </div>
    </div>
  );
};

export const AchievementPanel: React.FC = () => {
  const ctx = useExtensionContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const scale = useDesignScale(rootRef);

  const [unlockedRaw] = ctx.variables.useValue(UNLOCKED_KEY);
  const [registeredRaw] = ctx.variables.useValue(REGISTERED_KEY);
  const accentRaw = useAchievementSetting<string>(ctx, "accentColor");
  const revealHiddenRaw = useAchievementSetting<boolean>(
    ctx,
    "revealHiddenOnUnlock",
  );
  const storyDefs = React.useSyncExternalStore(
    subscribeStoryDefs,
    getStoryDefs,
    getStoryDefs,
  );

  const accent = accentRaw && accentRaw.trim() ? accentRaw : "#ffd76a";
  const revealHidden = revealHiddenRaw !== false;
  const historyRevision = useHistoryRevision(ctx);

  const unlocked = useMemo(
    () => applyHistoryWindow(ctx, normalizeUnlocked(unlockedRaw)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, unlockedRaw, historyRevision],
  );
  const registered = useMemo(
    () => normalizeDefinitions(registeredRaw),
    [registeredRaw],
  );
  const definitions = useMemo(
    () =>
      collectDisplayDefinitions(storyDefs, registered, areStoryDefsScanned()),
    [storyDefs, registered],
  );
  const unlockedAt = useMemo(
    () => new Map(unlocked.map((record) => [record.key, record.at])),
    [unlocked],
  );
  const sorted = useMemo(
    () => sortForDisplay(definitions, unlockedAt),
    [definitions, unlockedAt],
  );
  const unlockedCount = definitions.filter((def) =>
    unlockedAt.has(def.key),
  ).length;
  const percent =
    definitions.length > 0
      ? Math.round((unlockedCount / definitions.length) * 100)
      : 0;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);

  return (
    <div
      ref={rootRef}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onWheel={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 0%, rgba(30,34,52,0.92), rgba(6,8,14,0.94))",
        backdropFilter: "blur(8px)",
        color: "#eef1f8",
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
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "44px 64px 28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 32 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 52,
                fontWeight: 600,
                letterSpacing: 16,
              }}
            >
              成就
            </h1>
            <span style={{ fontSize: 26, color: "#8b93a7" }}>
              已解锁 {unlockedCount} / {definitions.length}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            style={{
              width: 80,
              height: 80,
              borderRadius: 999,
              border: "2px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "#dfe4f0",
              fontSize: 34,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </header>

        <div
          style={{
            height: 6,
            margin: "0 64px 20px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              background: accent,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 64px 72px",
          }}
        >
          {sorted.length === 0 ? (
            <div
              style={{
                marginTop: 160,
                textAlign: "center",
                color: "#6f7686",
                fontSize: 28,
              }}
            >
              还没有配置任何成就
            </div>
          ) : (
            <div
              style={{
                maxWidth: 1360,
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              {sorted.map((def) => (
                <AchievementCard
                  key={def.key}
                  def={def}
                  unlockedAt={unlockedAt.get(def.key)}
                  accent={accent}
                  ctx={ctx}
                  revealHidden={revealHidden}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
