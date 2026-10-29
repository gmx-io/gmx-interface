import { zeroAddress } from "viem";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import type { GasPaymentParams } from "domain/synthetics/express/types";
import { findNextGasPaymentToken } from "domain/synthetics/express/useSwitchGasPaymentTokenIfRequired";
import type { SidecarOrderEntryBase } from "domain/synthetics/sidecarOrders/types";
import type { IncreasePositionAmounts } from "domain/synthetics/trade";
import type { TokensData } from "domain/tokens";
import { getByKey } from "lib/objects";
import { bigMath } from "sdk/utils/bigmath";

const SIZE_FIT_MARGIN_BPS = 10n;

export type OrderAutoSubmitStep = "wait" | "approve" | "submit" | "stop";

export type ConfirmedUsdgOrder = {
  setupKey: string;
  sizeDeltaUsd: bigint;
  sizeInputValue: string | undefined;
};

export type ConvertedOrderStatus = "confirmed" | "marginShort" | "changed";

export function getTpSlSetupKey(entries: SidecarOrderEntryBase[]) {
  return entries
    .filter((entry) => entry.txnType !== null)
    .map((entry) => [
      entry.txnType,
      String(entry.price.value),
      String(entry.mode === "keepSize" ? entry.sizeUsd.value : entry.percentage.value),
    ]);
}

export function getConvertedOrderStatus(p: {
  confirmedOrder: ConfirmedUsdgOrder;
  setupKey: string;
  sizeDeltaUsd: bigint;
  sizeInputValue: string;
  payAmount: bigint;
  convertedAmount: bigint;
}): ConvertedOrderStatus {
  const { confirmedOrder } = p;

  if (p.setupKey !== confirmedOrder.setupKey || p.sizeDeltaUsd > confirmedOrder.sizeDeltaUsd) {
    return "changed";
  }

  if (confirmedOrder.sizeInputValue === undefined) {
    return "confirmed";
  }

  if (p.sizeInputValue !== confirmedOrder.sizeInputValue) {
    return "changed";
  }

  return p.payAmount <= p.convertedAmount ? "confirmed" : "marginShort";
}

export function getConvertedSizeFit(p: {
  increaseAmounts: IncreasePositionAmounts;
  convertedUsd: bigint;
}): bigint | undefined {
  const { increaseAmounts } = p;
  const sizeDependentUsd =
    increaseAmounts.collateralDeltaUsd +
    increaseAmounts.positionFeeUsd +
    increaseAmounts.uiFeeUsd +
    increaseAmounts.swapUiFeeUsd;
  const availableUsd =
    bigMath.mulDiv(p.convertedUsd, BASIS_POINTS_DIVISOR_BIGINT - SIZE_FIT_MARGIN_BPS, BASIS_POINTS_DIVISOR_BIGINT) -
    increaseAmounts.borrowingFeeUsd -
    increaseAmounts.fundingFeeUsd;

  if (sizeDependentUsd <= 0n || availableUsd <= 0n) {
    return undefined;
  }

  return bigMath.mulDiv(increaseAmounts.indexTokenAmount, availableUsd, sizeDependentUsd);
}

export function getOrderAutoSubmitStep(p: {
  isSubmitting: boolean;
  isButtonLoading: boolean;
  isAllowanceLoaded: boolean;
  isButtonDisabled: boolean;
  isDepositButtonShown: boolean;
  approvalTokenAddress: string | undefined;
  isApprovalRequested: boolean;
}): OrderAutoSubmitStep {
  // before the allowance loads the button can't tell that it needs an approval
  if (p.isSubmitting || p.isButtonLoading || !p.isAllowanceLoaded) {
    return "wait";
  }

  // an error or a GMX Account deposit needs the trader, so the order must not go out later on its own
  if (p.isButtonDisabled || p.isDepositButtonShown) {
    return "stop";
  }

  if (p.approvalTokenAddress !== undefined) {
    // an approval already asked for is either still in the wallet (a remount drops the approving state) or was
    // rejected; either way it isn't asked again, and the arm's expiry or a tap on the trade box ends the wait
    return p.isApprovalRequested ? "wait" : "approve";
  }

  return "submit";
}

/**
 * The order follows the conversion and pays its own network fee, so the conversion must leave something to pay it:
 * the gas token left after the conversion, another gas token the order switches to, or wallet ETH for a classic
 * transaction
 */
export function getIsOrderStepGasCovered(p: {
  chainId: number;
  tokensData: TokensData | undefined;
  orderGasPaymentParams: GasPaymentParams | undefined;
  conversionGasPaymentParams: GasPaymentParams | undefined;
  payTokenAddress: string;
  payAmount: bigint;
  isGmxAccount: boolean;
}): boolean {
  const { orderGasPaymentParams, conversionGasPaymentParams } = p;

  // a classic order pays in ETH, which the conversion doesn't spend from the pay balance
  if (!orderGasPaymentParams) {
    return true;
  }

  const gasPaymentTokenAddress = orderGasPaymentParams.gasPaymentTokenAddress;
  const gasPaymentToken = getByKey(p.tokensData, gasPaymentTokenAddress);
  const balance = p.isGmxAccount ? gasPaymentToken?.gmxAccountBalance : gasPaymentToken?.walletBalance;
  const spentByConversion =
    (gasPaymentTokenAddress === p.payTokenAddress ? p.payAmount : 0n) +
    (conversionGasPaymentParams?.gasPaymentTokenAddress === gasPaymentTokenAddress
      ? conversionGasPaymentParams.gasPaymentTokenAmount
      : 0n);

  if (balance !== undefined && balance - spentByConversion >= orderGasPaymentParams.gasPaymentTokenAmount) {
    return true;
  }

  const nextGasPaymentTokenAddress = gasPaymentToken
    ? findNextGasPaymentToken({
        chainId: p.chainId,
        tokensData: p.tokensData,
        gasPaymentToken,
        gasPaymentTokenAmount: orderGasPaymentParams.gasPaymentTokenAmount,
        // the conversion spends the pay token first, so it can't stand in for the order's fee
        payAmounts: { [p.payTokenAddress]: p.payAmount },
        isGmxAccount: p.isGmxAccount,
      })
    : undefined;

  if (nextGasPaymentTokenAddress !== undefined) {
    return true;
  }

  const nativeWalletBalance = getByKey(p.tokensData, zeroAddress)?.walletBalance;

  return (
    !p.isGmxAccount &&
    nativeWalletBalance !== undefined &&
    nativeWalletBalance >= orderGasPaymentParams.totalRelayerFeeTokenAmount
  );
}
