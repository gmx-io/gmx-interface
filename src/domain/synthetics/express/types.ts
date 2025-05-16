import type { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import type { SignedTokenPermit, TokensAllowanceData, TokensData } from "domain/tokens";
import type { ExternalCallsPayload } from "sdk/utils/orderTransactions";

import type { GasLimitsConfig, L1ExpressOrderGasReference } from "../fees";
import type { MarketsInfoData } from "../markets";
import type { Subaccount } from "../subaccount";
import type { FindSwapPath } from "../trade";

export type GlobalExpressParams = {
  tokensData: TokensData;
  marketsInfoData: MarketsInfoData;
  subaccount: Subaccount | undefined;
  tokenPermits: SignedTokenPermit[];
  gasPaymentTokenAddress: string;
  relayerFeeTokenAddress: string;
  findSwapPath: FindSwapPath;
  gasPrice: bigint;
  gasPaymentAllowanceData: TokensAllowanceData;
  gasLimits: GasLimitsConfig;
  l1Reference: L1ExpressOrderGasReference | undefined;
  bufferBps: number;
  isSponsoredCall: boolean;
  noncesData: NoncesData | undefined;
};

export type ExpressParamsEstimationMethod = "approximate" | "estimateGas";

export type ExpressTxnParams = {
  subaccount: Subaccount | undefined;
  relayParamsPayload: RelayParamsPayload | MultichainRelayParamsPayload;
  relayFeeParams: RelayerFeeParams;
  isSponsoredCall: boolean;
  estimationMethod: ExpressParamsEstimationMethod;
};

export type RelayerFeeParams = {
  feeParams: RelayFeePayload;
  externalCalls: ExternalCallsPayload;
  relayerTokenAddress: string;
  relayerTokenAmount: bigint;
  totalNetworkFeeAmount: bigint;
  gasPaymentTokenAmount: bigint;
  gasPaymentTokenAddress: string;
  isOutGasTokenBalance: boolean;
  needGasPaymentTokenApproval: boolean;
  externalSwapGasLimit: bigint;
  noFeeSwap: boolean;
};

export type RelayParamsPayload = {
  oracleParams: OracleParamsPayload;
  tokenPermits: SignedTokenPermit[];
  externalCalls: ExternalCallsPayload;
  fee: RelayFeePayload;
  userNonce: bigint;
  deadline: bigint;
};

export type MultichainRelayParamsPayload = {
  oracleParams: OracleParamsPayload;
  tokenPermits: SignedTokenPermit[];
  externalCalls: ExternalCallsPayload;
  fee: RelayFeePayload;
  userNonce: bigint;
  deadline: bigint;
  desChainId: bigint;
};

export type OracleParamsPayload = {
  tokens: string[];
  providers: string[];
  data: string[];
};

export type RelayFeePayload = {
  feeToken: string;
  feeAmount: bigint;
  feeSwapPath: string[];
};
