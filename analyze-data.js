const fs = require('fs');

// Read the TypeScript data file
const tsContent = fs.readFileSync('src/lib/worldcup-data.ts', 'utf8');

// Parse teams - extract team data
const teamsMatch = tsContent.match(/export const teams: TeamInfo\[\] = \[([\s\S]*?)\n\];/);
const teamsJson = teamsMatch[1];

// Parse groups
const groupsMatch = tsContent.match(/export const groups: GroupInfo\[\] = \[([\s\S]*?)\n\];/);
const groupsJson = groupsMatch[1];

// Parse stadiums
const stadiumsMatch = tsContent.match(/export const stadiums: StadiumInfo\[\] = \[([\s\S]*?)\n\];/);
const stadiumsJson = stadiumsMatch[1];

// Parse matches
const matchesMatch = tsContent.match(/export const matches: MatchInfo\[\] = \[([\s\S]*?)\n\];/);
const matchesJson = matchesMatch[1];

// Convert TS to JSON-like format for parsing
function parseTeams(text) {
  const teams = [];
  const teamRegex = /\{\s*name:\s*"([^"]+)",\s*fifaCode:\s*"([^"]+)",\s*flag:\s*"([^"]+)",\s*confederation:\s*"([^"]+)",\s*fifaRanking:\s*(\d+),/g;
  let match;
  while ((match = teamRegex.exec(text)) !== null) {
    teams.push({
      name: match[1],
      fifaCode: match[2],
      flag: match[3],
      confederation: match[4],
      fifaRanking: parseInt(match[5])
    });
  }
  return teams;
}

function parseGroups(text) {
  const groups = [];
  const groupRegex = /\{\s*name:\s*"([^"]+)",\s*teams:\s*\[(.*?)\]\s*\}/g;
  let match;
  while ((match = groupRegex.exec(text)) !== null) {
    const teamCodes = match[2].match(/"([^"]+)"/g).map(t => t.replace(/"/g, ''));
    groups.push({
      name: match[1],
      teams: teamCodes
    });
  }
  return groups;
}

function parseStadiums(text) {
  const stadiums = [];
  const stadiumRegex = /\{\s*name:\s*"([^"]+)",\s*city:\s*"([^"]+)",\s*country:\s*"([^"]+)",\s*capacity:\s*(\d+),\s*lat:\s*([-\d.]+),\s*lng:\s*([-\d.]+),/g;
  let match;
  while ((match = stadiumRegex.exec(text)) !== null) {
    stadiums.push({
      name: match[1],
      city: match[2],
      country: match[3],
      capacity: parseInt(match[4]),
      lat: parseFloat(match[5]),
      lng: parseFloat(match[6])
    });
  }
  return stadiums;
}

