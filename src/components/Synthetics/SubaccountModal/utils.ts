import { t } from "@lingui/macro";
import { SubaccountNotificationState } from "context/SubaccountContext/SubaccountContext";
import { TokenData, convertToTokenAmount } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";
import { FormState } from "./SubaccountModal";

const ZERO = BigInt(0);

export function getButtonState({
  topUp,
  maxAutoTopUpAmount,
  wntForAutoTopUps,
  maxAllowedActions,

  subaccountAddress,

  needPayTokenApproval,
  isTxPending,
  notificationState,
  formState,
  withdrawalLoading,

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

  subaccountAddress: string | null;

  needPayTokenApproval: boolean;
  isTxPending: boolean;
  notificationState: SubaccountNotificationState;
  formState: FormState;
  withdrawalLoading: boolean;

  mainAccEthBalance: BigNumber | undefined;
  isSubaccountActive: boolean;

  accountUpdateLoading: boolean;

  nativeTokenSymbol: string;
  wrappedTokenSymbol: string;
}): { text: string; disabled?: true } {
  const ethSpendAmount = (topUp ?? ZERO).add(wntForAutoTopUps ?? ZERO);

  if (!mainAccEthBalance) {
    return { disabled: true, text: t`${nativeTokenSymbol} is not available` };
  }

  if (mainAccEthBalance.lt(ethSpendAmount)) {
    return { disabled: true, text: t`Insufficient ${nativeTokenSymbol} balance` };
  }

  if (!isSubaccountActive && maxAutoTopUpAmount === null) {
    return { disabled: true, text: t`Maximum auto top-up amount is required` };
  }

  if (!isSubaccountActive && maxAllowedActions === null) {
    return { disabled: true, text: t`Maximum allowed actions is required` };
  }

  if (needPayTokenApproval) {
    return { disabled: true, text: t`Allow ${wrappedTokenSymbol} to be spent` };
  }

  if (isTxPending) {
    if (notificationState === "activating" && formState === "inactive") {
      return { disabled: true, text: "Activating Subaccount..." };
    } else if (notificationState === "deactivating") {
      return { disabled: true, text: "Deactivating Subaccount..." };
    } else if (notificationState === "generating" && formState === "inactive") {
      return { disabled: true, text: "Generating Subaccount..." };
    }
    return { disabled: true, text: "Waiting for transaction..." };
  }

  if (withdrawalLoading) {
    return { disabled: true, text: "Withdrawing..." };
  }

  if (accountUpdateLoading) {
    if (notificationState === "activating" && formState === "inactive") {
      return { disabled: true, text: "Activating Subaccount..." };
    } else if (notificationState === "deactivating" && formState === "activated") {
      return { disabled: true, text: "Deactivating Subaccount..." };
    } else if (notificationState === "generating" && formState === "inactive") {
      return { disabled: true, text: "Generating Subaccount..." };
    }

    return { disabled: true, text: "Updating..." };
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
  } else if (!isSubaccountActive && notificationState !== "activated") {
    if (subaccountAddress) {
      return { text: t`Activate Subaccount` };
    } else {
      return { text: t`Generate & Activate Subaccount` };
    }
  }

  return { text: t`Update`, disabled: true };
}

export function getApproxSubaccountActionsCountByBalance(
  mainAccWrappedTokenBalance: BigNumber,
  subAccNativeTokenBalance: BigNumber,
  executionFee: BigNumber,
  currentAutoTopUpAmount: BigNumber
) {
  if (executionFee.gt(subAccNativeTokenBalance)) {
    return BigInt(0);
  }

  if (!executionFee || executionFee.lte(0)) {
    return null;
  }

  const topUp = currentAutoTopUpAmount.gt(executionFee) ? executionFee : currentAutoTopUpAmount;
  const reducedCost = executionFee.sub(topUp);

  // execution fee is fully reduced, calculating sum(countByMainAccBalance, subAccNativeTokenBalance / executionFee)
  if (reducedCost.lte(0)) {
    // how many times we can transfer executionFee + how many times we can perform without topUp
    const countByMainAccBalance = topUp.lte(0) ? BigInt(0) : mainAccWrappedTokenBalance.div(topUp);
    return countByMainAccBalance.add(subAccNativeTokenBalance.div(executionFee));
  }

  const operationsWithReducedCost = subAccNativeTokenBalance.div(reducedCost);
  const operationsBackedByMainAccBalance = topUp.eq(0) ? BigInt(0) : mainAccWrappedTokenBalance.div(topUp);

  if (operationsWithReducedCost.lte(operationsBackedByMainAccBalance)) {
    return subAccNativeTokenBalance.sub(executionFee).div(reducedCost).add(1);
  } else {
    const operationsWithoutReduce = subAccNativeTokenBalance
      .sub(reducedCost.mul(operationsBackedByMainAccBalance))
      .div(executionFee);

    return operationsBackedByMainAccBalance.add(operationsWithoutReduce);
  }
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
    maxAllowedActions: notNullOrThrow(BigInt(10)),
  };
}

function notNullOrThrow<T>(item: T | null | undefined): T {
  if (item === null || item === undefined) {
    throw new Error("Item is null or undefined");
  }

  return item;
}
