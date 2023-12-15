import { t } from "@lingui/macro";
import { TokenData, convertToTokenAmount } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";

const ZERO = BigNumber.from(0);

export function getButtonState({
  topUp,
  maxAutoTopUpAmount,
  wntForAutoTopUps,
  maxAllowedActions,

  mainAccEthBalance,
  isSubaccountActive,

  accountUpdateLoading,
}: {
  topUp: BigNumber | null;
  maxAutoTopUpAmount: BigNumber | null;
  wntForAutoTopUps: BigNumber | null;
  maxAllowedActions: BigNumber | null;

  mainAccEthBalance: BigNumber | undefined;
  isSubaccountActive: boolean;

  accountUpdateLoading: boolean;
}): { text: string; disabled?: true; spinner?: true } {
  if (!mainAccEthBalance) {
    return { disabled: true, text: t`ETH is not available` };
  }

  const ethSpendAmount = (topUp ?? ZERO).add(wntForAutoTopUps ?? ZERO);

  if (mainAccEthBalance.lt(ethSpendAmount)) {
    return { disabled: true, text: t`Insufficient ETH balance` };
  }

  if (!isSubaccountActive && maxAutoTopUpAmount === null) {
    return { disabled: true, text: t`Maximum auto top-up amount is required` };
  }

  if (!isSubaccountActive && wntForAutoTopUps === null) {
    return { disabled: true, text: t`WETH for auto top-ups is required` };
  }

  if (!isSubaccountActive && maxAllowedActions === null) {
    return { disabled: true, text: t`Maximum allowed actions is required` };
  }

  if (accountUpdateLoading) {
    return { disabled: true, spinner: true, text: "" };
  } else if (isSubaccountActive) {
    let count = 0;
    if (topUp) count += 1;
    if (maxAutoTopUpAmount) count += 1;
    if (wntForAutoTopUps) count += 1;
    if (maxAllowedActions) count += 1;

    if (count === 0) {
      return { text: t`Nothing to Update`, disabled: true };
    }

    if (count === 1 || (count === 2 && maxAutoTopUpAmount)) {
      if (topUp) {
        return { text: t`Top-up balance` };
      }

      if (maxAllowedActions) {
        return { text: t`Re-authorize` };
      }
    }

    return { text: t`Update` };
  } else if (!isSubaccountActive) {
    return { text: t`Activate` };
  }

  return { disabled: true, spinner: true, text: "" };
}

export function getApproxSubaccountActionsCountByBalance(
  balance: BigNumber,
  executionFeeTokenAmount: BigNumber,
  autoTopUpAmount: BigNumber
) {
  if (balance.lt(executionFeeTokenAmount)) {
    return BigNumber.from(0);
  }

  const reducedCost = executionFeeTokenAmount.sub(autoTopUpAmount);
  if (reducedCost.lte(0)) {
    return "infinity";
  }

  return balance.div(reducedCost);
}

export function getDefaultValues(tokenData: TokenData) {
  return {
    topUp: notNullOrThrow(convertToTokenAmount(expandDecimals(20, 30), tokenData.decimals, tokenData.prices.maxPrice)),
    maxAutoTopUpAmount: notNullOrThrow(
      convertToTokenAmount(expandDecimals(5, 30), tokenData.decimals, tokenData.prices.maxPrice)
    ),
    wntForAutoTopUps: notNullOrThrow(
      convertToTokenAmount(expandDecimals(20, 30), tokenData.decimals, tokenData.prices.maxPrice)
    ),
    maxAllowedActions: notNullOrThrow(BigNumber.from(20)),
  };
}

function notNullOrThrow<T>(item: T | null | undefined): T {
  if (item === null || item === undefined) {
    throw new Error("Item is null or undefined");
  }

  return item;
}
