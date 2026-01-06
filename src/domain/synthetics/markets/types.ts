import { TokenData } from "domain/synthetics/tokens";
import type { ERC20Address } from "domain/tokens";
import { Market, MarketInfo, MarketPoolTokens } from "sdk/types/markets";

export * from "sdk/types/markets";

export type FastMarketInfo = Omit<
  Omit<MarketInfo, keyof MarketPoolTokens | keyof Market>,
  "useOpenInterestInTokensForBalance"
> & {
  marketTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  indexTokenAddress: string;
};

export type FastMarketInfoData = {
  [address: string]: FastMarketInfo;
};

export type GlvAndGmMarketsInfoData = {
  [marketAddress: string]: MarketInfo | GlvInfo;
};

export type GlvOrMarketInfo = MarketInfo | GlvInfo;

export type GlvInfoData = {
  [key in string]: GlvInfo;
};

export type GlvInfo = {
  glvToken: TokenData & {
    contractSymbol: string;
  };
  glvTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  isSameCollaterals: boolean;
  isSpotOnly: boolean;
  name: string;
  longToken: TokenData;
  shortToken: TokenData;
  markets: GlvMarket[];
  shiftLastExecutedAt: bigint;
  shiftMinInterval: bigint;
  isDisabled: boolean;
  poolValueMax: bigint;
  poolValueMin: bigint;
  data: string;
  isGlv: true;
};

export interface GlvMarket {
  address: string;
  isDisabled: boolean;
  maxMarketTokenBalanceUsd: bigint;
  glvMaxMarketTokenBalanceAmount: bigint;
  gmBalance: bigint;
}

export type ClaimableFunding = {
  claimableFundingAmountLong: bigint;
  claimableFundingAmountShort: bigint;
};

export type ClaimableFundingData = {
  [marketAddress: string]: ClaimableFunding;
};

export type CreateDepositParamsAddresses = {
  receiver: string;
  callbackContract: string;
  uiFeeReceiver: string;
  market: string;
  initialLongToken: ERC20Address;
  initialShortToken: ERC20Address;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
};

export type CreateDepositParams = {
  addresses: CreateDepositParamsAddresses;
  minMarketTokens: bigint;
  shouldUnwrapNativeToken: boolean;
  executionFee: bigint;
  callbackGasLimit: bigint;
  dataList: string[];
};

export type RawCreateDepositParams = Omit<CreateDepositParams, "executionFee">;

export type CreateGlvDepositAddresses = {
  glv: string;
  market: string;
  receiver: string;
  callbackContract: string;
  uiFeeReceiver: string;
  initialLongToken: string;
  initialShortToken: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
};

export type CreateGlvDepositParams = {
  addresses: CreateGlvDepositAddresses;
  minGlvTokens: bigint;
  executionFee: bigint;
  callbackGasLimit: bigint;
  shouldUnwrapNativeToken: boolean;
  isMarketTokenDeposit: boolean;
  dataList: string[];
};

export type RawCreateGlvDepositParams = Omit<CreateGlvDepositParams, "executionFee">;

export type CreateWithdrawalAddresses = {
  receiver: string;
  callbackContract: string;
  uiFeeReceiver: string;
  market: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
};

export type CreateWithdrawalParams = {
  addresses: CreateWithdrawalAddresses;
  minLongTokenAmount: bigint;
  minShortTokenAmount: bigint;
  shouldUnwrapNativeToken: boolean;
  executionFee: bigint;
  callbackGasLimit: bigint;
  dataList: string[];
};

export type RawCreateWithdrawalParams = Omit<CreateWithdrawalParams, "executionFee">;

export type CreateGlvWithdrawalAddresses = {
  receiver: string;
  callbackContract: string;
  uiFeeReceiver: string;
  market: string;
  glv: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
};

export type CreateGlvWithdrawalParams = {
  addresses: CreateGlvWithdrawalAddresses;
  minLongTokenAmount: bigint;
  minShortTokenAmount: bigint;
  shouldUnwrapNativeToken: boolean;
  executionFee: bigint;
  callbackGasLimit: bigint;
  dataList: string[];
};

export type RawCreateGlvWithdrawalParams = Omit<CreateGlvWithdrawalParams, "executionFee">;

/**
 * GM or GLV pay source
 */

export type GmPaySource = "settlementChain" | "gmxAccount" | "sourceChain";

export enum Operation {
  Deposit = "Deposit",
  Withdrawal = "Withdrawal",
  Shift = "Shift",
}

export enum Mode {
  Single = "Single",
  Pair = "Pair",
}

export function isOperation(operation: string): operation is Operation {
  return Object.values(Operation).includes(operation as Operation);
}

export function isMode(mode: string): mode is Mode {
  return Object.values(Mode).includes(mode as Mode);
}
