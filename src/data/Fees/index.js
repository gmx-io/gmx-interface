import { FEES_42161 } from "./FEES_42161";
import { FEES_43113 } from "./FEES_43113";

const SECONDS_PER_WEEK = 604800;

function createFeeList(data) {
  const list = [];
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
  43114: createFeeList(FEES_43113),
};

export function getFeeHistory(chainId) {
  return FEES[chainId].concat([]).reverse();
}
