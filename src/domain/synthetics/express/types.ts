import type { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import type { SignedTokenPermit, TokenData, TokensAllowanceData, TokensData } from "domain/tokens";
import type { ExpressTxnData } from "lib/transactions";
import type { ExternalCallsPayload } from "sdk/utils/orderTransactions";

import type { GasLimitsConfig, L1ExpressOrderGasReference } from "../fees";
import type { MarketsInfoData } from "../markets";
import type { Subaccount, SubaccountValidations } from "../subaccount";
import type { FindSwapPath } from "../trade";

export type GlobalExpressParams = {
  tokensData: TokensData;
  marketsInfoData: MarketsInfoData;
  subaccount: Subaccount | undefined;
  tokenPermits: SignedTokenPermit[];
  gasPaymentTokenAddress: string;
  relayerFeeTokenAddress: string;
  gasPaymentToken: TokenData;
  relayerFeeToken: TokenData;
  findFeeSwapPath: FindSwapPath;
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
  relayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
  gasPaymentParams: GasPaymentParams;
  gasLimit: bigint;
  l1GasLimit: bigint;
  gasPrice: bigint;
  estimationMethod: ExpressParamsEstimationMethod;
  gasPaymentValidations: GasPaymentValidations;
  subaccountValidations: SubaccountValidations | undefined;
  isSponsoredCall: boolean;
};

export type ExpressTransactionBuilder = ({
  relayParams,
  gasPaymentParams,
  subaccount,
  noncesData,
}: {
  relayParams: RawRelayParamsPayload;
  gasPaymentParams: GasPaymentParams;
  subaccount: Subaccount | undefined;
  noncesData: NoncesData | undefined;
}) => Promise<{ txnData: ExpressTxnData }>;

export type ExpressTransactionEstimatorParams = {
  account: string;
  gasPaymentTokenAsCollateralAmount: bigint;
  executionFeeAmount: bigint;
  transactionPayloadGasLimit: bigint;
  transactionExternalCalls: ExternalCallsPayload | undefined;
  subaccountActions: number;
  isValid: boolean;
  expressTransactionBuilder: ExpressTransactionBuilder;
};

export type GasPaymentParams = {
  gasPaymentToken: TokenData;
  relayFeeToken: TokenData;
  gasPaymentTokenAddress: string;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  gasPaymentTokenAmount: bigint;
  totalRelayerFeeTokenAmount: bigint;
};

export type RelayParamsPayload = {
  oracleParams: OracleParamsPayload;
  tokenPermits: SignedTokenPermit[];
  externalCalls: ExternalCallsPayload;
  fee: RelayFeePayload;
  deadline: bigint;
  userNonce: bigint;
};

export type MultichainRelayParamsPayload = RelayParamsPayload & {
  desChainId: bigint;
};

export type RawRelayParamsPayload = Omit<RelayParamsPayload, "userNonce" | "deadline">;
export type RawMultichainRelayParamsPayload = Omit<MultichainRelayParamsPayload, "userNonce" | "deadline">;

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
