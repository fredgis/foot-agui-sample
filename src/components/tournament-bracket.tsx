"use client";

import type { MatchInfo, MatchPhase } from "@/lib/types";
import { teams as allTeams } from "@/lib/worldcup-data";

interface TournamentBracketProps {
  matches: MatchInfo[];
  selectedTeamCode?: string;
  themeColor: string;
  onPhaseClick?: (phase: MatchPhase) => void; // → filtre MatchSchedule
}

const PHASE_LABELS: Partial<Record<MatchPhase, string>> = {
  round_of_32: "R32",
  round_of_16: "R16",
  quarter_final: "QF",
  semi_final: "SF",
  final: "Finale",
  third_place: "3e Place",
};

// Height in px allocated per match slot
const SLOT_HEIGHT = 56;

export function TournamentBracket({
  matches,
  selectedTeamCode,
  themeColor,
  onPhaseClick,
}: TournamentBracketProps) {
  const getTeam = (code: string | null) =>
    code ? allTeams.find((t) => t.fifaCode === code) : null;

  const byPhase = (phase: MatchPhase) => matches.filter((m) => m.phase === phase);

  const r32 = byPhase("round_of_32");
  const r16 = byPhase("round_of_16");
  const qf = byPhase("quarter_final");
  const sf = byPhase("semi_final");
  const finalMatches = byPhase("final");
  const thirdPlaceMatches = byPhase("third_place");

  const isTeamInMatch = (match: MatchInfo) =>
    !!selectedTeamCode &&
    (match.homeTeam === selectedTeamCode || match.awayTeam === selectedTeamCode);

  function MatchCard({ match }: { match: MatchInfo }) {
    const home = getTeam(match.homeTeam);
    const away = getTeam(match.awayTeam);
    const highlighted = isTeamInMatch(match);

    return (
      <div
        className="rounded border text-xs"
        style={{
          borderColor: highlighted ? themeColor : "rgba(0,0,0,0.15)",
          background: highlighted
            ? `${themeColor}15`
            : "rgba(255,255,255,0.95)",
          boxShadow: highlighted ? `0 0 8px ${themeColor}50` : "none",
          padding: "4px 8px",
          minWidth: "110px",
        }}
      >
        <div className="flex items-center gap-1 py-0.5">
          <span>{home?.flag ?? "🏳"}</span>
          <span className="font-medium text-gray-700 truncate">
            {home?.name ?? "TBD"}
          </span>
        </div>
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }} />
        <div className="flex items-center gap-1 py-0.5">
          <span>{away?.flag ?? "🏳"}</span>
          <span className="font-medium text-gray-700 truncate">
            {away?.name ?? "TBD"}
          </span>
        </div>
      </div>
    );
  }

  function RoundColumn({
    phase,
    matchList,
    colIndex,
    totalSlots,
  }: {
    phase: MatchPhase;
    matchList: MatchInfo[];
    colIndex: number;
    totalSlots: number;
  }) {
    const label = PHASE_LABELS[phase] ?? phase;
    const colHeight = totalSlots * SLOT_HEIGHT;

    return (
      <div
        className="flex flex-col items-center"
        style={{
          animation: "bracketReveal 0.5s ease-out both",
          animationDelay: `${colIndex * 0.12}s`,
          minWidth: "130px",
        }}
      >
        {/* Clickable phase header */}
        <button
          className="text-xs font-bold mb-3 px-3 py-1 rounded"
          style={{
            background: `${themeColor}20`,
            color: themeColor,
            border: `1px solid ${themeColor}40`,
            cursor: "pointer",
          }}
          onClick={() => onPhaseClick?.(phase)}
        >
          {label}
        </button>

        {/* Match slots distributed evenly */}
        <div
          className="flex flex-col justify-around items-center"
          style={{ height: `${colHeight}px`, width: "100%" }}
        >
          {matchList.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    );
  }

  // Base column height: 16 R32 slots
  const baseSlots = 16;
  const colHeight = baseSlots * SLOT_HEIGHT;

  return (
    <div className="w-full p-4">
      <h2
        className="text-2xl font-bold mb-4 text-center"
        style={{ color: themeColor }}
      >
        🏆 Tableau — Coupe du Monde 2026
      </h2>

      {/* Horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-4">
        <div
          className="flex gap-4 items-start"
          style={{ minWidth: "720px" }}
        >
          <RoundColumn
            phase="round_of_32"
            matchList={r32}
            colIndex={0}
            totalSlots={baseSlots}
          />
          <RoundColumn
            phase="round_of_16"
            matchList={r16}
            colIndex={1}
            totalSlots={baseSlots}
          />
          <RoundColumn
            phase="quarter_final"
            matchList={qf}
            colIndex={2}
            totalSlots={baseSlots}
          />
          <RoundColumn
            phase="semi_final"
            matchList={sf}
            colIndex={3}
            totalSlots={baseSlots}
          />
          {/* Final + 3rd place stacked */}
          <div className="flex flex-col gap-6">
            <RoundColumn
              phase="final"
              matchList={finalMatches}
              colIndex={4}
              totalSlots={baseSlots / 2}
            />
            <RoundColumn
              phase="third_place"
              matchList={thirdPlaceMatches}
              colIndex={4}
              totalSlots={baseSlots / 2}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bracketReveal {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
