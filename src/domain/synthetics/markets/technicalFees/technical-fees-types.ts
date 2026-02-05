import { type ContractsChainId, SourceChainId } from "config/chains";
import type { GlobalExpressParams } from "domain/synthetics/express";
import {
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
  RawCreateWithdrawalParams,
  RawCreateGlvWithdrawalParams,
  type GlvInfo,
} from "domain/synthetics/markets";
import type { SourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import type { SourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import type { SourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import type { SourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import type { NativeTokenSupportedAddress, ERC20Address, TokensData } from "domain/tokens";
import type { ExecutionFee, GasLimitsConfig } from "sdk/utils/fees/types";

import { GmPaySource, Operation } from "../types";

type SameChainGmFees = {
  kind: "settlementChain";
  fees: ExecutionFee;
  isDeposit: boolean;
  isGlv: boolean;
};

type GmxAccountGmFees = {
  kind: "gmxAccount";
  fees: {
    executionFee: ExecutionFee;
    relayFeeUsd: bigint;
  };
  isDeposit: boolean;
  isGlv: boolean;
};

type SourceChainGmFees = {
  kind: "sourceChain";
} & (
  | {
      isGlv: false;
      isDeposit: false;
      fees: SourceChainWithdrawalFees;
    }
  | {
      isGlv: false;
      isDeposit: true;
      fees: SourceChainDepositFees;
    }
  | {
      isGlv: true;
      isDeposit: false;
      fees: SourceChainGlvWithdrawalFees;
    }
  | {
      isGlv: true;
      isDeposit: true;
      fees: SourceChainGlvDepositFees;
    }
);

export type TechnicalGmFees = SameChainGmFees | GmxAccountGmFees | SourceChainGmFees;

export type CalculateTechnicalFeesParams = {
  chainId: ContractsChainId;
  globalExpressParams: GlobalExpressParams | undefined;
  rawParams:
    | RawCreateDepositParams
    | RawCreateGlvDepositParams
    | RawCreateWithdrawalParams
    | RawCreateGlvWithdrawalParams;
  isGlv: boolean;
  glvInfo: GlvInfo | undefined;
  paySource: GmPaySource;
  srcChainId: SourceChainId | undefined;
  firstTokenAddress: NativeTokenSupportedAddress | ERC20Address | undefined;
  firstTokenAmount: bigint;
  marketTokenAmount: bigint;
  operation: Operation;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  outputLongTokenAddress: string | undefined;
  outputShortTokenAddress: string | undefined;
  gasLimits: GasLimitsConfig;
  tokensData: TokensData;
  gasPrice: bigint;
};
