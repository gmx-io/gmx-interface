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
};

export type ExpressParamsEstimationMethod = "approximate" | "estimateGas";

export type ExpressTxnParams = {
  chainId: number;
  subaccount: Subaccount | undefined;
  relayParamsPayload: RawRelayParamsPayload;
  gasPaymentParams: GasPaymentParams;
  gasLimit: bigint;
  l1GasLimit: bigint;
  gasPrice: bigint;
  executionFeeAmount: bigint;
  executionGasLimit: bigint;
  estimationMethod: ExpressParamsEstimationMethod;
  gasPaymentValidations: GasPaymentValidations;
  subaccountValidations: SubaccountValidations | undefined;
  isSponsoredCall: boolean;
};

export type ExpressTransactionBuilder = ({
  relayParams,
  gasPaymentParams,
  subaccount,
}: {
  relayParams: RawRelayParamsPayload;
  gasPaymentParams: GasPaymentParams;
  subaccount: Subaccount | undefined;
}) => Promise<{ txnData: ExpressTxnData }>;

export type ExpressTransactionEstimatorParams = {
  account: string;
  gasPaymentTokenAsCollateralAmount: bigint;
  executionFeeAmount: bigint;
  executionGasLimit: bigint;
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
  gasPaymentTokenAsCollateralAmount: bigint;
};

export type RelayParamsPayload = {
  oracleParams: OracleParamsPayload;
  tokenPermits: SignedTokenPermit[];
  externalCalls: ExternalCallsPayload;
  fee: RelayFeePayload;
  deadline: bigint;
  desChainId: bigint;
  userNonce: bigint | number;
};

export type RelayParamsPayloadWithSignature = RelayParamsPayload & {
  signature: string;
};

export type RawRelayParamsPayload = Omit<RelayParamsPayload, "deadline">;

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
