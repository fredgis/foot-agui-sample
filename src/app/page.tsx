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
import { FlagImg } from "@/lib/flags";
import { useCoAgent, useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql";
import { CopilotKitCSSProperties, CopilotPopup, CopilotSidebar } from "@copilotkit/react-ui";
import { useState, useEffect } from "react";

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
const HOST_NAMES = ["États-Unis", "Mexique", "Canada"];
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
    "🇫🇷 Montre-moi les matchs de la France",
    "⚽ Compare Brésil vs Argentine",
    "🏟️ Quels stades accueillent la compétition ?",
    "🌍 Affiche le tableau des groupes",
    "🏆 Montre le bracket du tournoi",
    "📊 Quelles équipes sont favorites ?",
  ];

  return (
    <div className="welcome-fade-in min-h-screen pb-16 px-4 md:px-8" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(200,16,46,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(0,122,61,0.06) 0%, transparent 50%)" }}>
      {/* ── Hero countdown ── */}
      <div className="text-center py-8 md:py-12">
        <div className="text-4xl md:text-7xl font-black mb-2 wc-gradient-text tracking-tight" style={{ lineHeight: 1.1 }}>
          FIFA WORLD CUP
        </div>
        <div className="text-4xl md:text-7xl font-black mb-4 wc-gradient-text tracking-tight" style={{ lineHeight: 1.1 }}>
          2026 ⚽
        </div>
        <div className="flex items-center justify-center gap-6 mb-3">
          {HOST_FLAGS.map((iso, i) => (
            <img
              key={iso}
              src={`https://flagcdn.com/w80/${iso}.png`}
              alt={HOST_NAMES[i]}
              width={60}
              height={40}
              style={{
                opacity: flagIndex === i ? 1 : 0.3,
                transform: flagIndex === i ? "scale(1.3)" : "scale(1)",
                transition: "all 0.5s ease",
                borderRadius: "4px",
                boxShadow: flagIndex === i ? "0 4px 20px rgba(255,255,255,0.3)" : "none",
              }}
              title={HOST_NAMES[i]}
            />
          ))}
        </div>
        <p style={{ color: "#9ca3af", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>
          {HOST_NAMES[flagIndex]} · 11 juin – 19 juillet 2026
        </p>
        {/* Countdown */}
        {mounted && (
          <div className="flex gap-3 md:gap-5 justify-center flex-wrap mb-8">
            {[
              { label: "Jours", value: timeLeft.days },
              { label: "Heures", value: timeLeft.hours },
              { label: "Minutes", value: timeLeft.minutes },
              { label: "Secondes", value: timeLeft.seconds },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: `linear-gradient(135deg, ${themeColor}18, rgba(255,255,255,0.08))`,
                  border: `2px solid ${themeColor}60`,
                  borderRadius: "1rem",
                  padding: "0.75rem 1rem",
                  minWidth: "72px",
                  textAlign: "center",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 900,
                    lineHeight: 1,
                    color: themeColor,
                    fontVariantNumeric: "tabular-nums",
                    textShadow: `0 0 20px ${themeColor}60`,
                    animation: label === "Secondes" ? "countdownPulse 1s ease-in-out infinite" : undefined,
                  }}
                >
                  {String(value).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: "4px",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Search ── */}
      <div style={{ maxWidth: "42rem", margin: "0 auto 2rem" }}>
        <input
          type="text"
          placeholder="🔍 Filtrer les équipes... (ex: Fra, BRA, UEFA)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.08)",
            border: `2px solid ${themeColor}40`,
            borderRadius: "2rem",
            padding: "0.75rem 1.5rem",
            color: "white",
            fontSize: "1rem",
            backdropFilter: "blur(8px)",
            outline: "none",
            transition: "border-color 0.3s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = themeColor)}
          onBlur={(e) => (e.target.style.borderColor = `${themeColor}40`)}
        />
      </div>

      {/* ── Favorites ── */}
      {!search && (
        <div style={{ maxWidth: "64rem", margin: "0 auto 2.5rem" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#d1d5db", marginBottom: "0.75rem" }}>
            ⭐ Favoris du tournoi
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {favorites.map((team, i) => (
              <button
                key={team.fifaCode}
                onClick={() => onTeamClick?.(team.fifaCode)}
                className="stagger-item"
                style={{
                  background: `linear-gradient(135deg, ${team.primaryColor}25, ${team.primaryColor}10)`,
                  border: `2px solid ${team.primaryColor}70`,
                  borderRadius: "1rem",
                  padding: "0.75rem 0.5rem",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  animationDelay: `${i * 0.08}s`,
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px ${team.primaryColor}60`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                }}
              >
                <FlagImg fifaCode={team.fifaCode} width={48} height={32} style={{ borderRadius: "4px", margin: "0 auto 0.3rem", display: "block", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "white", lineHeight: 1.2 }}>
                  {team.name}
                </div>
                <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>#{team.fifaRanking}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Teams by confederation ── */}
      <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
        {teamsByConf.map(({ conf, teams: confTeams }, gi) => (
          <div key={conf} style={{ marginBottom: "2rem" }}>
            <h2
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#e5e7eb",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>{CONF_EMOJI[conf]}</span>
              <span>{conf}</span>
              <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 400 }}>
                ({confTeams.length} équipes)
              </span>
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {confTeams.map((team, ti) => (
                <button
                  key={team.fifaCode}
                  onClick={() => onTeamClick?.(team.fifaCode)}
                  className="stagger-item"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${team.primaryColor}50`,
                    borderRadius: "0.75rem",
                    padding: "0.5rem 0.35rem",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    animationDelay: `${gi * 0.1 + ti * 0.03}s`,
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = `${team.primaryColor}25`;
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px ${team.primaryColor}40`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                  }}
                  title={`${team.name} (${team.fifaCode})`}
                >
                  <FlagImg fifaCode={team.fifaCode} width={40} height={28} style={{ borderRadius: "3px", margin: "0 auto 0.2rem", display: "block", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "#e5e7eb", lineHeight: 1.2 }}>
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
        <div style={{ maxWidth: "42rem", margin: "2rem auto 0" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#d1d5db", marginBottom: "0.75rem" }}>
            💬 Suggestions Copa
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {copaSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                className="stagger-item"
                style={{
                  background: `linear-gradient(135deg, ${themeColor}15, ${themeColor}08)`,
                  border: `1px solid ${themeColor}40`,
                  borderRadius: "2rem",
                  padding: "0.5rem 1rem",
                  color: "#e5e7eb",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  animationDelay: `${i * 0.07}s`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = themeColor;
                  (e.currentTarget as HTMLButtonElement).style.color = "white";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${themeColor}15, ${themeColor}08)`;
                  (e.currentTarget as HTMLButtonElement).style.color = "#e5e7eb";
                  (e.currentTarget as HTMLButtonElement).style.transform = "";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
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
    initial: "Salut ! Je suis Copa, ton expert de la Coupe du Monde 2026 🏆. Parle-moi d'une équipe, d'un stade, ou demande-moi de comparer des équipes ! 🌍⚽",
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

  // Cross-component: clicking a team in GroupView triggers compare_teams in chat
  const handleTeamClick = (teamCode: string) => {
    const currentTeam = state.teamInfo?.name ?? state.teamInfo?.fifaCode;
    const message = currentTeam
      ? `Compare ${currentTeam} and ${teamCode}`
      : `Tell me about ${teamCode}`;
    appendMessage(new TextMessage({ role: MessageRole.User, content: message }));
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
  const safeMatches = state.matches ?? [];
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
      {/* Background image overlay */}
      {backgroundImage && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.7)",
            transition: "all 0.8s ease",
            zIndex: 0,
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
            {countryFlag && <span className="text-2xl">{countryFlag}</span>}
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
            {countryFlag && <span className="text-2xl">{countryFlag}</span>}
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
              { id: "team", label: "Équipe", icon: "🏳️" },
              { id: "matches", label: "Matchs", icon: "📅", hidden: !hasMatches },
              { id: "map", label: "Carte", icon: "🗺️", hidden: !hasMatches },
              { id: "group", label: "Groupe", icon: "🌍" },
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
              const team = teams.find((t) => t.fifaCode === fifaCode);
              const teamName = team?.name ?? fifaCode;
              appendMessage(
                new TextMessage({ role: MessageRole.User, content: `Montre-moi les informations sur l'équipe ${teamName}` })
              );
            }}
            themeColor={themeColor}
          />
        )}
      </div>
    </div>
  );
}
