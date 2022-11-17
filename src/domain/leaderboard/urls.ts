export function getLeaderboardUrl() {
  return "/leaderboards";
}

export function getTeamUrl(leaderAddress) {
  return `/leaderboards/teams/${leaderAddress}`;
}

export function getTeamRegistrationUrl() {
  return "/leaderboards/teams/create";
}
