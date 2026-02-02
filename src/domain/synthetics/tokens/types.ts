import type { TokenBalancesData, TokensAllowanceData } from "domain/tokens";

export type { TokenData, TokensData, TokenPricesData, TokensAllowanceData } from "sdk/utils/tokens/types";

export type TokenToSpendParams = {
  tokenAddress: string;
  amount: bigint;
  allowanceData: TokensAllowanceData | undefined;
  isAllowanceLoaded: boolean | undefined;
};

export type BalancesDataResult = {
  balancesData?: TokenBalancesData;
  error?: Error;
};