function parseMatches(text) {
  const matches = [];
  const matchRegex = /\{\s*id:\s*"([^"]+)",\s*date:\s*"([^"]+)",\s*time:\s*"([^"]+)",\s*homeTeam:\s*(null|"[^"]+"),\s*awayTeam:\s*(null|"[^"]+"),\s*stadiumName:\s*"([^"]+)",\s*phase:\s*"([^"]+)"(?:,\s*group:\s*"([^"]+)")?\s*\}/g;
  let match;
  while ((match = matchRegex.exec(text)) !== null) {
    matches.push({
      id: match[1],
      date: match[2],
      time: match[3],
      homeTeam: match[4] === 'null' ? null : match[4].replace(/"/g, ''),
      awayTeam: match[5] === 'null' ? null : match[5].replace(/"/g, ''),
      stadiumName: match[6],
      phase: match[7],
      group: match[8]
    });
  }
  return matches;
}

const teams = parseTeams(teamsJson);
const groups = parseGroups(groupsJson);
const stadiums = parseStadiums(stadiumsJson);
const matches = parseMatches(matchesJson);

console.log('=== DATA INTEGRITY ANALYSIS ===\n');

// 1. Check team count
console.log(`1. TEAM COUNT: ${teams.length} (expected: 48)`);
if (teams.length !== 48) {
  console.log('   ❌ ERROR: Should have exactly 48 teams');
}

// 2. Check confederation distribution
const confeds = {};
teams.forEach(t => {
  confeds[t.confederation] = (confeds[t.confederation] || 0) + 1;
});
console.log(`\n2. CONFEDERATION DISTRIBUTION:`);
console.log(`   UEFA: ${confeds.UEFA || 0} (expected: 16)`);
console.log(`   CONMEBOL: ${confeds.CONMEBOL || 0} (expected: 6)`);
console.log(`   CAF: ${confeds.CAF || 0} (expected: 9)`);
console.log(`   AFC: ${confeds.AFC || 0} (expected: 8)`);
console.log(`   CONCACAF: ${confeds.CONCACAF || 0} (expected: 8)`);
console.log(`   OFC: ${confeds.OFC || 0} (expected: 1)`);

if (confeds.UEFA !== 16 || confeds.CONMEBOL !== 6 || confeds.CAF !== 9 || 
    confeds.AFC !== 8 || confeds.CONCACAF !== 8 || confeds.OFC !== 1) {
  console.log('   ❌ ERROR: Confederation distribution is incorrect');
}

// 3. Check for duplicate FIFA codes
const fifaCodes = teams.map(t => t.fifaCode);
const duplicateCodes = fifaCodes.filter((code, idx) => fifaCodes.indexOf(code) !== idx);
if (duplicateCodes.length > 0) {
  console.log(`\n3. ❌ DUPLICATE FIFA CODES: ${duplicateCodes.join(', ')}`);
} else {
  console.log(`\n3. FIFA CODES: All unique ✓`);
}

// 4. Check stadium count
console.log(`\n4. STADIUM COUNT: ${stadiums.length} (expected: 16)`);
if (stadiums.length !== 16) {
  console.log('   ❌ ERROR: Should have exactly 16 stadiums');
}

// 5. Check stadium distribution by country
const countries = {};
stadiums.forEach(s => {
  countries[s.country] = (countries[s.country] || 0) + 1;
});
console.log(`\n5. STADIUM DISTRIBUTION BY COUNTRY:`);
console.log(`   USA: ${countries.USA || 0} (expected: 11)`);
console.log(`   Canada: ${countries.Canada || 0} (expected: 2)`);
console.log(`   Mexico: ${countries.Mexico || 0} (expected: 3)`);

// 6. Check groups
console.log(`\n6. GROUP COUNT: ${groups.length} (expected: 12)`);
if (groups.length !== 12) {
  console.log('   ❌ ERROR: Should have exactly 12 groups');
}

// Check each group has 4 teams
groups.forEach(g => {
  if (g.teams.length !== 4) {
    console.log(`   ❌ ERROR: Group ${g.name} has ${g.teams.length} teams (expected: 4)`);
  }
});

// Check for duplicate teams in groups
const allTeamsInGroups = groups.flatMap(g => g.teams);
const duplicateTeams = allTeamsInGroups.filter((code, idx) => allTeamsInGroups.indexOf(code) !== idx);
if (duplicateTeams.length > 0) {
  console.log(`   ❌ DUPLICATE TEAMS IN GROUPS: ${duplicateTeams.join(', ')}`);
} else {
  console.log(`   All teams unique across groups ✓`);
}

// Check all teams in groups exist in teams list
const teamCodes = teams.map(t => t.fifaCode);
const missingTeams = allTeamsInGroups.filter(code => !teamCodes.includes(code));
if (missingTeams.length > 0) {
  console.log(`   ❌ TEAMS IN GROUPS BUT NOT IN TEAMS LIST: ${missingTeams.join(', ')}`);
}

// 7. Check matches
console.log(`\n7. MATCH COUNT: ${matches.length} (expected: 104)`);
if (matches.length !== 104) {
  console.log('   ❌ ERROR: Should have exactly 104 matches');
}

// Count by phase
const phases = {};
matches.forEach(m => {
  phases[m.phase] = (phases[m.phase] || 0) + 1;
});
console.log(`\n8. MATCH DISTRIBUTION BY PHASE:`);
console.log(`   group: ${phases.group || 0} (expected: 72)`);
console.log(`   round_of_32: ${phases.round_of_32 || 0} (expected: 16)`);
console.log(`   round_of_16: ${phases.round_of_16 || 0} (expected: 8)`);
console.log(`   quarter_final: ${phases.quarter_final || 0} (expected: 4)`);
console.log(`   semi_final: ${phases.semi_final || 0} (expected: 2)`);
console.log(`   third_place: ${phases.third_place || 0} (expected: 1)`);
console.log(`   final: ${phases.final || 0} (expected: 1)`);

// Check group matches have correct teams
console.log(`\n9. VERIFYING GROUP MATCHES...`);
const groupMatches = matches.filter(m => m.phase === 'group');
groupMatches.forEach(m => {
  if (m.homeTeam && m.awayTeam && m.group) {
    const group = groups.find(g => g.name === m.group);
    if (group) {
      if (!group.teams.includes(m.homeTeam)) {
        console.log(`   ❌ ERROR: Match ${m.id} - ${m.homeTeam} not in Group ${m.group}`);
      }
      if (!group.teams.includes(m.awayTeam)) {
        console.log(`   ❌ ERROR: Match ${m.id} - ${m.awayTeam} not in Group ${m.group}`);
      }
    }
  }
});

// Check all stadiums referenced in matches exist
const stadiumNames = stadiums.map(s => s.name);
const missingStadiums = [...new Set(matches.map(m => m.stadiumName))].filter(name => !stadiumNames.includes(name));
if (missingStadiums.length > 0) {
  console.log(`\n10. ❌ STADIUMS IN MATCHES BUT NOT IN STADIUMS LIST: ${missingStadiums.join(', ')}`);
} else {
  console.log(`\n10. All stadiums referenced in matches exist ✓`);
}

console.log(`\n=== ANALYSIS COMPLETE ===`);
