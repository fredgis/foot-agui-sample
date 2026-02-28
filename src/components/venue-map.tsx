"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { StadiumInfo, MatchInfo } from "@/lib/types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VenueMapProps {
  stadiums: StadiumInfo[];
  teamMatches?: MatchInfo[];
  highlightedCity?: string | null;
  themeColor: string;
  onStadiumClick?: (stadium: StadiumInfo) => void;
}

// ─── SVG Projection ───────────────────────────────────────────────────────────

const SVG_W = 900;
const SVG_H = 600;
const LAT_MIN = 14;
const LAT_MAX = 58;
const LNG_MIN = -130;
const LNG_MAX = -60;

function toSVG(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * SVG_W;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * SVG_H;
  return { x, y };
}

function borderToPath(points: [number, number][]): string {
  return (
    points
      .map(([lat, lng], i) => {
        const { x, y } = toSVG(lat, lng);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

// ─── Simplified Country Outlines ─────────────────────────────────────────────
// Key border points [lat, lng] going roughly clockwise

const USA_BORDER: [number, number][] = [
  [49, -125], [49, -123], [49, -117], [49, -104], [49, -100],
  [49, -97],  [49, -95],  [49, -83],  [47, -83],  [47, -67],
  [44, -67],  [42, -70],  [40, -74],  [36, -76],  [32, -80],
  [25, -80],  [25, -82],  [29, -89],  [26, -97],  [29, -104],
  [31.8, -106.5], [31.3, -111], [32.5, -117],
  [34, -118], [37, -122], [42, -124], [47, -124], [49, -125],
];

const CANADA_BORDER: [number, number][] = [
  [49, -125], [58, -128], [60, -95], [57, -78], [52, -66],
  [47, -53],  [47, -67],  [49, -95], [49, -125],
];

const MEXICO_BORDER: [number, number][] = [
  [32.5, -117], [31.8, -106.5], [29, -104], [26, -97],
  [22, -97],  [18, -92],  [16, -90],  [15, -92],
  [16, -94],  [19, -104], [22, -106], [28, -110],
  [30, -115], [32.5, -117],
];

// ─── Country Zone Labels ──────────────────────────────────────────────────────

const ZONE_LABELS = [
  { label: "🇺🇸 USA (11)", lat: 38, lng: -97, fill: "#6a9fd8" },
  { label: "🇨🇦 Canada (2)", lat: 53, lng: -100, fill: "#7ad88a" },
  { label: "🇲🇽 México (3)", lat: 22, lng: -100, fill: "#d8a86a" },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TOOLTIP_NAME_LENGTH = 22;

const COUNTRY_FLAGS: Record<string, string> = {
  USA: "🇺🇸",
  Canada: "🇨🇦",
  Mexico: "🇲🇽",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcPinOpacity(fadeOut: boolean, visible: boolean, isHighlighted: boolean): number {
  if (fadeOut && isHighlighted) return 0.2;
  if (!visible && isHighlighted) return 0;
  return 1;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VenueMap({
  stadiums,
  teamMatches,
  highlightedCity,
  themeColor,
  onStadiumClick,
}: VenueMapProps) {
  const [hoveredStadium, setHoveredStadium] = useState<StadiumInfo | null>(null);
  const [clickedStadium, setClickedStadium] = useState<StadiumInfo | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const prevMatchesRef = useRef<MatchInfo[] | undefined>(undefined);

  // Animate on team change: fade-out old highlights, pulse-in new ones
  useEffect(() => {
    const prev = prevMatchesRef.current;
    const prevNames = prev ? new Set(prev.map((m) => m.stadiumName)) : new Set<string>();
    const newNames = teamMatches ? new Set(teamMatches.map((m) => m.stadiumName)) : new Set<string>();
    const hasChanged =
      prevNames.size !== newNames.size ||
      [...prevNames].some((n) => !newNames.has(n));

    // Always update the ref immediately so rapid team changes stay in sync
    prevMatchesRef.current = teamMatches;

    if (hasChanged && prev !== undefined) {
      setFadeOut(true);
      setVisible(false);
      const t1 = setTimeout(() => {
        setFadeOut(false);
        setVisible(true);
      }, 500);
      return () => clearTimeout(t1);
    }
  }, [teamMatches]);

  // Set of stadium names where the selected team plays
  const teamStadiumNames = useMemo(() => {
    if (!teamMatches) return new Set<string>();
    return new Set(teamMatches.map((m) => m.stadiumName));
  }, [teamMatches]);

  // Ordered unique stadiums for the route (sorted by match date)
  const routeStadiums = useMemo(() => {
    if (!teamMatches || teamMatches.length === 0) return [];
    const sorted = [...teamMatches].sort((a, b) => a.date.localeCompare(b.date));
    const seen = new Set<string>();
    const result: StadiumInfo[] = [];
    for (const match of sorted) {
      if (!seen.has(match.stadiumName)) {
        seen.add(match.stadiumName);
        const stadium = stadiums.find((s) => s.name === match.stadiumName);
        if (stadium) result.push(stadium);
      }
    }
    return result;
  }, [teamMatches, stadiums]);

  // SVG path for the route line
  const routePath = useMemo(() => {
    if (routeStadiums.length < 2) return null;
    return routeStadiums
      .map((s, i) => {
        const { x, y } = toSVG(s.lat, s.lng);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [routeStadiums]);

  // Next match at hovered stadium
  const nextMatch = useMemo(() => {
    if (!hoveredStadium || !teamMatches) return null;
    return (
      teamMatches
        .filter((m) => m.stadiumName === hoveredStadium.name)
        .sort((a, b) => a.date.localeCompare(b.date))[0] || null
    );
  }, [hoveredStadium, teamMatches]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ maxWidth: SVG_W }}>
      {/* Map title */}
      <div
        className="px-4 py-2 flex items-center gap-2 text-sm font-semibold"
        style={{ background: "rgba(0,0,0,0.6)", color: "#e0e8f0", borderBottom: `2px solid ${themeColor}40` }}
      >
        <span>🗺️</span>
        <span>Carte des stades — Coupe du Monde 2026</span>
        {teamMatches && teamMatches.length > 0 && (
          <span className="ml-auto text-xs" style={{ color: themeColor }}>
            {teamStadiumNames.size} stade{teamStadiumNames.size > 1 ? "s" : ""} sélectionné{teamStadiumNames.size > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* SVG Map */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-auto"
        style={{ display: "block", background: "linear-gradient(135deg, #0d1f35 0%, #071428 100%)" }}
      >
        <defs>
          <style>{`
            @keyframes venuePulseRing {
              0%   { r: 10; opacity: 0.8; }
              100% { r: 32; opacity: 0; }
            }
            @keyframes venuePulseIn {
              0%   { opacity: 0; transform: scale(0.3); }
              60%  { opacity: 1; transform: scale(1.2); }
              100% { opacity: 1; transform: scale(1); }
            }
            .pin-highlighted {
              animation: venuePulseIn 0.5s ease-out forwards;
            }
            .pulse-ring {
              animation: venuePulseRing 1.6s ease-out infinite;
            }
            .route-line {
              stroke-dashoffset: 1000;
              animation: drawRoute 1.2s ease-out forwards;
            }
            @keyframes drawRoute {
              from { stroke-dashoffset: 1000; }
              to   { stroke-dashoffset: 0; }
            }
          `}</style>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ocean / background */}
        <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#0d1f35" />

        {/* Canada */}
        <path
          d={borderToPath(CANADA_BORDER)}
          fill="#1a3528"
          stroke="#2d5a40"
          strokeWidth="1.5"
          opacity="0.95"
        />

        {/* USA */}
        <path
          d={borderToPath(USA_BORDER)}
          fill="#152238"
          stroke="#2a4a70"
          strokeWidth="1.5"
          opacity="0.95"
        />

        {/* Mexico */}
        <path
          d={borderToPath(MEXICO_BORDER)}
          fill="#251a10"
          stroke="#503520"
          strokeWidth="1.5"
          opacity="0.95"
        />

        {/* Zone labels */}
        {ZONE_LABELS.map(({ label, lat, lng, fill }) => {
          const { x, y } = toSVG(lat, lng);
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              fill={fill}
              fontSize="12"
              fontWeight="600"
              opacity="0.55"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {label}
            </text>
          );
        })}

        {/* Route line between team stadiums */}
        {routePath && (
          <path
            key={routePath}
            d={routePath}
            fill="none"
            stroke={themeColor}
            strokeWidth="2"
            strokeDasharray="8,5"
            opacity={fadeOut ? 0 : 0.75}
            className="route-line"
            style={{ transition: "opacity 0.4s ease" }}
          />
        )}

        {/* Stadium pins */}
        {stadiums.map((stadium) => {
          const { x, y } = toSVG(stadium.lat, stadium.lng);
          const isHighlighted = teamStadiumNames.has(stadium.name);
          const isHovered = hoveredStadium?.name === stadium.name;
          const isCityHighlighted =
            !!highlightedCity &&
            stadium.city.toLowerCase().includes(highlightedCity.toLowerCase());
          const pinOpacity = calcPinOpacity(fadeOut, visible, isHighlighted);

          return (
            <g
              key={stadium.name}
              transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredStadium(stadium)}
              onMouseLeave={() => setHoveredStadium(null)}
              onClick={() => {
                setClickedStadium(stadium === clickedStadium ? null : stadium);
                onStadiumClick?.(stadium);
              }}
            >
              {/* Pulse ring for city highlighted from MatchSchedule */}
              {isCityHighlighted && (
                <circle
                  r="10"
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="3"
                  className="pulse-ring"
                />
              )}

              {/* Glow halo for highlighted stadiums */}
              {isHighlighted && (
                <circle
                  r={isHovered ? 18 : 14}
                  fill={themeColor}
                  opacity={pinOpacity * 0.25}
                  filter="url(#glow)"
                  style={{ transition: "all 0.4s ease" }}
                />
              )}

              {/* Main pin circle */}
              <circle
                r={isHovered ? 10 : isHighlighted ? 8 : 5}
                fill={isHighlighted ? themeColor : "#3a5a7a"}
                stroke={isHovered ? "#ffffff" : isHighlighted ? "#ffffffcc" : "#2a4060"}
                strokeWidth={isHovered ? 2.5 : 1.5}
                opacity={pinOpacity}
                filter={isHighlighted ? "url(#glow)" : undefined}
                className={isHighlighted && visible && !fadeOut ? "pin-highlighted" : undefined}
                style={{ transition: "r 0.3s ease, opacity 0.4s ease" }}
              />

              {/* Stadium emoji above highlighted pins */}
              {isHighlighted && (
                <text
                  y={-14}
                  textAnchor="middle"
                  fontSize="11"
                  opacity={pinOpacity}
                  style={{ pointerEvents: "none", userSelect: "none", transition: "opacity 0.4s ease" }}
                >
                  🏟️
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {hoveredStadium &&
          (() => {
            const { x, y } = toSVG(hoveredStadium.lat, hoveredStadium.lng);
            const tw = 180;
            const th = nextMatch ? 85 : 65;
            const tx = Math.min(x + 14, SVG_W - tw - 6);
            const ty = Math.max(y - th - 10, 6);
            return (
              <g transform={`translate(${tx.toFixed(1)},${ty.toFixed(1)})`} style={{ pointerEvents: "none" }}>
                <rect
                  x="0" y="0"
                  width={tw} height={th}
                  rx="8"
                  fill="#07111f"
                  fillOpacity="0.97"
                  stroke="#2a4a70"
                  strokeWidth="1"
                />
                <text x="10" y="17" fill="#e8f0ff" fontSize="11" fontWeight="700">
                  {hoveredStadium.name.length > MAX_TOOLTIP_NAME_LENGTH
                    ? hoveredStadium.name.slice(0, MAX_TOOLTIP_NAME_LENGTH - 1) + "…"
                    : hoveredStadium.name}
                </text>
                <text x="10" y="31" fill="#7a9ab5" fontSize="10">
                  📍 {hoveredStadium.city}
                </text>
                <text x="10" y="45" fill="#7a9ab5" fontSize="10">
                  👥 {hoveredStadium.capacity.toLocaleString()} places
                </text>
                {nextMatch && (
                  <text x="10" y="59" fill="#7a9ab5" fontSize="10">
                    📅 {nextMatch.date} — {nextMatch.homeTeam} vs {nextMatch.awayTeam}
                  </text>
                )}
                <text x="10" y={nextMatch ? 73 : 58} fill="#4a6a8a" fontSize="9">
                  Cliquer pour plus d&apos;infos
                </text>
              </g>
            );
          })()}
      </svg>

      {/* Mini-card on click */}
      {clickedStadium && (
        <div
          className="absolute bottom-4 right-4 rounded-xl p-4 shadow-2xl z-10"
          style={{
            background: "linear-gradient(135deg, #07111f 0%, #0d1f35 100%)",
            border: `2px solid ${themeColor}`,
            minWidth: "200px",
            maxWidth: "260px",
          }}
        >
          <button
            className="absolute top-2 right-3 text-gray-400 hover:text-white text-lg font-bold leading-none"
            onClick={() => setClickedStadium(null)}
            aria-label="Fermer"
          >
            ×
          </button>

          <div className="text-4xl mb-2 text-center">🏟️</div>

          <h3 className="text-white font-bold text-sm mb-1 pr-4">{clickedStadium.name}</h3>

          <p className="text-gray-400 text-xs mb-0.5">
            📍 {clickedStadium.city},{" "}
            {COUNTRY_FLAGS[clickedStadium.country] ?? "🌍"}{" "}
            {clickedStadium.country}
          </p>

          <p className="text-gray-400 text-xs mb-0.5">
            👥 {clickedStadium.capacity.toLocaleString()} places
          </p>

          <p className="text-gray-300 text-xs mt-2 leading-snug">
            {clickedStadium.description}
          </p>

          {teamMatches && teamMatches.filter((m) => m.stadiumName === clickedStadium.name).length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs font-semibold mb-1" style={{ color: themeColor }}>
                Matchs ici :
              </p>
              {teamMatches
                .filter((m) => m.stadiumName === clickedStadium.name)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 3)
                .map((m) => (
                  <p key={m.id} className="text-xs text-gray-400 leading-snug">
                    {m.date} — {m.homeTeam} vs {m.awayTeam}
                  </p>
                ))}
            </div>
          )}

          <a
            href={`https://wttr.in/${encodeURIComponent(clickedStadium.city)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold text-white text-center block"
            style={{ background: themeColor }}
          >
            🌤️ Météo à {clickedStadium.city}
          </a>
        </div>
      )}
    </div>
  );
}
