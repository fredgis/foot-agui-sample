"use client";

import { useState, useEffect, useRef, memo } from "react";
import { TeamInfo, PlayerInfo } from "@/lib/types";
import { groups } from "@/lib/worldcup-data";
import { FlagImg } from "@/lib/flags";

interface TeamCardProps {
  team: TeamInfo | null;
  themeColor: string;
  secondaryColor: string;
}

// Map team fifaCode to its WC2026 group
function findTeamGroup(fifaCode: string): string {
  for (const group of groups) {
    if (group.teams.includes(fifaCode)) {
      return `Group ${group.name}`;
    }
  }
  return "–";
}

// Confederation badge
const confBadge: Record<string, string> = {
  UEFA: "🏰",
  CONMEBOL: "🌎",
  CAF: "🌍",
  AFC: "🌏",
  CONCACAF: "🗽",
  OFC: "🌊",
};

// Position emoji
const posEmoji: Record<string, string> = {
  GK: "🧤",
  DF: "🛡️",
  MF: "⚙️",
  FW: "⚡",
};

// ── PlayerCard ─────────────────────────────────────────────────────────────────
function PlayerCard({
  player,
  themeColor,
  index,
}: {
  player: PlayerInfo;
  themeColor: string;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative p-3 rounded-xl text-center cursor-pointer select-none"
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${themeColor}35, ${themeColor}15)`
          : `linear-gradient(135deg, ${themeColor}18, ${themeColor}06)`,
        border: `1px solid ${hovered ? themeColor : themeColor + "40"}`,
        transform: hovered ? "scale(1.07)" : "scale(1)",
        transition: "all 0.2s ease",
        animationDelay: `${0.4 + index * 0.08}s`,
        animation: "fadeUp 0.5s ease-out both",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="text-3xl mb-1">{posEmoji[player.position] ?? "⚽"}</div>
      <div className="font-bold text-xs leading-tight" style={{ color: themeColor }}>
        {player.name}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{player.position}</div>

      {/* Mini popup on hover */}
      {hovered && (
        <div
          className="absolute bottom-full left-1/2 mb-2 z-50 px-3 py-2 rounded-lg whitespace-nowrap text-left pointer-events-none"
          style={{
            transform: "translateX(-50%)",
            background: `${themeColor}ee`,
            color: "#fff",
            boxShadow: `0 4px 16px ${themeColor}80`,
            fontSize: "0.75rem",
          }}
        >
          <div className="font-bold">{player.name}</div>
          <div className="opacity-80">
            {player.position} · {player.club}
          </div>
          {/* Arrow */}
          <div
            style={{
              position: "absolute",
              bottom: "-6px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: `6px solid ${themeColor}ee`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div
      className="w-full max-w-4xl p-8 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.12)",
        border: "2px solid rgba(255,255,255,0.2)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header skeleton */}
      <div className="flex items-center gap-6 mb-8">
        <div className="w-24 h-24 rounded-full skeleton-pulse" />
        <div className="flex-1 space-y-3">
          <div className="h-8 rounded-lg skeleton-pulse w-2/3" />
          <div className="h-5 rounded-lg skeleton-pulse w-1/3" />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl skeleton-pulse" />
        ))}
      </div>
      {/* Players skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl skeleton-pulse" />
        ))}
      </div>
      {/* History skeleton */}
      <div className="h-24 rounded-xl skeleton-pulse" />

      <style jsx>{`
        .skeleton-pulse {
          background: rgba(200, 200, 200, 0.25);
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}

// ── TeamCard ───────────────────────────────────────────────────────────────────
export const TeamCard = memo(function TeamCard({ team, themeColor, secondaryColor }: TeamCardProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const prevTeamCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const currentCode = team?.fifaCode ?? null;
    if (currentCode === prevTeamCodeRef.current) return;

    if (prevTeamCodeRef.current && currentCode) {
      // Transition between teams: fade out → slide in
      setFading(true);
      setVisible(false);
      const t = setTimeout(() => {
        prevTeamCodeRef.current = currentCode;
        setFading(false);
        setVisible(true);
      }, 320);
      return () => clearTimeout(t);
    } else if (currentCode) {
      prevTeamCodeRef.current = currentCode;
      // Set visible immediately — setTimeout was getting cancelled by
      // rapid re-renders (state detection, AG-UI events) within 30ms,
      // leaving the card stuck at opacity: 0 forever.
      setVisible(true);
    } else {
      prevTeamCodeRef.current = null;
      setVisible(false);
    }
  }, [team?.fifaCode]);

  if (!team) {
    return <SkeletonLoader />;
  }

  const group = findTeamGroup(team.fifaCode);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: fading
          ? "opacity 0.3s ease-out, transform 0.3s ease-out"
          : "opacity 0.4s ease-out, transform 0.4s ease-out",
        background: "rgba(255,255,255,0.97)",
        boxShadow: `0 8px 40px ${themeColor}60`,
        border: `2px solid ${themeColor}`,
        borderRadius: "1.5rem",
        backdropFilter: "blur(16px)",
        padding: "2rem",
        width: "100%",
        maxWidth: "56rem",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex flex-col md:flex-row items-center gap-6 mb-8"
        style={{ animation: "fadeUp 0.6s ease-out both", animationDelay: "0s" }}
      >
        <div
          className="select-none leading-none"
          style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}
        >
          <FlagImg fifaCode={team.fifaCode} width={120} height={80} style={{ borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }} />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2
            className="text-3xl md:text-4xl font-extrabold tracking-wide mb-2"
            style={{ color: themeColor }}
          >
            {team.name}
          </h2>
          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full text-white"
              style={{ background: themeColor }}
            >
              {confBadge[team.confederation] ?? "🌐"} {team.confederation}
            </span>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full border-2"
              style={{ borderColor: themeColor, color: themeColor }}
            >
              {team.fifaCode}
            </span>
            <span className="text-sm text-gray-500">
              👨‍💼 {team.coach}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        style={{ animation: "fadeUp 0.6s ease-out both", animationDelay: "0.12s" }}
      >
        {[
          { icon: "📊", label: "FIFA Ranking", value: `#${team.fifaRanking}` },
          { icon: "🗺️", label: "WC2026 Group", value: group },
          {
            icon: "🏆",
            label: "WC Titles",
            value: team.worldCupHistory.titles > 0
              ? `${team.worldCupHistory.titles} 🥇`
              : "0",
          },
          {
            icon: "🎽",
            label: "WC Appearances",
            value: `${team.worldCupHistory.participations}`,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="text-center p-4 rounded-xl"
            style={{
              background: `${themeColor}12`,
              border: `1px solid ${themeColor}30`,
            }}
          >
            <div className="text-3xl mb-1">{stat.icon}</div>
            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
            <div className="text-xl font-bold" style={{ color: themeColor }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Stars ── */}
      <div
        className="mb-8"
        style={{ animation: "fadeUp 0.6s ease-out both", animationDelay: "0.24s" }}
      >
        <h3
          className="text-xl font-bold mb-4 flex items-center gap-2"
          style={{ color: themeColor }}
        >
          ⭐ Stars
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {team.keyPlayers.map((player, i) => (
            <PlayerCard
              key={i}
              player={player}
              themeColor={themeColor}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* ── WC History ── */}
      <div
        style={{ animation: "fadeUp 0.6s ease-out both", animationDelay: "0.36s" }}
      >
        <h3
          className="text-xl font-bold mb-4 flex items-center gap-2"
          style={{ color: themeColor }}
        >
          📜 World Cup History
        </h3>
        <div
          className="p-5 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${themeColor}12, ${themeColor}04)`,
            border: `1px solid ${themeColor}30`,
          }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center">
            <div>
              <div className="text-4xl font-extrabold" style={{ color: themeColor }}>
                {team.worldCupHistory.participations}
              </div>
              <div className="text-sm text-gray-500">Appearances</div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-gray-300" />
            <div>
              <div className="text-4xl font-extrabold" style={{ color: themeColor }}>
                {team.worldCupHistory.titles}
              </div>
              <div className="text-sm text-gray-500">Title(s)</div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-gray-300" />
            <div className="flex-1 text-center sm:text-left">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
                Best result
              </div>
              <div className="text-lg font-bold" style={{ color: themeColor }}>
                🏅 {team.worldCupHistory.bestResult}
              </div>
            </div>
          </div>

          {/* Participations frise */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
            {[...Array(team.worldCupHistory.participations)].map((_, i) => (
              <div
                key={i}
                title={`Participation ${i + 1}`}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background:
                    i < team.worldCupHistory.titles
                      ? `linear-gradient(135deg, ${themeColor}, ${secondaryColor || "#FFD700"})`
                      : `${themeColor}30`,
                  border: `2px solid ${themeColor}60`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  fontWeight: "bold",
                  color: i < team.worldCupHistory.titles ? "#fff" : themeColor,
                }}
              >
                {i < team.worldCupHistory.titles ? "🏆" : "⚽"}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}, (prev, next) =>
  prev.team?.fifaCode === next.team?.fifaCode &&
  prev.themeColor === next.themeColor &&
  prev.secondaryColor === next.secondaryColor
);
