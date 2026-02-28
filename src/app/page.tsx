"use client";

import { TeamCard } from "@/components/team-card";
import { MatchSchedule } from "@/components/match-schedule";
import { GroupView } from "@/components/group-view";
import { TournamentBracket } from "@/components/tournament-bracket";
import { WeatherCard } from "@/components/weather";
import { MoonCard } from "@/components/moon";
import { VenueMap } from "@/components/venue-map";
import { AgentState, Confederation, MatchInfo, MatchPhase, StadiumInfo } from "@/lib/types";
import { stadiums as allStadiums, groups, matches, teams } from "@/lib/worldcup-data";
import { FlagImg, getFlagUrl } from "@/lib/flags";
import { useCoAgent, useCopilotAction, useCopilotChat, useCopilotMessagesContext, useCopilotReadable } from "@copilotkit/react-core";
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql";
import { CopilotKitCSSProperties, CopilotPopup, CopilotSidebar, useCopilotChatSuggestions } from "@copilotkit/react-ui";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ── Mobile detection ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ── WelcomeScreen WC2026 ──────────────────────────────────────────────────────
const CONF_EMOJI: Record<Confederation, string> = {
  UEFA: "🏰", CONMEBOL: "🌎", CAF: "🌍", AFC: "🌏", CONCACAF: "🗽", OFC: "🌊",
};
const CONF_ORDER: Confederation[] = ["UEFA", "CONMEBOL", "CAF", "AFC", "CONCACAF", "OFC"];
const HOST_FLAGS = ["us", "mx", "ca"];
const HOST_NAMES = ["United States", "Mexico", "Canada"];
const WC_TARGET_DATE = new Date("2026-06-11T18:00:00Z");

