import { BigNumber } from "ethers";

export type Competition = {
  start: number;
  end: number;
  registrationActive: boolean;
  active: boolean;
}

export type Position = {}

export type Team = {
  rank: number,
  realizedPnl: BigNumber,
  leaderAddress: string,
  name: string;
  members: string[],
  positions: Position[],
}

export type JoinRequest = {
  leaderAddress: string,
  account: string,
}
