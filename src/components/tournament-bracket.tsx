"use client";

import { useState, useCallback } from "react";
import type { MatchInfo, MatchPhase } from "@/lib/types";
import { teams as allTeams, groups } from "@/lib/worldcup-data";
import { FlagImg } from "@/lib/flags";

interface TournamentBracketProps {
  matches: MatchInfo[];
  selectedTeamCode?: string;
  themeColor: string;
  onPhaseClick?: (phase: MatchPhase) => void;
}

const PHASE_META: { phase: MatchPhase; label: string; icon: string }[] = [
  { phase: "round_of_32", label: "Round of 32", icon: "🏟️" },
  { phase: "round_of_16", label: "Round of 16", icon: "⚔️" },
  { phase: "quarter_final", label: "Quarter-Finals", icon: "🔥" },
  { phase: "semi_final", label: "Semi-Finals", icon: "💫" },
  { phase: "final", label: "Final", icon: "🏆" },
  { phase: "third_place", label: "3rd Place", icon: "🥉" },
];

// ── Bookmaker-style simulation ────────────────────────────────────────────────

function teamStrength(fifaCode: string): number {
  const team = allTeams.find((t) => t.fifaCode === fifaCode);
  if (!team) return 10;
  const base = 101 - Math.min(team.fifaRanking, 100);
  const historyBonus = (team.worldCupHistory.titles ?? 0) * 5;
  return base + historyBonus;
}

function simulateMatch(codeA: string, codeB: string): { winner: string; loser: string } {
  const sA = teamStrength(codeA);
  const sB = teamStrength(codeB);
  const probA = sA / (sA + sB);
  return Math.random() < probA
    ? { winner: codeA, loser: codeB }
    : { winner: codeB, loser: codeA };
}

function simulateBracket(): MatchInfo[] {
  const simulated: MatchInfo[] = [];

  // Group stage simulation
  const qualified: string[] = [];
  const thirdPlaceTeams: { code: string; pts: number; gd: number }[] = [];

  for (const group of groups) {
    const standings = group.teams.map((code) => ({ code, pts: 0, gd: 0 }));
    for (let i = 0; i < standings.length; i++) {
      for (let j = i + 1; j < standings.length; j++) {
        const sA = teamStrength(standings[i].code);
        const sB = teamStrength(standings[j].code);
        const probA = sA / (sA + sB);
        const roll = Math.random();
        if (roll < probA * 0.7) {
          standings[i].pts += 3; standings[i].gd += 1; standings[j].gd -= 1;
        } else if (roll < probA * 0.7 + 0.2) {
          standings[i].pts += 1; standings[j].pts += 1;
        } else {
          standings[j].pts += 3; standings[j].gd += 1; standings[i].gd -= 1;
        }
      }
    }
    standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
    qualified.push(standings[0].code, standings[1].code);
    if (standings[2]) thirdPlaceTeams.push(standings[2]);
  }
  thirdPlaceTeams.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
  qualified.push(...thirdPlaceTeams.slice(0, 8).map((t) => t.code));

  // R32
  const r32W: string[] = [];
  for (let i = 0; i < qualified.length; i += 2) {
    if (!qualified[i + 1]) continue;
    const { winner } = simulateMatch(qualified[i], qualified[i + 1]);
    r32W.push(winner);
    simulated.push({ id: `SIM-R32-${i / 2}`, homeTeam: qualified[i], awayTeam: qualified[i + 1], phase: "round_of_32", date: "2026-06-28", time: "", stadiumName: "" });
  }

  // R16
  const r16W: string[] = [];
  for (let i = 0; i < r32W.length; i += 2) {
    if (!r32W[i + 1]) continue;
    const { winner } = simulateMatch(r32W[i], r32W[i + 1]);
    r16W.push(winner);
    simulated.push({ id: `SIM-R16-${i / 2}`, homeTeam: r32W[i], awayTeam: r32W[i + 1], phase: "round_of_16", date: "2026-07-04", time: "", stadiumName: "" });
  }

  // QF
  const qfW: string[] = [];
  const qfL: string[] = [];
  for (let i = 0; i < r16W.length; i += 2) {
    if (!r16W[i + 1]) continue;
    const { winner, loser } = simulateMatch(r16W[i], r16W[i + 1]);
    qfW.push(winner); qfL.push(loser);
    simulated.push({ id: `SIM-QF-${i / 2}`, homeTeam: r16W[i], awayTeam: r16W[i + 1], phase: "quarter_final", date: "2026-07-09", time: "", stadiumName: "" });
  }

  // SF
  const sfW: string[] = [];
  const sfL: string[] = [];
  for (let i = 0; i < qfW.length; i += 2) {
    if (!qfW[i + 1]) continue;
    const { winner, loser } = simulateMatch(qfW[i], qfW[i + 1]);
    sfW.push(winner); sfL.push(loser);
    simulated.push({ id: `SIM-SF-${i / 2}`, homeTeam: qfW[i], awayTeam: qfW[i + 1], phase: "semi_final", date: "2026-07-14", time: "", stadiumName: "" });
  }

  // 3rd place & Final
  if (sfL.length >= 2)
    simulated.push({ id: "SIM-3RD", homeTeam: sfL[0], awayTeam: sfL[1], phase: "third_place", date: "2026-07-18", time: "", stadiumName: "Hard Rock Stadium" });
  if (sfW.length >= 2)
    simulated.push({ id: "SIM-FINAL", homeTeam: sfW[0], awayTeam: sfW[1], phase: "final", date: "2026-07-19", time: "", stadiumName: "MetLife Stadium" });

  return simulated;
}

