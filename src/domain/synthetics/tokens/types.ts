import type { TokenBalancesData } from "domain/tokens";

export type { TokenData, TokensData, TokenPricesData, TokensAllowanceData } from "sdk/utils/tokens/types";

export type BalancesDataResult = {
  balancesData?: TokenBalancesData;
  error?: Error;
};
