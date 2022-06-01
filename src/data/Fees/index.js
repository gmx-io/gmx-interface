import { FEES_START_TIME_42161, FEES_42161 } from "./FEES_42161";
import { FEES_START_TIME_43113, FEES_43113 } from "./FEES_43113";

const SECONDS_PER_WEEK = 604800;

function createFeeList(startTime, data) {
  const list = [];
  for (let i = 0; i < data.length; i++) {
    const feeAmount = data[i];
    const time = startTime + i * SECONDS_PER_WEEK;
    list.push({
      from: time - SECONDS_PER_WEEK,
      to: time,
      feeUsd: feeAmount,
    });
  }
  return list;
}

const FEES = {
  56: [],
  42161: createFeeList(FEES_START_TIME_42161, FEES_42161),
  43114: createFeeList(FEES_START_TIME_43113, FEES_43113),
};

export function getFeeHistory(chainId) {
  return FEES[chainId].concat([]).reverse();
}

export function getLatestDistributionDate() {
  return 1654055630;
}
