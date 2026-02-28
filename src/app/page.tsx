"use client";

import { ClubInfoCard } from "@/components/clubinfo";
import { GroupView } from "@/components/group-view";
import { TournamentBracket } from "@/components/tournament-bracket";
import { WeatherCard } from "@/components/weather";
import { MoonCard } from "@/components/moon";
import { AgentState, MatchPhase } from "@/lib/types";
import { groups, matches } from "@/lib/worldcup-data";
import { useCoAgent, useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useState } from "react";

// Composant page d'accueil attractive
function WelcomeScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      {/* Hero Section */}
      <div className="mb-12 animate-fadeIn">
        <div className="text-9xl mb-6 animate-bounce">⚽</div>
        <h1 className="text-6xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 via-green-500 to-indigo-600 bg-clip-text text-transparent">
          Expert Football Mondial
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
          Découvrez l'histoire, les légendes et les palmarès des plus grands clubs ET équipes nationales du monde entier 🌍🏆⚽
        </p>
      </div>

      {/* Call to Action */}
      <div className="mb-16">
        <div className="inline-block bg-gradient-to-r from-blue-600 to-green-500 rounded-full px-8 py-4 text-white text-2xl font-bold shadow-2xl animate-pulse">
          👉 Parle-moi d'un club ou d'une équipe nationale ! 👈
        </div>
      </div>

      {/* Exemples de clubs ET équipes nationales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl">
        {[
          { name: "Manchester United", color: "#DC143C", type: "club" },
          { name: "France", color: "#0055A4", type: "national" },
          { name: "FC Barcelona", color: "#A50044", type: "club" },
          { name: "Brazil", color: "#009B3A", type: "national" },
          { name: "Bayern Munich", color: "#DC052D", type: "club" },
          { name: "Argentina", color: "#74ACDF", type: "national" },
          { name: "Liverpool", color: "#C8102E", type: "club" },
          { name: "Germany", color: "#000000", type: "national" },
        ].map((team, i) => (
          <div 
            key={i}
            className="bg-white/10 backdrop-blur-md rounded-xl p-6 hover:scale-110 transition-transform cursor-pointer border-2 relative"
            style={{ borderColor: team.color }}
          >
            <div className="absolute top-2 right-2 text-2xl opacity-70">
              {team.type === "national" ? "🏆" : "⚽"}
            </div>
            <div className="text-lg font-bold text-white mt-2">{team.name}</div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 1s ease-out;
        }
      `}</style>
    </div>
  );
}

// Fonction pour convertir un code pays en emoji drapeau
function countryCodeToFlag(countryOrCode: string): string {
  // Si c'est déjà un emoji, le retourner tel quel
  if (countryOrCode && /\p{Emoji}/u.test(countryOrCode)) {
    return countryOrCode;
  }
  
  // Mapping codes pays → emojis
  const flagMap: Record<string, string> = {
    "FR": "🇫🇷", "France": "🇫🇷", "france": "🇫🇷",
    "ES": "🇪🇸", "Spain": "🇪🇸", "spain": "🇪🇸", "Espagne": "🇪🇸", "espagne": "🇪🇸",
    "EN": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "england": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Angleterre": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "angleterre": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "GB": "🇬🇧", "UK": "🇬🇧",
    "DE": "🇩🇪", "Germany": "🇩🇪", "germany": "🇩🇪", "Allemagne": "🇩🇪", "allemagne": "🇩🇪",
    "IT": "🇮🇹", "Italy": "🇮🇹", "italy": "🇮🇹", "Italie": "🇮🇹", "italie": "🇮🇹",
    "BR": "🇧🇷", "Brazil": "🇧🇷", "brazil": "🇧🇷", "Brésil": "🇧🇷", "brésil": "🇧🇷",
    "AR": "🇦🇷", "Argentina": "🇦🇷", "argentina": "🇦🇷", "Argentine": "🇦🇷", "argentine": "🇦🇷",
    "PT": "🇵🇹", "Portugal": "🇵🇹", "portugal": "🇵🇹",
    "NL": "🇳🇱", "Netherlands": "🇳🇱", "netherlands": "🇳🇱", "Pays-Bas": "🇳🇱",
    "US": "🇺🇸", "USA": "🇺🇸", "United States": "🇺🇸"
  };
  
  return flagMap[countryOrCode] || "🌍";
}

// Fonction pour extraire les couleurs depuis le texte colors
function extractColors(colorsText: string): { primary: string; secondary: string } {
  const colorMap: Record<string, string> = {
    // Anglais
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
    // Français
    "rouge": "#DC143C", "grenat": "#800020",
    "bleu": "#1E40AF", "azur": "#0EA5E9",
    "vert": "#16A34A", "verts": "#16A34A",
    "blanc": "#F5F5F5", "blancs": "#F5F5F5",
    "jaune": "#FBBF24", "or": "#FFD700", "doré": "#FFD700",
    "noir": "#1F2937", "noirs": "#1F2937",
    "gris": "#6B7280", "argent": "#C0C0C0"
  };
  
  const lower = colorsText.toLowerCase();
  let primary = "#6366f1";
  let secondary = "#F5F5F5";
  
  // Sépare par espaces, virgules, "and", "et", "&"
  const parts = lower.split(/\s+(?:and|et|&|,)\s+|\s+/);
  const foundColors: string[] = [];
  
  // Trouve toutes les couleurs mentionnées
  for (const part of parts) {
    const trimmed = part.trim();
    if (colorMap[trimmed]) {
      foundColors.push(colorMap[trimmed]);
    }
  }
  
  // Assigne les couleurs trouvées
  if (foundColors.length >= 1) {
    primary = foundColors[0];
  }
  if (foundColors.length >= 2) {
    secondary = foundColors[1];
  }
  
  return { primary, secondary };
}

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [countryFlag, setCountryFlag] = useState<string>("");

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/microsoft-agent-framework/frontend-actions
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

  return (
    <main style={{ "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties}>
      <CopilotSidebar
        labels={{
          title: "⚽ Expert Football Mondial",
          initial: "Salut ! Je suis un expert des clubs de football ET des équipes nationales du monde entier. Parle-moi de n'importe quel club ou sélection nationale et je te raconterai son histoire ! 🏆🌍⚽"
        }}
        className="copilot-sidebar-custom"
        defaultOpen={true}
        clickOutsideToClose={false}
      >
        <YourMainContent 
          themeColor={themeColor}
          secondaryColor={secondaryColor}
          clubLogo={clubLogo} 
          clubName={clubName} 
          backgroundImage={backgroundImage}
          countryFlag={countryFlag}
          setThemeColor={setThemeColor}
          setSecondaryColor={setSecondaryColor}
          setClubLogo={setClubLogo}
          setClubName={setClubName}
          setBackgroundImage={setBackgroundImage}
          setCountryFlag={setCountryFlag}
        />
      </CopilotSidebar>
    </main>
  );
}

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
  // 🪁 Shared State: https://docs.copilotkit.ai/microsoft-agent-framework/shared-state
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

  // Chat hook to programmatically send messages (cross-component interactions)
  const { appendMessage } = useCopilotChat();

  // Local state: selected phase for bracket cross-component filtering
  const [selectedPhase, setSelectedPhase] = useState<MatchPhase | null>(null);

  // Cross-component: clicking a team in GroupView triggers compare_teams in chat
  const handleTeamClick = (teamCode: string) => {
    const currentTeam = state.teamInfo?.name ?? state.teamInfo?.fifaCode;
    const message = currentTeam
      ? `Compare ${currentTeam} and ${teamCode}`
      : `Tell me about ${teamCode}`;
    appendMessage(
      new TextMessage({ role: Role.User, content: message })
    );
  };

  // Cross-component: clicking a phase in TournamentBracket filters the schedule
  const handlePhaseClick = (phase: MatchPhase) => {
    setSelectedPhase((prev) => (prev === phase ? null : phase));
  };

  // Filtered matches for bracket phase selection (available for MatchSchedule WS4)
  const filteredMatches = selectedPhase
    ? matches.filter((m) => m.phase === selectedPhase)
    : matches;

  //🪁 Generative UI: https://docs.copilotkit.ai/microsoft-agent-framework/generative-ui
  useCopilotAction({
    name: "get_weather",
    description: "Get the weather for a given location.",
    available: "disabled",
    parameters: [
      { name: "location", type: "string", required: true },
    ],
    render: ({ args }) => {
      return <WeatherCard location={args.location} themeColor={themeColor} />
    },
  }, [themeColor]);

  // 🪁 Human In the Loop: https://docs.copilotkit.ai/microsoft-agent-framework/human-in-the-loop
  useCopilotAction({
    name: "go_to_moon",
    description: "Go to the moon on request. This action requires human approval and will render the MoonCard UI for confirmation.",
    available: "disabled",
    renderAndWaitForResponse: ({ respond, status}) => {
      return <MoonCard themeColor={themeColor} status={status} respond={respond} />
    },
  }, [themeColor]);

  // 🏟️ Action pour recevoir directement les infos de club depuis l'agent (100% dynamique)
  useCopilotAction({
    name: "update_club_info",
    description: "Update the displayed club information with history, legends, and achievements.",
    parameters: [{
      name: "club_info",
      description: "Complete club information",
      required: true,
    }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler(args: any) {
      const club_info = args?.club_info as Record<string, unknown> | undefined;
      console.log("🎯 FRONTEND ACTION - update_club_info appelé avec:", club_info);
      const name = typeof club_info?.name === "string" ? club_info.name : "";
      const colors = typeof club_info?.colors === "string" ? club_info.colors : "blue white";
      const country = typeof club_info?.country === "string" ? club_info.country : "";
      if (name) {
        // 🎨 Génération dynamique des couleurs depuis GPT
        const extracted = extractColors(colors);
        setThemeColor(extracted.primary);
        setSecondaryColor(extracted.secondary);
        setClubLogo(null);
        setBackgroundImage("");
        setClubName(name);
        setCountryFlag(country);
        // Met à jour le teamInfo dans l'état de l'agent
        setState({ teamInfo: null, matches: [], selectedStadium: null, tournamentView: null, highlightedCity: null });
      }
    },
  }, [setThemeColor, setSecondaryColor, setClubName, setClubLogo, setBackgroundImage, setCountryFlag, setState]);

  return (
    <div
      style={{ 
        position: 'relative',
        minHeight: '100vh',
        transition: 'all 0.8s ease',
        overflow: 'hidden',
      }}
      className="h-screen flex justify-center items-center flex-col"
    >
      {/* IMAGE DE FOND PLEIN ÉCRAN - SUPER VISIBLE */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: backgroundImage 
            ? `url(${backgroundImage})`
            : `linear-gradient(135deg, ${themeColor}40 0%, ${themeColor}20 50%, ${themeColor}40 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: backgroundImage ? 'brightness(0.85)' : 'none',
          transition: 'all 0.8s ease',
          zIndex: 0,
        }}
      />
      
      {/* Overlay sombre pour faire ressortir le texte */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: backgroundImage 
            ? `linear-gradient(180deg, ${themeColor}40 0%, ${themeColor}80 50%, ${themeColor}40 100%)`
            : 'transparent',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* NOM DU CLUB EN HAUT - TITRE AVEC DRAPEAU */}
      {clubName && (
        <div 
          className="absolute top-0 left-0 right-0 z-20 pt-6 pb-4"
          style={{
            background: `linear-gradient(180deg, ${themeColor}dd 0%, ${themeColor}40 100%)`,
            backdropFilter: 'blur(10px)',
            borderBottom: `3px solid ${themeColor}`,
            boxShadow: `0 4px 20px ${themeColor}60`,
          }}
        >
          <div className="text-center flex items-center justify-center gap-4">
            {countryFlag && (
              <span className="text-2xl font-bold" style={{ 
                color: '#ffffff',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                letterSpacing: '0.1em'
              }}>
                {countryFlag}
              </span>
            )}
            <h1 
              className="text-4xl font-bold tracking-wide"
              style={{ 
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                textShadow: `
                  0 2px 10px rgba(0,0,0,0.8),
                  0 0 20px ${themeColor}
                `,
              }}
            >
              {clubName}
            </h1>
            {countryFlag && (
              <span className="text-2xl font-bold" style={{ 
                color: '#ffffff',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                letterSpacing: '0.1em'
              }}>
                {countryFlag}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Maillot du club avec les couleurs */}
      {clubName && (
        <div 
          className="absolute top-28 left-8 z-30"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)',
            boxShadow: `0 8px 32px ${themeColor}80`,
            border: `3px solid ${themeColor}`,
          }}
        >
          {/* SVG Maillot */}
          <svg width="120" height="140" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
            {/* Corps du maillot - couleur primaire */}
            <path 
              d="M 20 20 L 10 40 L 10 100 L 20 110 L 40 110 L 40 140 L 80 140 L 80 110 L 100 110 L 110 100 L 110 40 L 100 20 L 80 30 L 60 20 L 40 30 Z" 
              fill={themeColor}
              stroke="#1F2937"
              strokeWidth="2"
            />
            {/* Moitié droite - couleur secondaire */}
            <path 
              d="M 60 20 L 80 30 L 100 20 L 110 40 L 110 100 L 100 110 L 80 110 L 80 140 L 60 140 L 60 20 Z" 
              fill={secondaryColor}
              stroke="#1F2937"
              strokeWidth="2"
              opacity="0.95"
            />
            {/* Col */}
            <ellipse cx="60" cy="22" rx="15" ry="8" fill="#F5F5F5" stroke="#1F2937" strokeWidth="1.5" />
            {/* Ligne centrale */}
            <line x1="60" y1="20" x2="60" y2="110" stroke="#1F2937" strokeWidth="1.5" strokeDasharray="4,4" />
            {/* Manches */}
            <circle cx="15" cy="45" r="5" fill={themeColor} stroke="#1F2937" strokeWidth="1.5" />
            <circle cx="105" cy="45" r="5" fill={secondaryColor} stroke="#1F2937" strokeWidth="1.5" />
          </svg>
          <div className="text-center mt-2 text-xs font-bold" style={{ color: themeColor }}>MAILLOT</div>
        </div>
      )}
      {/* Éléments décoratifs statiques */}
      {clubName && (
        <>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: `${themeColor}60`,
                top: (i * 12 + 10) + '%',
                left: (i * 12 + 5) + '%',
                zIndex: 2,
                boxShadow: `0 0 20px ${themeColor}`,
              }}
            />
          ))}
        </>
      )}

      {/* Carte des infos du club, vue tournoi, ou page d'accueil */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '90%',
        maxWidth: '1400px',
        marginTop: clubName && !state.tournamentView ? '200px' : '20px',
        overflowY: 'auto',
        maxHeight: state.tournamentView ? '90vh' : undefined,
      }}>
        {state.tournamentView === "group" ? (
          <GroupView
            groups={groups}
            selectedTeamCode={state.teamInfo?.fifaCode}
            themeColor={themeColor}
            onTeamClick={handleTeamClick}
          />
        ) : state.tournamentView === "bracket" ? (
          <TournamentBracket
            matches={filteredMatches}
            selectedTeamCode={state.teamInfo?.fifaCode}
            themeColor={themeColor}
            onPhaseClick={handlePhaseClick}
          />
        ) : clubName ? (
          <ClubInfoCard clubData={null} themeColor={themeColor} />
        ) : (
          <WelcomeScreen />
        )}
      </div>

      <style jsx>{`
        /* Animations retirées pour de meilleures performances */
      `}</style>
    </div>
  );
}
