// ─── World Cup 2026 Types ────────────────────────────────────────────────────

export type Confederation = "UEFA" | "CONMEBOL" | "CAF" | "AFC" | "CONCACAF" | "OFC";

export type MatchPhase =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type PlayerInfo = {
  name: string;
  position: string;
  club: string;
};

export type WorldCupHistory = {
  participations: number;
  titles: number;
  bestResult: string;
};

export type TeamInfo = {
  name: string;
  fifaCode: string;
  flag: string;
  confederation: Confederation;
  fifaRanking: number;
  primaryColor: string;
  secondaryColor: string;
  coach: string;
  keyPlayers: PlayerInfo[];
  worldCupHistory: WorldCupHistory;
};

export type StadiumInfo = {
  name: string;
  city: string;
  country: "USA" | "Canada" | "Mexico";
  capacity: number;
  lat: number;
  lng: number;
  timezone: string;
  description: string;
};

export type MatchInfo = {
  id: string;
  date: string;
  time: string;
  homeTeam: string | null;
  awayTeam: string | null;
  stadiumName: string;
  phase: MatchPhase;
  group?: string;
};

export type GroupInfo = {
  name: string;
  teams: string[];
};

// ─── Agent State ─────────────────────────────────────────────────────────────

// State of the agent, make sure this aligns with your agent's state.
export type AgentState = {
  teamInfo: TeamInfo | null;
  matches: MatchInfo[];
  selectedStadium: StadiumInfo | null;
  tournamentView: "group" | "bracket" | null;
  highlightedCity: string | null;
};