function WelcomeScreen({
  onSuggestionClick,
  onTeamClick,
  themeColor,
}: {
  onSuggestionClick?: (msg: string) => void;
  onTeamClick?: (fifaCode: string) => void;
  themeColor: string;
}) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [flagIndex, setFlagIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const diff = WC_TARGET_DATE.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setFlagIndex((i) => (i + 1) % 3), 1800);
    return () => clearInterval(id);
  }, []);

  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.fifaCode.toLowerCase().includes(search.toLowerCase())
  );
  const teamsByConf = CONF_ORDER.map((conf) => ({
    conf,
    teams: filteredTeams.filter((t) => t.confederation === conf),
  })).filter((g) => g.teams.length > 0);

  const favorites = [...teams].sort((a, b) => a.fifaRanking - b.fifaRanking).slice(0, 6);
  const copaSuggestions = [
    "🇫🇷 Show me France's matches",
    "⚽ Compare Brazil vs Argentina",
    "🏟️ What stadiums host the tournament?",
    "🌍 Show the group standings",
    "🏆 Show the tournament bracket",
    "📊 Which teams are favorites?",
  ];

  return (
    <div className="welcome-fade-in min-h-screen pb-16" style={{
      background: "#0a0a0a",
    }}>
      {/* ── Full-screen Hero ── */}
      <div style={{ position: "relative", overflow: "hidden", minHeight: "85vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Stadium background — full bleed */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80')",
          backgroundSize: "cover", backgroundPosition: "center 30%",
          filter: "brightness(0.25) saturate(1.4)",
        }} />
        {/* Color overlays */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(180deg, rgba(200,16,46,0.15) 0%, rgba(10,10,10,0.7) 40%, rgba(0,122,61,0.15) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "radial-gradient(ellipse at 50% 100%, rgba(10,10,10,0.95) 0%, transparent 70%)",
        }} />
        {/* Animated glow orbs */}
        <div style={{ position: "absolute", top: "5%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: "rgba(200,16,46,0.12)", filter: "blur(100px)", animation: "float 8s ease-in-out infinite", zIndex: 1 }} />
        <div style={{ position: "absolute", top: "20%", right: "5%", width: 250, height: 250, borderRadius: "50%", background: "rgba(0,85,164,0.10)", filter: "blur(80px)", animation: "float 10s ease-in-out infinite reverse", zIndex: 1 }} />
        <div style={{ position: "absolute", bottom: "10%", left: "30%", width: 350, height: 350, borderRadius: "50%", background: "rgba(0,122,61,0.08)", filter: "blur(120px)", animation: "float 12s ease-in-out infinite", zIndex: 1 }} />
        {/* Particle-like subtle dots */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, opacity: 0.03,
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        <div className="text-center" style={{ position: "relative", zIndex: 2, padding: "2rem 1rem 3rem" }}>
          {/* WC2026 Official Logo */}
          <div style={{ marginBottom: "1.5rem" }}>
            <img
              src="https://upload.wikimedia.org/wikipedia/en/thumb/1/17/2026_FIFA_World_Cup_emblem.svg/250px-2026_FIFA_World_Cup_emblem.svg.png"
              alt="FIFA World Cup 2026"
              width={200}
              height={260}
              style={{
                margin: "0 auto", display: "block", maxWidth: "45%", height: "auto",
                filter: "drop-shadow(0 8px 40px rgba(255,255,255,0.25))",
                animation: "heroLogoFloat 6s ease-in-out infinite",
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>

          {/* Main title */}
          <div className="text-5xl md:text-8xl font-black mb-2 wc-gradient-text tracking-tighter" style={{ lineHeight: 1.05, textShadow: "0 4px 40px rgba(0,0,0,0.9)" }}>
            WORLD CUP
          </div>
          <div className="text-5xl md:text-8xl font-black mb-2 tracking-tighter" style={{
            lineHeight: 1.05,
            background: "linear-gradient(90deg, #c8102e, #fff, #007a3d)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
          }}>
            2026
          </div>

          {/* Tagline */}
          <p style={{
            color: "rgba(255,255,255,0.6)", fontSize: "1rem", fontWeight: 300,
            letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "2rem",
          }}>
            We Are 26
          </p>

          {/* Host flags with glowing highlight */}
          <div className="flex items-center justify-center gap-8 mb-4">
            {HOST_FLAGS.map((iso, i) => (
              <div key={iso} style={{ textAlign: "center", transition: "all 0.5s ease" }}>
                <img
                  src={`https://flagcdn.com/w80/${iso}.png`}
                  alt={HOST_NAMES[i]}
                  width={64}
                  height={43}
                  style={{
                    opacity: flagIndex === i ? 1 : 0.35,
                    transform: flagIndex === i ? "scale(1.25)" : "scale(0.95)",
                    transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    borderRadius: "6px",
                    boxShadow: flagIndex === i ? `0 8px 32px rgba(255,255,255,0.25), 0 0 0 2px rgba(255,255,255,0.3)` : "none",
                  }}
                  title={HOST_NAMES[i]}
                />
                <div style={{
                  marginTop: "6px", fontSize: "0.65rem", fontWeight: 600,
                  color: flagIndex === i ? "#fff" : "rgba(255,255,255,0.3)",
                  transition: "color 0.5s ease", textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {HOST_NAMES[i]}
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", letterSpacing: "0.15em", marginBottom: "2.5rem" }}>
            June 11 – July 19, 2026 · 48 Teams · 16 Stadiums · 3 Nations
          </p>

          {/* Countdown — glass morphism style */}
          {mounted && (
            <div className="flex gap-4 md:gap-6 justify-center flex-wrap mb-6">
              {[
                { label: "DAYS", value: timeLeft.days },
                { label: "HRS", value: timeLeft.hours },
                { label: "MIN", value: timeLeft.minutes },
                { label: "SEC", value: timeLeft.seconds },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "1.25rem",
                    padding: "1rem 1.25rem",
                    minWidth: "80px",
                    textAlign: "center",
                    backdropFilter: "blur(16px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: 900,
                      lineHeight: 1,
                      color: "#fff",
                      fontVariantNumeric: "tabular-nums",
                      textShadow: `0 0 30px ${themeColor}80`,
                      animation: label === "SEC" ? "countdownPulse 1s ease-in-out infinite" : undefined,
                    }}
                  >
                    {String(value).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      fontSize: "0.55rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      marginTop: "6px",
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scroll indicator */}
          <div style={{ animation: "scrollBounce 2s ease-in-out infinite", marginTop: "1rem" }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.5rem" }}>↓</span>
          </div>
        </div>
      </div>

      {/* ── Featured stadiums carousel ── */}
      <div style={{ maxWidth: "1100px", margin: "-3rem auto 2rem", padding: "0 1rem", position: "relative", zIndex: 3 }}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
          {[
            { name: "MetLife Stadium", city: "New York", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80", capacity: "82,500" },
            { name: "SoFi Stadium", city: "Los Angeles", img: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=400&q=80", capacity: "70,240" },
            { name: "AT&T Stadium", city: "Dallas", img: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&q=80", capacity: "80,000" },
            { name: "Hard Rock Stadium", city: "Miami", img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&q=80", capacity: "64,767" },
          ].map((stadium) => (
            <div key={stadium.name} style={{
              flex: "0 0 280px", borderRadius: "1rem", overflow: "hidden", position: "relative",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer", transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.5)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              <div style={{
                height: "140px", backgroundImage: `url('${stadium.img}')`,
                backgroundSize: "cover", backgroundPosition: "center",
                filter: "brightness(0.6) saturate(1.3)",
              }} />
              <div style={{ padding: "0.75rem 1rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{stadium.name}</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>{stadium.city} · {stadium.capacity}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ maxWidth: "42rem", margin: "0 auto 2rem", padding: "0 1rem" }}>
        <input
          type="text"
          placeholder="🔍 Search teams... (e.g. France, BRA, UEFA)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "2rem",
            padding: "0.85rem 1.5rem",
            color: "white",
            fontSize: "0.95rem",
            backdropFilter: "blur(12px)",
            outline: "none",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
          onFocus={(e) => { e.target.style.borderColor = `${themeColor}80`; e.target.style.boxShadow = `0 4px 24px ${themeColor}20`; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"; }}
        />
      </div>

      {/* ── Favorites ── */}
      {!search && (
        <div style={{ maxWidth: "64rem", margin: "0 auto 2.5rem", padding: "0 1rem" }}>
          <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            ⭐ Tournament Favorites
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {favorites.map((team, i) => (
              <button
                key={team.fifaCode}
                onClick={() => onTeamClick?.(team.fifaCode)}
                className="stagger-item"
                style={{
                  background: `linear-gradient(135deg, ${team.primaryColor}20, ${team.primaryColor}08)`,
                  border: `1px solid ${team.primaryColor}50`,
                  borderRadius: "2rem",
                  padding: "0.5rem 1.2rem 0.5rem 0.5rem",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  animationDelay: `${i * 0.08}s`,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06) translateY(-2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 28px ${team.primaryColor}40`;
                  (e.currentTarget as HTMLButtonElement).style.background = `${team.primaryColor}35`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                  (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${team.primaryColor}20, ${team.primaryColor}08)`;
                }}
              >
                {getFlagUrl(team.fifaCode, 80) ? (
                  <img
                    src={getFlagUrl(team.fifaCode, 80)}
                    alt=""
                    width={36}
                    height={24}
                    style={{ borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", flexShrink: 0 }}
                  />
                ) : (
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>🏳️</span>
                )}
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "white", lineHeight: 1.1 }}>
                    {team.name}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>#{team.fifaRanking} FIFA</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Teams by confederation ── */}
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "0 1rem" }}>
        {teamsByConf.map(({ conf, teams: confTeams }, gi) => (
          <div key={conf} style={{ marginBottom: "2rem" }}>
            <h2
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "rgba(255,255,255,0.7)",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>{CONF_EMOJI[conf]}</span>
              <span>{conf}</span>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>
                ({confTeams.length} teams)
              </span>
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {confTeams.map((team, ti) => (
                <button
                  key={team.fifaCode}
                  onClick={() => onTeamClick?.(team.fifaCode)}
                  className="stagger-item"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${team.primaryColor}30`,
                    borderRadius: "0.75rem",
                    padding: "0.5rem 0.35rem",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    animationDelay: `${gi * 0.1 + ti * 0.03}s`,
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = `${team.primaryColor}20`;
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px ${team.primaryColor}30`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                  }}
                  title={`${team.name} (${team.fifaCode})`}
                >
                  <FlagImg fifaCode={team.fifaCode} width={40} height={28} style={{ borderRadius: "3px", margin: "0 auto 0.2rem", display: "block", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "rgba(255,255,255,0.8)", lineHeight: 1.2 }}>
                    {team.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Copa suggestions ── */}
      {onSuggestionClick && (
        <div style={{ maxWidth: "42rem", margin: "2rem auto 0", padding: "0 1rem" }}>
          <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            💬 Ask Copa
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {copaSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                className="stagger-item"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "2rem",
                  padding: "0.5rem 1rem",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  animationDelay: `${i * 0.07}s`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = themeColor;
                  (e.currentTarget as HTMLButtonElement).style.color = "white";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 20px ${themeColor}40`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── FIFA Sources footer ── */}
      <div style={{ maxWidth: "42rem", margin: "3rem auto 0", padding: "0 1rem 2rem", textAlign: "center" }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.25rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <a href="https://digitalhub.fifa.com/m/1be9ce37eb98fcc5/original/FWC26-Match-Schedule_English.pdf" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "2rem", padding: "0.4rem 0.85rem", color: "rgba(255,255,255,0.65)", fontSize: "0.75rem", textDecoration: "none", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
            >📄 Official Match Schedule (PDF)</a>
            <a href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/standings" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "2rem", padding: "0.4rem 0.85rem", color: "rgba(255,255,255,0.65)", fontSize: "0.75rem", textDecoration: "none", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
            >📊 Group Standings</a>
            <a href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "2rem", padding: "0.4rem 0.85rem", color: "rgba(255,255,255,0.65)", fontSize: "0.75rem", textDecoration: "none", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
            >⚽ FIFA.com Schedule</a>
          </div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem" }}>
            Data sourced from official FIFA World Cup 2026™ draw (December 2025)
          </p>
        </div>
      </div>
    </div>
  );
}

// Fonction pour extraire les couleurs depuis le texte colors
function extractColors(colorsText: string): { primary: string; secondary: string } {
  const colorMap: Record<string, string> = {
    "red": "#DC143C", "crimson": "#DC143C", "scarlet": "#DC143C",
    "blue": "#1E40AF", "navy": "#001F3F", "royal": "#4169E1",
    "green": "#16A34A", "emerald": "#10B981",
    "white": "#F5F5F5", "ivory": "#FFFFF0",
    "yellow": "#FBBF24", "gold": "#FFD700", "golden": "#FFD700",
    "black": "#1F2937", "dark": "#1F2937",
    "orange": "#F97316",
    "purple": "#9333EA", "violet": "#9333EA",
    "pink": "#EC4899", "rose": "#FB7185",
    "sky": "#0EA5E9", "light blue": "#38BDF8", "azure": "#0EA5E9",
    "silver": "#C0C0C0", "grey": "#6B7280", "gray": "#6B7280",
    "maroon": "#800000", "burgundy": "#800020",
    "rouge": "#DC143C", "grenat": "#800020",
    "bleu": "#1E40AF", "azur": "#0EA5E9",
    "vert": "#16A34A", "verts": "#16A34A",
    "blanc": "#F5F5F5", "blancs": "#F5F5F5",
    "jaune": "#FBBF24", "or": "#FFD700", "doré": "#FFD700",
    "noir": "#1F2937", "noirs": "#1F2937",
    "gris": "#6B7280", "argent": "#C0C0C0",
  };
  const lower = colorsText.toLowerCase();
  let primary = "#6366f1";
  let secondary = "#F5F5F5";
  const parts = lower.split(/\s+(?:and|et|&|,)\s+|\s+/);
  const foundColors: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (colorMap[trimmed]) foundColors.push(colorMap[trimmed]);
  }
  if (foundColors.length >= 1) primary = foundColors[0];
  if (foundColors.length >= 2) secondary = foundColors[1];
  return { primary, secondary };
}

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [countryFlag, setCountryFlag] = useState<string>("");
  const isMobile = useIsMobile();

  // 🪁 Frontend Actions
  useCopilotAction({
    name: "setThemeColor",
    parameters: [{
      name: "themeColor",
      description: "The theme color to set. Make sure to pick nice colors.",
      required: true,
    }],
    handler({ themeColor }) {
      setThemeColor(themeColor);
    },
  });

  const chatLabels = {
    title: "⚽ Copa — Expert WC2026",
    initial: "Hey there! I'm Copa, your World Cup 2026 expert 🏆. Ask me about any team, stadium, or matchup! 🌍⚽",
  };

  const contentProps = {
    themeColor,
    secondaryColor,
    clubLogo,
    clubName,
    backgroundImage,
    countryFlag,
    setThemeColor,
    setSecondaryColor,
    setClubLogo,
    setClubName,
    setBackgroundImage,
    setCountryFlag,
  };

  return (
    <main style={{ "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties}>
      {isMobile ? (
        <CopilotPopup
          labels={chatLabels}
          className="copilot-popup-mobile"
          defaultOpen={false}
          clickOutsideToClose={true}
        >
          <YourMainContent {...contentProps} />
        </CopilotPopup>
      ) : (
        <CopilotSidebar
          labels={chatLabels}
          className="copilot-sidebar-custom"
          defaultOpen={true}
          clickOutsideToClose={false}
        >
          <YourMainContent {...contentProps} />
        </CopilotSidebar>
      )}
    </main>
  );
}

// ── Mobile tab type ───────────────────────────────────────────────────────────
type MobileTab = "team" | "matches" | "map" | "group" | "bracket";

function YourMainContent({
  themeColor, secondaryColor, clubLogo, clubName, backgroundImage, countryFlag,
  setThemeColor, setSecondaryColor, setClubLogo, setClubName, setBackgroundImage, setCountryFlag
}: {
  themeColor: string;
  secondaryColor: string;
  clubLogo: string | null;
  clubName: string;
  backgroundImage: string;
  countryFlag: string;
  setThemeColor: (c: string) => void;
  setSecondaryColor: (c: string) => void;
  setClubLogo: (l: string | null) => void;
  setClubName: (n: string) => void;
  setBackgroundImage: (b: string) => void;
  setCountryFlag: (f: string) => void;
}) {
  // 🪁 Shared State
  const { state, setState } = useCoAgent<AgentState>({
    name: "my_agent",
    initialState: {
      teamInfo: null,
      matches: [],
      selectedStadium: null,
      tournamentView: null,
      highlightedCity: null,
    },
  });

  const { appendMessage } = useCopilotChat();

  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<MobileTab>("team");
  const [selectedPhase, setSelectedPhase] = useState<MatchPhase | null>(null);

  // 📖 AG-UI: Provide app context to the agent via useCopilotReadable
  const currentTeamSummary = useMemo(() => {
    if (!state.teamInfo) return "No team selected. User is on the welcome screen.";
    const t = state.teamInfo;
    const group = groups.find((g) => g.teams.includes(t.fifaCode));
    const teamMatches = state.matches
      .filter((m) => m.phase === "group")
      .map((m) => `${m.homeTeam} vs ${m.awayTeam} on ${m.date} at ${m.stadiumName}`)
      .join("; ");
    return `Currently viewing: ${t.name} (${t.fifaCode}), Group ${group?.name ?? "?"}, Ranking #${t.fifaRanking}, Coach: ${t.coach}. Group matches: ${teamMatches}`;
  }, [state.teamInfo, state.matches]);

  useCopilotReadable({
    description: "Current WC2026 app state — which team the user is viewing",
    value: currentTeamSummary,
  });

  // 💡 AG-UI: Dynamic chat suggestions based on current state
  const suggestionsContext = useMemo(() => {
    if (!state.teamInfo) {
      return "The user is on the welcome screen. Suggest asking about a specific team (e.g. 'Show me Brazil', 'Tell me about France'), viewing the tournament bracket, or comparing two teams.";
    }
    const t = state.teamInfo;
    const group = groups.find((g) => g.teams.includes(t.fifaCode));
    const opponents = group?.teams.filter((c) => c !== t.fifaCode) ?? [];
    const firstMatch = state.matches.find((m) => m.phase === "group");
    const firstOpponent = firstMatch
      ? (firstMatch.homeTeam === t.fifaCode ? firstMatch.awayTeam : firstMatch.homeTeam)
      : opponents[0];
    return `The user is viewing ${t.name} (${t.fifaCode}) in Group ${group?.name ?? "?"}. Suggest: comparing with opponent '${firstOpponent}', showing Group ${group?.name} standings, asking about their stadium, or switching to another popular team. Keep suggestions short and football-focused.`;
  }, [state.teamInfo, state.matches]);

  useCopilotChatSuggestions({
    instructions: suggestionsContext,
    minSuggestions: 2,
    maxSuggestions: 3,
  }, [suggestionsContext]);

  // Known FIFA codes for team detection
  const fifaCodesSet = useRef(new Set(teams.map((t) => t.fifaCode)));

  // 🏳️ Helper: load a team by code into state
  const loadTeamByCode = useCallback((code: string) => {
    const team = teams.find(
      (t) => t.fifaCode.toUpperCase() === code.toUpperCase() || t.name.toLowerCase() === code.toLowerCase()
    );
    if (!team) return;
    const teamMatches = matches.filter(
      (m) => m.homeTeam === team.fifaCode || m.awayTeam === team.fifaCode
    );
    setState({
      teamInfo: team,
      matches: teamMatches,
      selectedStadium: null,
      tournamentView: null,
      highlightedCity: null,
    });
  }, [setState]);

  // 🔄 Text-based fallback: detect team from agent messages (backup for client-side update_team_info)
  const lastDetectedTeam = useRef<string | null>(null);
  const { messages: contextMessages } = useCopilotMessagesContext();

  useEffect(() => {
    if (!contextMessages || contextMessages.length === 0) return;
    for (let i = contextMessages.length - 1; i >= 0; i--) {
      const msg = contextMessages[i];
      if (msg.isTextMessage() && (msg as TextMessage).role === MessageRole.Assistant) {
        const content = (msg as TextMessage).content;
        if (!content || content.length < 20) break;
        const codeMatches = content.match(/\(([A-Z]{3})\)/g);
        if (codeMatches) {
          for (const m of codeMatches) {
            const code = m.slice(1, 4);
            if (fifaCodesSet.current.has(code) && code !== lastDetectedTeam.current) {
              console.log(`[Copa] Text fallback team switch: ${lastDetectedTeam.current} → ${code}`);
              lastDetectedTeam.current = code;
              loadTeamByCode(code);
              return;
            }
          }
        }
        break;
      }
    }
  }, [contextMessages, loadTeamByCode]);

  // 🏠 Return to welcome screen
  const goHome = useCallback(() => {
    setState({ teamInfo: null, matches: [], selectedStadium: null, tournamentView: null, highlightedCity: null });
    setClubName("");
    setCountryFlag("");
    setThemeColor("#6366f1");
    setSecondaryColor("#ffffff");
    setBackgroundImage("");
    lastDetectedTeam.current = null;
  }, [setState, setClubName, setCountryFlag, setThemeColor, setSecondaryColor, setBackgroundImage]);

  // Cross-component: clicking a team in GroupView triggers compare_teams in chat
  const handleTeamClick = (teamCode: string) => {
    const currentTeam = state.teamInfo?.name ?? state.teamInfo?.fifaCode;
    const message = currentTeam
      ? `Compare ${currentTeam} and ${teamCode}`
      : `Tell me about ${teamCode}`;
    appendMessage(new TextMessage({ role: MessageRole.User, content: message }));
    if (!currentTeam) loadTeamByCode(teamCode);
  };

  // Cross-component: clicking a phase in TournamentBracket filters the schedule
  const handlePhaseClick = (phase: MatchPhase) => {
    setSelectedPhase((prev) => (prev === phase ? null : phase));
  };

  // Filtered matches for bracket phase selection
  const filteredMatches = selectedPhase
    ? matches.filter((m) => m.phase === selectedPhase)
    : matches;

  // 🎨 Apply team colors when teamInfo changes
  useEffect(() => {
    if (state.teamInfo) {
      setThemeColor(state.teamInfo.primaryColor);
      setSecondaryColor(state.teamInfo.secondaryColor);
      setClubName(state.teamInfo.name);
      setCountryFlag(state.teamInfo.flag);
      setActiveTab("team");
    }
  }, [state.teamInfo, setThemeColor, setSecondaryColor, setClubName, setCountryFlag]);

  // 🪁 Generative UI
  useCopilotAction({
    name: "get_weather",
    description: "Get the weather for a given location.",
    available: "disabled",
    parameters: [{ name: "location", type: "string", required: true }],
    render: ({ args }) => <WeatherCard location={args.location} themeColor={themeColor} />,
  }, [themeColor]);

  useCopilotAction({
    name: "go_to_moon",
    description: "Go to the moon on request. This action requires human approval and will render the MoonCard UI for confirmation.",
    available: "disabled",
    renderAndWaitForResponse: ({ respond, status }) => (
      <MoonCard themeColor={themeColor} status={status} respond={respond} />
    ),
  }, [themeColor]);

  // 🏟️ Action to receive club info from the agent
  useCopilotAction({
    name: "update_club_info",
    description: "Update the displayed club information with history, legends, and achievements.",
    parameters: [{ name: "club_info", description: "Complete club information", required: true }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler(args: any) {
      const club_info = args?.club_info as Record<string, unknown> | undefined;
      const name = typeof club_info?.name === "string" ? club_info.name : "";
      const colors = typeof club_info?.colors === "string" ? club_info.colors : "blue white";
      const country = typeof club_info?.country === "string" ? club_info.country : "";
      if (name) {
        const extracted = extractColors(colors);
        setThemeColor(extracted.primary);
        setSecondaryColor(extracted.secondary);
        setClubLogo(null);
        setBackgroundImage("");
        setClubName(name);
        setCountryFlag(country);
        setState({ teamInfo: null, matches: [], selectedStadium: null, tournamentView: null, highlightedCity: null });
      }
    },
  }, [setThemeColor, setSecondaryColor, setClubName, setClubLogo, setBackgroundImage, setCountryFlag, setState]);

  // ⚽ Client-side tool: update_team_info — updates UI state AND returns data to agent
  useCopilotAction({
    name: "update_team_info",
    description:
      "Load a national team into the frontend page. " +
      "MUST be called IMMEDIATELY whenever a national team is mentioned. " +
      "Accepts the FIFA three-letter code (e.g. 'FRA', 'BRA', 'ARG') or the team name (e.g. 'France'). " +
      "Returns the full team data and match schedule as JSON. " +
      "IMPORTANT: Do NOT call any other tool in the same turn as this tool.",
    parameters: [
      { name: "team_code", type: "string", description: "FIFA three-letter code (e.g. 'FRA') or team name (e.g. 'France').", required: true },
    ],
    handler: async ({ team_code }: { team_code: string }) => {
      if (!team_code) return "Missing team_code parameter.";
      const code = team_code.trim().toUpperCase();
      const team = teams.find(
        (t) => t.fifaCode.toUpperCase() === code || t.name.toLowerCase() === team_code.toLowerCase()
      );
      if (!team) {
        return `Team '${team_code}' not found in WC2026 roster.`;
      }
      const teamMatches = matches.filter(
        (m) => m.homeTeam === team.fifaCode || m.awayTeam === team.fifaCode
      );
      // Update React state → triggers UI change (colors, team card, matches, map)
      setState({
        teamInfo: team,
        matches: teamMatches,
        selectedStadium: null,
        tournamentView: null,
        highlightedCity: null,
      });
      console.log(`[Copa] update_team_info(${team.fifaCode}) → ${team.name}, ${teamMatches.length} matches`);
      return JSON.stringify({ team, matches: teamMatches });
    },
  }, [setState]);

  // 🏟️ Generative UI: render rich stadium card in chat when agent calls get_stadium_info
  useCopilotAction({
    name: "get_stadium_info",
    description: "Show details about a WC2026 host stadium.",
    available: "disabled",
    parameters: [
      { name: "stadium_name", type: "string", description: "Stadium name", required: true },
    ],
    render: ({ args, status }) => {
      const stadium = allStadiums.find(
        (s) => s.name.toLowerCase().includes((args.stadium_name ?? "").toLowerCase())
      );
      if (!stadium) return <div className="p-2 text-sm opacity-60">Looking up stadium…</div>;
      return (
        <div className="rounded-lg border p-3 my-2 text-sm" style={{ borderColor: themeColor }}>
          <div className="font-bold text-base">🏟️ {stadium.name}</div>
          <div className="opacity-80">{stadium.city}, {stadium.country} • Capacity: {stadium.capacity.toLocaleString()}</div>
          {stadium.description && <div className="mt-1 italic opacity-70">{stadium.description}</div>}
          {status === "inProgress" && <div className="mt-1 animate-pulse text-xs opacity-50">Loading details…</div>}
        </div>
      );
    },
  }, [themeColor]);

  // 🆚 Generative UI: render comparison card when agent calls compare_teams
  useCopilotAction({
    name: "compare_teams",
    description: "Compare two national teams side by side.",
    available: "disabled",
    parameters: [
      { name: "team_a", type: "string", description: "First team FIFA code", required: true },
      { name: "team_b", type: "string", description: "Second team FIFA code", required: true },
    ],
    render: ({ args, status }) => {
      const a = teams.find((t) => t.fifaCode === (args.team_a ?? "").toUpperCase());
      const b = teams.find((t) => t.fifaCode === (args.team_b ?? "").toUpperCase());
      if (!a || !b) return <div className="p-2 text-sm opacity-60">Loading comparison…</div>;
      return (
        <div className="rounded-lg border p-3 my-2 text-sm">
          <div className="font-bold text-base mb-2">⚔️ {a.name} vs {b.name}</div>
          <div className="grid grid-cols-3 gap-1 text-center text-xs">
            <div className="font-semibold">{a.flag} {a.fifaCode}</div>
            <div className="opacity-50">vs</div>
            <div className="font-semibold">{b.flag} {b.fifaCode}</div>
            <div>#{a.fifaRanking}</div>
            <div className="opacity-50">Ranking</div>
            <div>#{b.fifaRanking}</div>
            <div>{a.worldCupHistory.titles}🏆</div>
            <div className="opacity-50">Titles</div>
            <div>{b.worldCupHistory.titles}🏆</div>
            <div>{a.coach}</div>
            <div className="opacity-50">Coach</div>
            <div>{b.coach}</div>
          </div>
          {status === "inProgress" && <div className="mt-1 animate-pulse text-xs opacity-50">Analyzing matchup…</div>}
        </div>
      );
    },
  }, []);

  // 🏆 Frontend handler: show_tournament_bracket → switch UI to bracket view
  useCopilotAction({
    name: "show_tournament_bracket",
    description: "Switch frontend to the tournament bracket (knockout stage) view.",
    available: "disabled",
    parameters: [],
    render: ({ status }) => {
      if (status === "complete" && state.tournamentView !== "bracket") {
        setState({ ...state, teamInfo: null, matches: [], selectedStadium: null, tournamentView: "bracket", highlightedCity: null });
      }
      return <div className="p-2 text-sm">🏆 {status === "inProgress" ? "Loading bracket..." : "Bracket view activated!"}</div>;
    },
  }, [state, setState]);

  // 🌍 Frontend handler: get_group_standings → switch UI to group view
  useCopilotAction({
    name: "get_group_standings",
    description: "Show group standings view.",
    available: "disabled",
    parameters: [
      { name: "group", type: "string", description: "Group letter A–L", required: true },
    ],
    render: ({ status }) => {
      if (status === "complete" && state.tournamentView !== "group") {
        setState({ ...state, teamInfo: null, matches: [], selectedStadium: null, tournamentView: "group", highlightedCity: null });
      }
      return <div className="p-2 text-sm">🌍 {status === "inProgress" ? "Loading groups..." : "Group view activated!"}</div>;
    },
  }, [state, setState]);

  // 📅 Match click → highlight city on map
  function handleMatchClick(match: MatchInfo) {
    const stadiumDetails = allStadiums.find((s) => s.name === match.stadiumName);
    if (stadiumDetails) {
      setState({ ...state, highlightedCity: stadiumDetails.city });
    }
  }

  // 🆚 Opponent flag click → compare_teams in chat
  function handleOpponentClick(opponentCode: string) {
    const teamCode = state.teamInfo?.fifaCode ?? "";
    if (teamCode) {
      appendMessage(
        new TextMessage({
          role: MessageRole.User,
          content: `Compare the teams: ${teamCode} vs ${opponentCode}`,
        })
      );
    }
  }

  // Mobile tab change handler (syncs with tournamentView state)
  const handleMobileTabChange = (tab: MobileTab) => {
    setActiveTab(tab);
    if (tab === "group") {
      setState({ ...state, tournamentView: "group" });
    } else if (tab === "bracket") {
      setState({ ...state, tournamentView: "bracket" });
    } else if (state.tournamentView) {
      setState({ ...state, tournamentView: null });
    }
  };

  const showGroupView = state.tournamentView === "group";
  const showBracket = state.tournamentView === "bracket";
  const hasTeam = !!state.teamInfo;
  // Derive matches from teamInfo.fifaCode so the map always updates even if
  // AG-UI state sync resets state.matches after server tools complete.
  const safeMatches = useMemo(() => {
    const code = state.teamInfo?.fifaCode;
    if (!code) return [];
    return matches.filter((m) => m.homeTeam === code || m.awayTeam === code);
  }, [state.teamInfo?.fifaCode]);
  const hasMatches = safeMatches.length > 0;

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        transition: "background 0.6s ease",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${themeColor}15 0%, #0a0a0a 60%, ${themeColor}08 100%)`,
      }}
    >
      {/* Background image overlay — stadium for team context */}
      {hasTeam && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            filter: "brightness(0.12) saturate(1.3)",
            transition: "all 0.8s ease",
            zIndex: 0,
          }}
        />
      )}
      {hasTeam && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 0,
            background: `radial-gradient(ellipse at 50% 0%, ${themeColor}20 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, ${themeColor}10 0%, transparent 60%)`,
            transition: "background 0.6s ease",
          }}
        />
      )}

      {/* Team/Club name header */}
      {clubName && (
        <div
          className="sticky top-0 z-20 py-3 px-4"
          style={{
            background: `linear-gradient(180deg, ${themeColor}cc 0%, ${themeColor}40 100%)`,
            backdropFilter: "blur(10px)",
            borderBottom: `2px solid ${themeColor}60`,
            transition: "background 0.6s ease",
          }}
        >
          <div className="flex items-center justify-center gap-3">
            {/* Home button */}
            <button
              onClick={goHome}
              title="Back to Home"
              style={{
                position: "absolute", left: "1rem",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: "50%", width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s ease",
                fontSize: "1.1rem", color: "#fff",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = ""; }}
            >
              🏠
            </button>
            {state.teamInfo?.fifaCode && <FlagImg fifaCode={state.teamInfo.fifaCode} width={32} height={22} />}
            <h1
              className="text-2xl md:text-4xl font-bold tracking-wide"
              style={{
                color: "#fff",
                textTransform: "uppercase",
                textShadow: "0 2px 10px rgba(0,0,0,0.8)",
              }}
            >
              {clubName}
            </h1>
            {state.teamInfo?.fifaCode && <FlagImg fifaCode={state.teamInfo.fifaCode} width={32} height={22} />}
          </div>
        </div>
      )}

      {/* Mobile tab bar — shown when a team is selected */}
      {isMobile && hasTeam && (
        <div
          className="sticky top-0 z-30 flex"
          style={{
            background: "rgba(10,10,10,0.95)",
            borderBottom: `1px solid ${themeColor}30`,
            backdropFilter: "blur(12px)",
          }}
        >
          {(
            [
              { id: "team", label: "Team", icon: "🏳️" },
              { id: "matches", label: "Matches", icon: "📅", hidden: !hasMatches },
              { id: "map", label: "Map", icon: "🗺️", hidden: !hasMatches },
              { id: "group", label: "Groups", icon: "🌍" },
              { id: "bracket", label: "Bracket", icon: "🏆" },
            ] as { id: MobileTab; label: string; icon: string; hidden?: boolean }[]
          )
            .filter((t) => !t.hidden)
            .map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => handleMobileTabChange(id)}
                className="flex-1 py-2 flex flex-col items-center gap-0.5"
                style={{
                  color: activeTab === id ? themeColor : "#6b7280",
                  borderBottom: activeTab === id ? `2px solid ${themeColor}` : "2px solid transparent",
                  background: "transparent",
                  fontSize: "0.65rem",
                  fontWeight: activeTab === id ? 700 : 400,
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
        </div>
      )}

      {/* Jersey decoration (desktop only, legacy club view) */}
      {clubName && !hasTeam && !isMobile && (
        <div
          className="absolute top-28 left-8 z-30"
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: "20px",
            padding: "1.5rem",
            backdropFilter: "blur(10px)",
            boxShadow: `0 8px 32px ${themeColor}80`,
            border: `3px solid ${themeColor}`,
          }}
        >
          <svg width="120" height="140" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
            <path d="M 20 20 L 10 40 L 10 100 L 20 110 L 40 110 L 40 140 L 80 140 L 80 110 L 100 110 L 110 100 L 110 40 L 100 20 L 80 30 L 60 20 L 40 30 Z" fill={themeColor} stroke="#1F2937" strokeWidth="2" />
            <path d="M 60 20 L 80 30 L 100 20 L 110 40 L 110 100 L 100 110 L 80 110 L 80 140 L 60 140 L 60 20 Z" fill={secondaryColor} stroke="#1F2937" strokeWidth="2" opacity="0.95" />
            <ellipse cx="60" cy="22" rx="15" ry="8" fill="#F5F5F5" stroke="#1F2937" strokeWidth="1.5" />
            <line x1="60" y1="20" x2="60" y2="110" stroke="#1F2937" strokeWidth="1.5" strokeDasharray="4,4" />
            <circle cx="15" cy="45" r="5" fill={themeColor} stroke="#1F2937" strokeWidth="1.5" />
            <circle cx="105" cy="45" r="5" fill={secondaryColor} stroke="#1F2937" strokeWidth="1.5" />
          </svg>
          <div className="text-center mt-2 text-xs font-bold" style={{ color: themeColor }}>MAILLOT</div>
        </div>
      )}

      {/* Decorative particles */}
      {clubName && (
        <>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: `${themeColor}60`,
                top: `${i * 12 + 10}%`,
                left: `${i * 12 + 5}%`,
                zIndex: 2,
                boxShadow: `0 0 20px ${themeColor}`,
              }}
            />
          ))}
        </>
      )}

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "90%",
          maxWidth: "1400px",
          margin: "0 auto",
          paddingTop: clubName && !state.tournamentView ? "2rem" : "1rem",
          paddingBottom: "2rem",
          overflowY: "auto",
        }}
      >
        {showGroupView ? (
          <GroupView
            groups={groups}
            selectedTeamCode={state.teamInfo?.fifaCode}
            themeColor={themeColor}
            onTeamClick={handleTeamClick}
          />
        ) : showBracket ? (
          <TournamentBracket
            matches={filteredMatches}
            selectedTeamCode={state.teamInfo?.fifaCode}
            themeColor={themeColor}
            onPhaseClick={handlePhaseClick}
          />
        ) : hasTeam ? (
          isMobile ? (
            /* Mobile: single-column tab-based layout */
            <div className="flex flex-col gap-4">
              {activeTab === "team" && (
                <TeamCard team={state.teamInfo} themeColor={themeColor} secondaryColor={secondaryColor} />
              )}
              {activeTab === "matches" && hasMatches && (
                <MatchSchedule
                  matches={safeMatches}
                  teamCode={state.teamInfo?.fifaCode ?? ""}
                  themeColor={themeColor}
                  onMatchClick={handleMatchClick}
                  onOpponentClick={handleOpponentClick}
                />
              )}
              {activeTab === "map" && hasMatches && (
                <VenueMap
                  stadiums={allStadiums}
                  teamMatches={safeMatches}
                  highlightedCity={state.highlightedCity}
                  themeColor={themeColor}
                  onStadiumClick={(stadium: StadiumInfo) => setState({ ...state, selectedStadium: stadium })}
                />
              )}
            </div>
          ) : (
            /* Desktop: sidebar grid layout */
            <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
              <div className="flex-1 min-w-0">
                <TeamCard team={state.teamInfo} themeColor={themeColor} secondaryColor={secondaryColor} />
                {hasMatches && (
                  <div className="mt-6">
                    <VenueMap
                      stadiums={allStadiums}
                      teamMatches={safeMatches}
                      highlightedCity={state.highlightedCity}
                      themeColor={themeColor}
                      onStadiumClick={(stadium: StadiumInfo) => setState({ ...state, selectedStadium: stadium })}
                    />
                  </div>
                )}
              </div>
              {hasMatches && (
                <div
                  className="w-full lg:w-80 shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "1rem",
                    padding: "1.25rem",
                    border: `1px solid ${themeColor}30`,
                    maxHeight: "80vh",
                    overflowY: "auto",
                  }}
                >
                  <MatchSchedule
                    matches={safeMatches}
                    teamCode={state.teamInfo?.fifaCode ?? ""}
                    themeColor={themeColor}
                    onMatchClick={handleMatchClick}
                    onOpponentClick={handleOpponentClick}
                  />
                </div>
              )}
            </div>
          )
        ) : (
          <WelcomeScreen
            onSuggestionClick={(msg) =>
              appendMessage(new TextMessage({ role: MessageRole.User, content: msg }))
            }
            onTeamClick={(fifaCode) => {
              loadTeamByCode(fifaCode);
              const team = teams.find((t) => t.fifaCode === fifaCode);
              const teamName = team?.name ?? fifaCode;
              appendMessage(
                new TextMessage({ role: MessageRole.User, content: `Show me the team ${teamName}` })
              );
            }}
            themeColor={themeColor}
          />
        )}
      </div>
    </div>
  );
}
