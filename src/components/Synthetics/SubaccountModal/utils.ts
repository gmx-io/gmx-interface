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

  needPayTokenApproval,

  mainAccEthBalance,
  isSubaccountActive,

  accountUpdateLoading,

  nativeTokenSymbol,
  wrappedTokenSymbol,
}: {
  topUp: BigNumber | null;
  maxAutoTopUpAmount: BigNumber | null;
  wntForAutoTopUps: BigNumber | null;
  maxAllowedActions: BigNumber | null;

  needPayTokenApproval: boolean;

  mainAccEthBalance: BigNumber | undefined;
  isSubaccountActive: boolean;

  accountUpdateLoading: boolean;

  nativeTokenSymbol: string;
  wrappedTokenSymbol: string;
}): { text: string; disabled?: true; spinner?: true } {
  if (!mainAccEthBalance) {
    return { disabled: true, text: t`${nativeTokenSymbol} is not available` };
  }

  if (needPayTokenApproval) {
    return { disabled: true, text: t`Allow ${wrappedTokenSymbol} to be spent` };
  }

  const ethSpendAmount = (topUp ?? ZERO).add(wntForAutoTopUps ?? ZERO);

  if (mainAccEthBalance.lt(ethSpendAmount)) {
    return { disabled: true, text: t`Insufficient ${nativeTokenSymbol} balance` };
  }

  if (!isSubaccountActive && maxAutoTopUpAmount === null) {
    return { disabled: true, text: t`Maximum auto top-up amount is required` };
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
      return { text: t`Update`, disabled: true };
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
