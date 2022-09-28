import { FEES_42161 } from "./FEES_42161";
import { FEES_43113 } from "./FEES_43113";
import { ARBITRUM, ARBITRUM_TESTNET, AVALANCHE, MAINNET } from "../chains";

const SECONDS_PER_WEEK = 604800;

type FeeItem = {
  from: number;
  to: number;
  feeUsd: string;
};

function createFeeList(data: { to: number; feeUsd: string }[]) {
  const list: FeeItem[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    list.push({
      from: item.to - SECONDS_PER_WEEK,
      to: item.to,
      feeUsd: item.feeUsd,
    });
  }
  return list;
}

const FEES = {
  [MAINNET]: [],
  [ARBITRUM]: createFeeList(FEES_42161),
  [ARBITRUM_TESTNET]: createFeeList(FEES_42161),
  [AVALANCHE]: createFeeList(FEES_43113),
};

export function getFeeHistory(chainId: number): FeeItem[] {
  return FEES[chainId].concat([]).reverse();
}
