export function getLeaderboardUrl () {
  return "/leaderboard";
}

export function getTeamUrl (leaderAddress) {
  return `/leaderboard/teams/${leaderAddress}`
}

export function getTeamRegistrationUrl () {
  return "/leaderboard/teams/create"
}
