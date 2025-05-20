import type { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import type { SignedTokenPermit, TokensAllowanceData, TokensData } from "domain/tokens";
import type { ExternalCallsPayload } from "sdk/utils/orderTransactions";

import { GasLimitsConfig, L1ExpressOrderGasReference } from "../fees";
import { MarketsInfoData } from "../markets";
import { Subaccount, SubaccountValidations } from "../subaccount";
import { FindSwapPath } from "../trade";

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
  estimationMethod: ExpressParamsEstimationMethod;
  isSponsoredCall: boolean;
  gasPaymentValidations: GasPaymentValidations;
  subaccountValidations: SubaccountValidations | undefined;
};

export type RelayerFeeParams = {
  feeParams: RelayFeePayload;
  externalCalls: ExternalCallsPayload;
  relayerTokenAddress: string;
  relayerTokenAmount: bigint;
  totalNetworkFeeAmount: bigint;
  relayerGasLimit: bigint;
  l1GasLimit: bigint;
  gasPrice: bigint;
  gasPaymentTokenAmount: bigint;
  gasPaymentTokenAddress: string;
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

export type GasPaymentValidations = {
  isOutGasTokenBalance: boolean;
  needGasPaymentTokenApproval: boolean;
  isValid: boolean;
};
