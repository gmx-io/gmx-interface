import { TokenData } from "domain/synthetics/tokens";
import type { ERC20Address } from "domain/tokens";
import { Market, MarketInfo, MarketPoolTokens } from "sdk/types/markets";

export * from "sdk/types/markets";

export type FastMarketInfo = Omit<MarketInfo, keyof MarketPoolTokens | keyof Market> & {
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

export type CreateDepositParamsAddressesStructOutput = {
  receiver: string;
  callbackContract: string;
  uiFeeReceiver: string;
  market: string;
  initialLongToken: ERC20Address;
  initialShortToken: ERC20Address;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
};

export type CreateDepositParamsStruct = {
  addresses: CreateDepositParamsAddressesStructOutput;
  minMarketTokens: bigint;
  shouldUnwrapNativeToken: boolean;
  executionFee: bigint;
  callbackGasLimit: bigint;
  dataList: string[];
};

export type CreateGlvDepositAddressesStruct = {
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

export type CreateGlvDepositParamsStruct = {
  addresses: CreateGlvDepositAddressesStruct;
  minGlvTokens: bigint;
  executionFee: bigint;
  callbackGasLimit: bigint;
  shouldUnwrapNativeToken: boolean;
  isMarketTokenDeposit: boolean;
  dataList: string[];
};
