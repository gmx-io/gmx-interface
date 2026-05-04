export const GMX_DAO_LINKS = {
  VOTING_POWER: "https://www.tally.xyz/gov/gmx/my-voting-power",
  DELEGATES: "https://www.tally.xyz/gov/gmx/delegates",
};

export const EARN_OPERATION_QUERY_PARAM = "operation";
export const EARN_OPERATION_STAKE_GMX = "stake-gmx";
export const EARN_OPERATION_BUY_GMX = "buy-gmx";
export const EARN_PORTFOLIO_STAKE_GMX_LINK = `/earn/portfolio?${EARN_OPERATION_QUERY_PARAM}=${EARN_OPERATION_STAKE_GMX}`;
export const EARN_PORTFOLIO_BUY_GMX_LINK = `/earn/portfolio?${EARN_OPERATION_QUERY_PARAM}=${EARN_OPERATION_BUY_GMX}`;
