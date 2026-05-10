import type { ExternalCallsPayload } from "utils/orderTransactions";
import type { Subaccount, SubaccountValidations } from "utils/subaccount";
import type { SignedTokenPermit, TokenData } from "utils/tokens/types";

export type { Subaccount, SubaccountOnchainData, SubaccountSerializedConfig, SignedSubaccountApproval, SubaccountValidations } from "utils/subaccount";

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

export type RelayParamsPayload = {
  oracleParams: OracleParamsPayload;
  tokenPermits: SignedTokenPermit[];
  externalCalls: ExternalCallsPayload;
  fee: RelayFeePayload;
  deadline: bigint;
  desChainId: bigint;
  userNonce: bigint;
};

export type RelayParamsPayloadWithSignature = RelayParamsPayload & {
  signature: string;
};

export type RawRelayParamsPayload = Omit<RelayParamsPayload, "deadline">;

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

export type GasPaymentValidations = {
  isOutGasTokenBalance: boolean;
  needGasPaymentTokenApproval: boolean;
  isValid: boolean;
};

export type BatchTypedData = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: Record<string, { name: string; type: string }[]>;
  message: Record<string, any>;
};

export type ExpressTxnData = {
  callData: string;
  to: string;
  feeToken: string;
  feeAmount: bigint;
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
  isGmxAccount: boolean;
};

export type ExpressTransactionBuilder = (params: {
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
