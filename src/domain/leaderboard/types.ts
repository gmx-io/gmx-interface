export type Competition = {
  index: number;
  start: number;
  end: number;
  registrationActive: boolean;
  active: boolean;
  maxTeamSize: number;
}

export type Stats = {
  id: string;
  label: string;
  rank: number;
  pnl: number;
  pnlPercent: number;
}

export type Position = {}

export type Team = {
  rank: number,
  pnl: number,
  pnlPercent: number,
  leaderAddress: string,
  name: string;
  members: string[],
  positions: Position[],
  competitionIndex: number,
}

export type TeamMembersStats = {
  address: string;
  pnl: number;
  pnlPercent: number;
}

export type JoinRequest = {
  leaderAddress: string,
  account: string,
}
