import { FEES_42161 } from "./FEES_42161";
import { FEES_43113 } from "./FEES_43113";

const SECONDS_PER_WEEK = 604800;

type FeeItem = {
  from: number;
  to: number;
  feeUsd: string;
};

function createFeeList(data) {
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
  56: [],
  42161: createFeeList(FEES_42161),
  421611: createFeeList(FEES_42161),
  43114: createFeeList(FEES_43113),
};

export function getFeeHistory(chainId: number): FeeItem[] {
  return FEES[chainId].concat([]).reverse();
}
