"use client";

import { useState } from "react";
import { teams as allTeams, matches as allMatches } from "@/lib/worldcup-data";
import type { GroupInfo } from "@/lib/types";
import { FlagImg } from "@/lib/flags";

interface GroupViewProps {
  groups: GroupInfo[];
  selectedTeamCode?: string;
  themeColor: string;
  onGroupClick?: (group: GroupInfo) => void;
  onTeamClick?: (teamCode: string) => void;
}

export function GroupView({
  groups,
  selectedTeamCode,
  themeColor,
  onGroupClick,
  onTeamClick,
}: GroupViewProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const getTeam = (code: string) => allTeams.find((t) => t.fifaCode === code);

  const getGroupMatches = (groupName: string) =>
    allMatches.filter((m) => m.group === groupName);

  const selectedGroupName = selectedTeamCode
    ? groups.find((g) => g.teams.includes(selectedTeamCode))?.name
    : undefined;

  const handleGroupClick = (group: GroupInfo) => {
    setExpandedGroup((prev) => (prev === group.name ? null : group.name));
    onGroupClick?.(group);
  };

  return (
    <div className="w-full p-4">
      <h2
        className="text-2xl font-bold mb-6 text-center"
        style={{ color: themeColor }}
      >
        🌍 Groups — FIFA World Cup 2026
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {groups.map((group) => {
          const isHighlighted = selectedGroupName === group.name;
          const isExpanded = expandedGroup === group.name;
          const selectedTeam =
            isHighlighted && selectedTeamCode
              ? getTeam(selectedTeamCode)
              : undefined;
          const highlightColor = selectedTeam?.primaryColor || themeColor;
          const groupMatches = getGroupMatches(group.name);

          return (
            <div
              key={group.name}
              onClick={() => handleGroupClick(group)}
              className="rounded-xl cursor-pointer transition-all duration-300"
              style={{
                background: "rgba(255,255,255,0.97)",
                border: `2px solid ${
                  isHighlighted ? highlightColor : "rgba(0,0,0,0.1)"
                }`,
                boxShadow: isHighlighted
                  ? `0 0 20px ${highlightColor}60, 0 4px 16px rgba(0,0,0,0.12)`
                  : "0 2px 8px rgba(0,0,0,0.08)",
                padding: "12px",
                transform: isExpanded ? "scale(1.02)" : "scale(1)",
              }}
            >
              {/* Group header */}
              <div
                className="text-base font-bold text-center mb-2"
                style={{ color: isHighlighted ? highlightColor : themeColor }}
              >
                Group {group.name}
              </div>

              {/* Teams list */}
              <div className="space-y-1">
                {group.teams.map((code) => {
                  const team = getTeam(code);
                  const isSelected = code === selectedTeamCode;
                  return (
                    <div
                      key={code}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSelected) onTeamClick?.(code);
                      }}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
                      style={{
                        background: isSelected
                          ? `${highlightColor}25`
                          : "transparent",
                        border: `1px solid ${
                          isSelected
                            ? `${highlightColor}50`
                            : "transparent"
                        }`,
                        cursor: isSelected ? "default" : "pointer",
                      }}
                    >
                      <span className="text-base">{team ? <FlagImg fifaCode={code} width={24} height={16} /> : "🌍"}</span>
                      <span className="text-xs font-medium text-gray-800 flex-1 truncate">
                        {team?.name ?? code}
                      </span>
                      <span className="text-xs text-gray-400">
                        #{team?.fifaRanking ?? "?"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Mini-calendar (shown when group is expanded) */}
              {isExpanded && (
                <div
                  className="mt-3 pt-2"
                  style={{ borderTop: `1px solid ${highlightColor}40` }}
                >
                  <div className="text-xs font-semibold text-gray-500 mb-1">
                    📅 Schedule
                  </div>
                  {groupMatches.map((match) => {
                    const home = getTeam(match.homeTeam ?? "");
                    const away = getTeam(match.awayTeam ?? "");
                    return (
                      <div
                        key={match.id}
                        className="text-xs text-gray-600 py-0.5 flex items-center gap-1"
                      >
                        <span className="text-gray-400 w-9 shrink-0">
                          {match.date.slice(5)}
                        </span>
                        <span>{home ? <FlagImg fifaCode={match.homeTeam!} width={16} height={11} /> : match.homeTeam}</span>
                        <span className="text-gray-400">vs</span>
                        <span>{away ? <FlagImg fifaCode={match.awayTeam!} width={16} height={11} /> : match.awayTeam}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
