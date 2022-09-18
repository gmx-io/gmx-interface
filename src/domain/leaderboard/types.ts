import { BigNumber } from "ethers";

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
  pnl: BigNumber;
  pnlPercent: BigNumber;
}

export type Position = {}

export type Team = {
  rank: number,
  pnl: BigNumber,
  pnlPercent: BigNumber,
  leaderAddress: string,
  name: string;
  members: string[],
  positions: Position[],
  competitionIndex: number,
}

export type JoinRequest = {
  leaderAddress: string,
  account: string,
}

export type MemberStats = {
  address: string
}
