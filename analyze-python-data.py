import sys
sys.path.insert(0, 'agent/src')

from data.worldcup2026 import teams, stadiums, groups, matches

print('=== PYTHON DATA INTEGRITY ANALYSIS ===\n')

# 1. Check team count
print(f'1. TEAM COUNT: {len(teams)} (expected: 48)')
if len(teams) != 48:
    print('   ❌ ERROR: Should have exactly 48 teams')

# 2. Check confederation distribution
confeds = {}
for team in teams:
    conf = team['confederation']
    confeds[conf] = confeds.get(conf, 0) + 1

print(f'\n2. CONFEDERATION DISTRIBUTION:')
print(f'   UEFA: {confeds.get("UEFA", 0)} (expected: 16)')
print(f'   CONMEBOL: {confeds.get("CONMEBOL", 0)} (expected: 6)')
print(f'   CAF: {confeds.get("CAF", 0)} (expected: 9)')
print(f'   AFC: {confeds.get("AFC", 0)} (expected: 8)')
print(f'   CONCACAF: {confeds.get("CONCACAF", 0)} (expected: 8)')
print(f'   OFC: {confeds.get("OFC", 0)} (expected: 1)')

# 3. Check for duplicate FIFA codes
fifa_codes = [t['fifaCode'] for t in teams]
duplicate_codes = [code for code in set(fifa_codes) if fifa_codes.count(code) > 1]
if duplicate_codes:
    print(f'\n3. ❌ DUPLICATE FIFA CODES: {", ".join(duplicate_codes)}')
else:
    print(f'\n3. FIFA CODES: All unique ✓')

# 4. Check stadium count
print(f'\n4. STADIUM COUNT: {len(stadiums)} (expected: 16)')
if len(stadiums) != 16:
    print('   ❌ ERROR: Should have exactly 16 stadiums')

# 5. Check stadium distribution by country
countries = {}
for stadium in stadiums:
    country = stadium['country']
    countries[country] = countries.get(country, 0) + 1

print(f'\n5. STADIUM DISTRIBUTION BY COUNTRY:')
print(f'   USA: {countries.get("USA", 0)} (expected: 11)')
print(f'   Canada: {countries.get("Canada", 0)} (expected: 2)')
print(f'   Mexico: {countries.get("Mexico", 0)} (expected: 3)')

# 6. Check groups
print(f'\n6. GROUP COUNT: {len(groups)} (expected: 12)')
if len(groups) != 12:
    print('   ❌ ERROR: Should have exactly 12 groups')

# Check each group has 4 teams
for group in groups:
    if len(group['teams']) != 4:
        print(f'   ❌ ERROR: Group {group["name"]} has {len(group["teams"])} teams (expected: 4)')

# Check for duplicate teams in groups
all_teams_in_groups = []
for group in groups:
    all_teams_in_groups.extend(group['teams'])

duplicate_teams = [code for code in set(all_teams_in_groups) if all_teams_in_groups.count(code) > 1]
if duplicate_teams:
    print(f'   ❌ DUPLICATE TEAMS IN GROUPS: {", ".join(duplicate_teams)}')
else:
    print(f'   All teams unique across groups ✓')

# Check all teams in groups exist in teams list
team_codes = [t['fifaCode'] for t in teams]
missing_teams = [code for code in all_teams_in_groups if code not in team_codes]
if missing_teams:
    print(f'   ❌ TEAMS IN GROUPS BUT NOT IN TEAMS LIST: {", ".join(missing_teams)}')

# 7. Check matches
print(f'\n7. MATCH COUNT: {len(matches)} (expected: 104)')
if len(matches) != 104:
    print('   ❌ ERROR: Should have exactly 104 matches')

# Count by phase
phases = {}
for match in matches:
    phase = match['phase']
    phases[phase] = phases.get(phase, 0) + 1

print(f'\n8. MATCH DISTRIBUTION BY PHASE:')
print(f'   group: {phases.get("group", 0)} (expected: 72)')
print(f'   round_of_32: {phases.get("round_of_32", 0)} (expected: 16)')
print(f'   round_of_16: {phases.get("round_of_16", 0)} (expected: 8)')
print(f'   quarter_final: {phases.get("quarter_final", 0)} (expected: 4)')
print(f'   semi_final: {phases.get("semi_final", 0)} (expected: 2)')
print(f'   third_place: {phases.get("third_place", 0)} (expected: 1)')
print(f'   final: {phases.get("final", 0)} (expected: 1)')

# Check group matches have correct teams
print(f'\n9. VERIFYING GROUP MATCHES...')
group_matches = [m for m in matches if m['phase'] == 'group']
for match in group_matches:
    if match.get('homeTeam') and match.get('awayTeam') and match.get('group'):
        group_data = next((g for g in groups if g['name'] == match['group']), None)
        if group_data:
            if match['homeTeam'] not in group_data['teams']:
                print(f'   ❌ ERROR: Match {match["id"]} - {match["homeTeam"]} not in Group {match["group"]}')
            if match['awayTeam'] not in group_data['teams']:
                print(f'   ❌ ERROR: Match {match["id"]} - {match["awayTeam"]} not in Group {match["group"]}')

# Check all stadiums referenced in matches exist
stadium_names = [s['name'] for s in stadiums]
match_stadiums = list(set([m['stadiumName'] for m in matches]))
missing_stadiums = [name for name in match_stadiums if name not in stadium_names]
if missing_stadiums:
    print(f'\n10. ❌ STADIUMS IN MATCHES BUT NOT IN STADIUMS LIST: {", ".join(missing_stadiums)}')
else:
    print(f'\n10. All stadiums referenced in matches exist ✓')

print(f'\n=== ANALYSIS COMPLETE ===')