export function TournamentBracket({
  matches,
  selectedTeamCode,
  themeColor,
  onPhaseClick,
}: TournamentBracketProps) {
  const [simMatches, setSimMatches] = useState<MatchInfo[] | null>(null);
  const [simWinner, setSimWinner] = useState<string | null>(null);

  const handleSimulate = useCallback(() => {
    const result = simulateBracket();
    setSimMatches(result);
    // Find the winner from the final
    const finalMatch = result.find((m) => m.phase === "final");
    if (finalMatch?.homeTeam && finalMatch?.awayTeam) {
      const { winner } = simulateMatch(finalMatch.homeTeam, finalMatch.awayTeam);
      setSimWinner(winner);
    }
  }, []);

  const handleReset = useCallback(() => {
    setSimMatches(null);
    setSimWinner(null);
  }, []);

  const activeMatches = simMatches ?? matches;

  const getTeam = (code: string | null) =>
    code ? allTeams.find((t) => t.fifaCode === code) : null;

  const byPhase = (phase: MatchPhase) =>
    activeMatches.filter((m) => m.phase === phase);

  const isTeamInMatch = (match: MatchInfo) =>
    !!selectedTeamCode &&
    (match.homeTeam === selectedTeamCode || match.awayTeam === selectedTeamCode);

  // ── Match card ──────────────────────────────────────────────────────────────
  function MatchCard({ match, large }: { match: MatchInfo; large?: boolean }) {
    const home = getTeam(match.homeTeam);
    const away = getTeam(match.awayTeam);
    const highlighted = isTeamInMatch(match);

    function TeamRow({ code, name, isHome }: { code: string | null; name: string; isHome: boolean }) {
      const isSelected = !!selectedTeamCode && code === selectedTeamCode;
      return (
        <div
          className="flex items-center gap-2 px-3"
          style={{
            padding: large ? "8px 12px" : "5px 10px",
            background: isSelected ? `${themeColor}20` : "transparent",
            borderLeft: isSelected ? `3px solid ${themeColor}` : "3px solid transparent",
          }}
        >
          <span style={{ width: large ? 22 : 18, height: large ? 15 : 12, flexShrink: 0 }}>
            {code ? <FlagImg fifaCode={code} width={large ? 22 : 18} height={large ? 15 : 12} /> : <span style={{ fontSize: large ? 14 : 11 }}>🏳️</span>}
          </span>
          <span
            className="truncate"
            style={{
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? themeColor : "#c8d6e5",
              fontSize: large ? "0.85rem" : "0.75rem",
            }}
          >
            {name}
          </span>
          {isHome && (
            <span className="ml-auto text-gray-600" style={{ fontSize: "0.6rem" }}>H</span>
          )}
        </div>
      );
    }

    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: highlighted
            ? `linear-gradient(135deg, ${themeColor}12, ${themeColor}06)`
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${highlighted ? themeColor + "80" : "rgba(255,255,255,0.08)"}`,
          boxShadow: highlighted ? `0 0 16px ${themeColor}30` : "0 2px 8px rgba(0,0,0,0.2)",
          transition: "all 0.3s ease",
          minWidth: large ? 200 : 160,
        }}
      >
        {/* Date header */}
        <div
          className="text-center"
          style={{
            fontSize: "0.6rem",
            color: "#5a6c7e",
            padding: "3px 8px",
            background: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {match.date} · {match.time ?? ""}
        </div>
        <TeamRow code={match.homeTeam} name={home?.name ?? "TBD"} isHome={true} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
        <TeamRow code={match.awayTeam} name={away?.name ?? "TBD"} isHome={false} />
      </div>
    );
  }

  // ── Round column ────────────────────────────────────────────────────────────
  function RoundColumn({
    phase,
    label,
    icon,
    matchList,
    colIndex,
    totalSlots,
    large,
  }: {
    phase: MatchPhase;
    label: string;
    icon: string;
    matchList: MatchInfo[];
    colIndex: number;
    totalSlots: number;
    large?: boolean;
  }) {
    const slotHeight = large ? 80 : 64;
    const colHeight = totalSlots * slotHeight;

    return (
      <div
        className="flex flex-col items-center"
        style={{
          animation: "bracketReveal 0.5s ease-out both",
          animationDelay: `${colIndex * 0.12}s`,
          minWidth: large ? 220 : 180,
        }}
      >
        {/* Phase header */}
        <button
          className="mb-3 px-4 py-1.5 rounded-full font-semibold cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${themeColor}30, ${themeColor}10)`,
            color: themeColor,
            border: `1px solid ${themeColor}50`,
            fontSize: "0.75rem",
            transition: "all 0.2s ease",
          }}
          onClick={() => onPhaseClick?.(phase)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${themeColor}50`;
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${themeColor}30, ${themeColor}10)`;
            e.currentTarget.style.color = themeColor;
          }}
        >
          {icon} {label}
        </button>

        {/* Count badge */}
        <div className="text-gray-600 text-xs mb-2" style={{ fontSize: "0.65rem" }}>
          {matchList.length} match{matchList.length !== 1 ? "es" : ""}
        </div>

        {/* Match slots */}
        <div
          className="flex flex-col justify-around items-center gap-2"
          style={{ height: matchList.length > 2 ? `${colHeight}px` : "auto", width: "100%" }}
        >
          {matchList.map((match) => (
            <MatchCard key={match.id} match={match} large={large} />
          ))}
        </div>
      </div>
    );
  }

  // ── Connector lines (SVG) ──────────────────────────────────────────────────
  function Connector({ slots }: { slots: number }) {
    const h = slots * 64;
    return (
      <svg width="28" height={h} className="shrink-0" style={{ opacity: 0.3 }}>
        {Array.from({ length: Math.floor(slots / 2) }).map((_, i) => {
          const y1 = ((i * 2 + 0.5) / slots) * h;
          const y2 = ((i * 2 + 1.5) / slots) * h;
          const midY = (y1 + y2) / 2;
          return (
            <g key={i}>
              <line x1="0" y1={y1} x2="14" y2={y1} stroke={themeColor} strokeWidth="1.5" />
              <line x1="0" y1={y2} x2="14" y2={y2} stroke={themeColor} strokeWidth="1.5" />
              <line x1="14" y1={y1} x2="14" y2={y2} stroke={themeColor} strokeWidth="1.5" />
              <line x1="14" y1={midY} x2="28" y2={midY} stroke={themeColor} strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>
    );
  }

  const r32 = byPhase("round_of_32");
  const r16 = byPhase("round_of_16");
  const qf = byPhase("quarter_final");
  const sf = byPhase("semi_final");
  const finalM = byPhase("final");
  const thirdM = byPhase("third_place");

  const baseSlots = 16;

  return (
    <div
      className="w-full rounded-2xl p-6"
      style={{
        background: "linear-gradient(135deg, rgba(7,17,31,0.95), rgba(13,31,53,0.95))",
        border: `1px solid ${themeColor}30`,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Title + Simulate button */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          🏆 FIFA World Cup 2026 — Bracket
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {simMatches ? "Simulated based on FIFA rankings & bookmaker odds" : "Click a phase to filter matches"}
          {selectedTeamCode && (
            <span style={{ color: themeColor }}> · Tracking {selectedTeamCode}</span>
          )}
        </p>
        <div className="flex justify-center gap-3 mt-3">
          <button
            onClick={handleSimulate}
            className="px-5 py-2 rounded-full font-semibold text-sm cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
              color: "#fff",
              border: "none",
              boxShadow: `0 4px 16px ${themeColor}50`,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = `0 6px 24px ${themeColor}70`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 16px ${themeColor}50`; }}
          >
            🎲 {simMatches ? "Re-simulate" : "Simulate"}
          </button>
          {simMatches && (
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-full font-semibold text-sm cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#aaa",
                border: "1px solid rgba(255,255,255,0.15)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#aaa"; }}
            >
              ↩ Reset
            </button>
          )}
        </div>
      </div>

      {/* Winner banner */}
      {simWinner && (() => {
        const winner = getTeam(simWinner);
        return (
          <div
            className="rounded-xl p-4 mb-6 flex items-center justify-center gap-4"
            style={{
              background: `linear-gradient(135deg, ${themeColor}25, ${themeColor}08)`,
              border: `2px solid ${themeColor}60`,
              animation: "bracketReveal 0.6s ease-out both",
            }}
          >
            <span className="text-4xl">🏆</span>
            <div className="text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Predicted Winner</div>
              <div className="flex items-center gap-2 mt-1">
                {winner && <FlagImg fifaCode={simWinner} width={28} height={19} />}
                <span className="text-xl font-bold text-white">{winner?.name ?? simWinner}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: themeColor }}>
                FIFA Ranking #{winner?.fifaRanking} · {winner?.worldCupHistory.titles ?? 0} title{(winner?.worldCupHistory.titles ?? 0) !== 1 ? "s" : ""}
              </div>
            </div>
            <span className="text-4xl">🏆</span>
          </div>
        );
      })()}

      {/* Bracket grid — horizontal scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-1" style={{ minWidth: 1100 }}>
          <RoundColumn phase="round_of_32" label="Round of 32" icon="🏟️" matchList={r32} colIndex={0} totalSlots={baseSlots} />
          <Connector slots={baseSlots} />
          <RoundColumn phase="round_of_16" label="Round of 16" icon="⚔️" matchList={r16} colIndex={1} totalSlots={baseSlots} />
          <Connector slots={Math.max(r16.length, 8)} />
          <RoundColumn phase="quarter_final" label="Quarter-Finals" icon="🔥" matchList={qf} colIndex={2} totalSlots={baseSlots} />
          <Connector slots={Math.max(qf.length, 4)} />
          <RoundColumn phase="semi_final" label="Semi-Finals" icon="💫" matchList={sf} colIndex={3} totalSlots={baseSlots} />

          {/* Final column */}
          <div className="flex flex-col items-center gap-8 ml-2">
            <RoundColumn phase="final" label="Final" icon="🏆" matchList={finalM} colIndex={4} totalSlots={2} large />
            {thirdM.length > 0 && (
              <RoundColumn phase="third_place" label="3rd Place" icon="🥉" matchList={thirdM} colIndex={4} totalSlots={2} />
            )}
          </div>
        </div>
      </div>

      {/* Phase summary chips */}
      <div className="flex flex-wrap justify-center gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${themeColor}15` }}>
        {PHASE_META.map(({ phase, label, icon }) => {
          const count = byPhase(phase).length;
          if (count === 0) return null;
          return (
            <button
              key={phase}
              className="px-3 py-1 rounded-full text-xs cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#8899aa",
                border: "1px solid rgba(255,255,255,0.08)",
                transition: "all 0.2s ease",
              }}
              onClick={() => onPhaseClick?.(phase)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${themeColor}30`;
                e.currentTarget.style.color = themeColor;
                e.currentTarget.style.borderColor = `${themeColor}50`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "#8899aa";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              {icon} {label} ({count})
            </button>
          );
        })}
      </div>

      {simMatches && (
        <div className="text-center mt-4 pt-3 text-xs text-gray-600" style={{ borderTop: `1px solid ${themeColor}15` }}>
          ⚠️ Simulation based on FIFA World Rankings &amp; historical World Cup titles. Results are randomized — upsets can happen!
        </div>
      )}

      <style jsx>{`
        @keyframes bracketReveal {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
