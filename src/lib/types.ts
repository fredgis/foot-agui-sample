// State of the agent, make sure this aligns with your agent's state.
export type AgentState = {
  clubInfo: {
    name: string;
    founded: string;
    stadium: string;
    capacity: string;
    country: string;
    countryFlag: string;
    titles: string[];
    legends: Array<{ name: string; position: string; years: string }>;
    history: string;
    colors: string;
  } | null;
}