import { SignedTokenPermit } from "domain/tokens";
import { ExternalCallsPayload } from "sdk/utils/orderTransactions";

import { Subaccount } from "../subaccount";

export type ExpressParams = {
  subaccount: Subaccount | undefined;
  relayParamsPayload: RelayParamsPayload;
  relayFeeParams: RelayerFeeParams;
  isSponsoredCall: boolean;
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
};

export type RelayParamsPayload = {
  oracleParams: OracleParamsPayload;
  tokenPermits: SignedTokenPermit[];
  externalCalls: ExternalCallsPayload;
  fee: RelayFeePayload;
  userNonce: bigint;
  deadline: bigint;
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
