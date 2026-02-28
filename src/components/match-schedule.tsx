"use client";

import { useState, useEffect } from "react";
import { MatchInfo, MatchPhase } from "@/lib/types";
import { teams, stadiums } from "@/lib/worldcup-data";

export interface MatchScheduleProps {
  matches: MatchInfo[];
  teamCode: string;
  themeColor: string;
  onMatchClick?: (match: MatchInfo) => void;
  onOpponentClick?: (opponentCode: string) => void;
}

// ─── Phase badge config ───────────────────────────────────────────────────────

const PHASE_LABELS: Record<MatchPhase, string> = {
  group: "Groupe",
  round_of_32: "R32",
  round_of_16: "R16",
  quarter_final: "QF",
  semi_final: "SF",
  third_place: "3e Place",
  final: "Finale",
};

const PHASE_COLORS: Record<MatchPhase, string> = {
  group: "#6366f1",
  round_of_32: "#8b5cf6",
  round_of_16: "#a855f7",
  quarter_final: "#f59e0b",
  semi_final: "#f97316",
  third_place: "#64748b",
  final: "#ef4444",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTeamFlag(code: string | null): string {
  if (!code) return "❓";
  const team = teams.find((t) => t.fifaCode === code);
  return team?.flag || "🌍";
}

function getTeamName(code: string | null): string {
  if (!code) return "TBD";
  const team = teams.find((t) => t.fifaCode === code);
  return team?.name || code;
}

function getStadiumDetails(name: string) {
  return stadiums.find((s) => s.name === name);
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (dateStr === todayStr) return 0;
  const todayMidnight = new Date(todayStr);
  const matchDay = new Date(dateStr);
  return Math.round((matchDay.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

function formatMatchDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function MatchSkeleton({ index }: { index: number }) {
  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{
        background: "rgba(255,255,255,0.1)",
        animation: `pulse 1.5s ease-in-out ${index * 100}ms infinite`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-16 h-5 rounded-full bg-white/20" />
        <div className="w-24 h-4 rounded bg-white/20" />
      </div>
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-10 h-10 rounded-full bg-white/20" />
          <div className="w-16 h-3 rounded bg-white/20" />
        </div>
        <div className="w-8 h-6 rounded bg-white/20" />
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-10 h-10 rounded-full bg-white/20" />
          <div className="w-16 h-3 rounded bg-white/20" />
        </div>
      </div>
      <div className="mt-3 w-32 h-3 rounded bg-white/20 mx-auto" />
    </div>
  );
}

// ─── Phase separator ──────────────────────────────────────────────────────────

function PhaseSeparator({ themeColor, label }: { themeColor: string; label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div
        className="flex-1 h-0.5"
        style={{
          background: `linear-gradient(to right, transparent, ${themeColor})`,
        }}
      />
      <span
        className="text-sm font-bold px-3 py-1 rounded-full text-white whitespace-nowrap"
        style={{
          background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
          boxShadow: `0 2px 8px ${themeColor}60`,
        }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-0.5"
        style={{
          background: `linear-gradient(to left, transparent, ${themeColor})`,
        }}
      />
    </div>
  );
}

// ─── Single match card ────────────────────────────────────────────────────────

interface MatchCardProps {
  match: MatchInfo;
  index: number;
  visible: boolean;
  teamCode: string;
  themeColor: string;
  onMatchClick?: (match: MatchInfo) => void;
  onOpponentClick?: (opponentCode: string) => void;
}

function MatchCard({
  match,
  index,
  visible,
  teamCode,
  themeColor,
  onMatchClick,
  onOpponentClick,
}: MatchCardProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const daysUntil = getDaysUntil(match.date);
  const homeFlag = getTeamFlag(match.homeTeam);
  const awayFlag = getTeamFlag(match.awayTeam);
  const stadiumDetails = getStadiumDetails(match.stadiumName);

  const handleOpponentClick = (code: string | null, e: React.MouseEvent) => {
    if (code && code !== teamCode && onOpponentClick) {
      e.stopPropagation();
      onOpponentClick(code);
    }
  };

  return (
    <div
      className="rounded-xl overflow-visible cursor-pointer"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.4s ease ${index * 100}ms, transform 0.4s ease ${index * 100}ms`,
        background: "rgba(255,255,255,0.97)",
        border: `2px solid ${themeColor}30`,
        boxShadow: `0 4px 16px ${themeColor}20`,
        marginBottom: "0.75rem",
      }}
      onClick={() => onMatchClick?.(match)}
    >
      <div className="p-4">
        {/* Phase badge + date */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span
            className="text-xs font-bold px-2 py-1 rounded-full text-white"
            style={{ background: PHASE_COLORS[match.phase] }}
          >
            {PHASE_LABELS[match.phase]}
            {match.group && ` ${match.group}`}
          </span>
          <div className="text-right">
            <div className="text-xs text-gray-600 font-medium">
              {formatMatchDate(match.date)}
            </div>
            <div className="text-xs text-gray-400">{match.time} UTC</div>
          </div>
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-center gap-3 my-2">
          {/* Home team */}
          <div
            className="flex flex-col items-center gap-1 flex-1 text-center min-w-0"
            onClick={(e) => handleOpponentClick(match.homeTeam, e)}
          >
            <span
              className="text-3xl leading-none select-none"
              style={{
                cursor:
                  match.homeTeam && match.homeTeam !== teamCode && onOpponentClick
                    ? "pointer"
                    : "default",
                transition: "transform 0.2s",
                display: "inline-block",
              }}
              title={
                match.homeTeam && match.homeTeam !== teamCode
                  ? `Comparer avec ${getTeamName(match.homeTeam)}`
                  : undefined
              }
            >
              {homeFlag}
            </span>
            <span className="text-xs font-bold text-gray-700 truncate w-full">
              {getTeamName(match.homeTeam)}
            </span>
          </div>

          {/* VS */}
          <div
            className="text-base font-black px-2 shrink-0"
            style={{
              color: themeColor,
              animation: "vsGlow 2s ease-in-out infinite",
            }}
          >
            VS
          </div>

          {/* Away team */}
          <div
            className="flex flex-col items-center gap-1 flex-1 text-center min-w-0"
            onClick={(e) => handleOpponentClick(match.awayTeam, e)}
          >
            <span
              className="text-3xl leading-none select-none"
              style={{
                cursor:
                  match.awayTeam && match.awayTeam !== teamCode && onOpponentClick
                    ? "pointer"
                    : "default",
                transition: "transform 0.2s",
                display: "inline-block",
              }}
              title={
                match.awayTeam && match.awayTeam !== teamCode
                  ? `Comparer avec ${getTeamName(match.awayTeam)}`
                  : undefined
              }
            >
              {awayFlag}
            </span>
            <span className="text-xs font-bold text-gray-700 truncate w-full">
              {getTeamName(match.awayTeam)}
            </span>
          </div>
        </div>

        {/* Stadium with tooltip */}
        <div
          className="relative mt-3 text-center"
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
        >
          <span className="text-xs text-gray-500 cursor-help hover:text-gray-700 transition-colors">
            🏟️ {match.stadiumName}
            {stadiumDetails && ` — ${stadiumDetails.city}`}
          </span>
          {tooltipOpen && stadiumDetails && (
            <div
              className="absolute bottom-full left-1/2 z-50 mb-2 text-left"
              style={{
                transform: "translateX(-50%)",
                background: "#1F2937",
                color: "white",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "0.72rem",
                lineHeight: "1.6",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              <div className="font-bold mb-1">🏟️ {stadiumDetails.name}</div>
              <div>👥 {stadiumDetails.capacity.toLocaleString()} places</div>
              <div>
                📍 {stadiumDetails.city}, {stadiumDetails.country}
              </div>
              <div className="mt-1 text-gray-300 text-xs max-w-xs whitespace-normal">
                {stadiumDetails.description}
              </div>
            </div>
          )}
        </div>

        {/* Countdown */}
        {daysUntil > 0 && (
          <div
            className="mt-2 text-center text-xs font-semibold"
            style={{ color: themeColor }}
          >
            ⏳ Dans {daysUntil} jour{daysUntil !== 1 ? "s" : ""}
          </div>
        )}
        {daysUntil === 0 && (
          <div className="mt-2 text-center text-xs font-bold text-green-600">
            🔴 Aujourd'hui !
          </div>
        )}
        {daysUntil < 0 && (
          <div className="mt-2 text-center text-xs text-gray-400">
            ✅ Match joué
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MatchSchedule({
  matches,
  teamCode,
  themeColor,
  onMatchClick,
  onOpponentClick,
}: MatchScheduleProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  // Staggered reveal: reveal one match every 100 ms when matches arrive
  useEffect(() => {
    if (matches.length === 0) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(0);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= matches.length) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [matches]);

  // Show skeleton while there are no matches yet
  if (matches.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex-1 h-px"
            style={{ background: `${themeColor}40` }}
          />
          <span className="text-sm font-bold px-3" style={{ color: themeColor }}>
            📅 Calendrier
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: `${themeColor}40` }}
          />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <MatchSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    );
  }

  const groupMatches = matches.filter((m) => m.phase === "group");
  const knockoutMatches = matches.filter((m) => m.phase !== "group");

  return (
    <div className="w-full">
      {/* Title */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex-1 h-px"
          style={{ background: `${themeColor}40` }}
        />
        <span
          className="text-sm font-bold px-3 whitespace-nowrap"
          style={{ color: themeColor }}
        >
          📅 Calendrier des Matchs
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: `${themeColor}40` }}
        />
      </div>

      {/* Group stage section */}
      {groupMatches.length > 0 && (
        <div>
          <PhaseSeparator themeColor={themeColor} label="⚽ Phase de Groupes" />
          {groupMatches.map((m, i) => (
            <MatchCard
              key={m.id}
              match={m}
              index={i}
              visible={i < visibleCount}
              teamCode={teamCode}
              themeColor={themeColor}
              onMatchClick={onMatchClick}
              onOpponentClick={onOpponentClick}
            />
          ))}
        </div>
      )}

      {/* Knockout / group separator */}
      {groupMatches.length > 0 && knockoutMatches.length > 0 && (
        <PhaseSeparator themeColor={themeColor} label="🏆 Phases Éliminatoires" />
      )}

      {/* Knockout stage section */}
      {knockoutMatches.length > 0 && (
        <div>
          {groupMatches.length === 0 && (
            <PhaseSeparator themeColor={themeColor} label="🏆 Phases Éliminatoires" />
          )}
          {knockoutMatches.map((m, i) => (
            <MatchCard
              key={m.id}
              match={m}
              index={groupMatches.length + i}
              visible={groupMatches.length + i < visibleCount}
              teamCode={teamCode}
              themeColor={themeColor}
              onMatchClick={onMatchClick}
              onOpponentClick={onOpponentClick}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes vsGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
