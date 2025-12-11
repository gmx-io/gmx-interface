import type { SourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import type { SourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import type { SourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import type { SourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import type { ExecutionFee } from "sdk/types/fees";

type SameChainGmFees = {
  kind: "settlementChain";
  fees: ExecutionFee;
};

type GmxAccountGmFees = {
  kind: "gmxAccount";
  fees: {
    executionFee: ExecutionFee;
    relayFeeUsd: bigint;
  };
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

export type TechnicalGmFees = SameChainGmFees | GmxAccountGmFees | SourceChainGmFees | undefined;
