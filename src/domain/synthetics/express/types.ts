import { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import { SignedTokenPermit, TokenData, TokensAllowanceData, TokensData } from "domain/tokens";
import { ExpressTxnData } from "lib/transactions";
import { ExternalCallsPayload } from "sdk/utils/orderTransactions";

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
  relayParamsPayload: RawRelayParamsPayload;
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

export type RawRelayParamsPayload = Omit<RelayParamsPayload, "userNonce" | "deadline">;

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
