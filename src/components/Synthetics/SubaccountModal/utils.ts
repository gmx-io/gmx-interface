import { t } from "@lingui/macro";
import { SubaccountNotificationState } from "context/SubaccountContext/SubaccountContext";
import { TokenData, convertToTokenAmount } from "domain/synthetics/tokens";
import { BN_ZERO, expandDecimals } from "lib/numbers";
import { FormState } from "./SubaccountModal";

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
  topUp: bigint | null;
  maxAutoTopUpAmount: bigint | null;
  wntForAutoTopUps: bigint | null;
  maxAllowedActions: bigint | null;

  subaccountAddress: string | null;

  needPayTokenApproval: boolean;
  isTxPending: boolean;
  notificationState: SubaccountNotificationState;
  formState: FormState;
  withdrawalLoading: boolean;

  mainAccEthBalance: bigint | undefined;
  isSubaccountActive: boolean;

  accountUpdateLoading: boolean;

  nativeTokenSymbol: string;
  wrappedTokenSymbol: string;
}): { text: string; disabled?: true } {
  const ethSpendAmount = (topUp ?? BN_ZERO) + (wntForAutoTopUps ?? BN_ZERO);

  if (mainAccEthBalance === undefined) {
    return { disabled: true, text: t`${nativeTokenSymbol} is not available` };
  }

  if (mainAccEthBalance < ethSpendAmount) {
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
    if (topUp !== null) count += 1;
    if (maxAutoTopUpAmount !== null) count += 1;
    if (wntForAutoTopUps !== null) count += 1;
    if (maxAllowedActions !== null) count += 1;

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
  mainAccWrappedTokenBalance: bigint,
  subAccNativeTokenBalance: bigint,
  executionFee: bigint,
  currentAutoTopUpAmount: bigint
) {
  if (executionFee > subAccNativeTokenBalance) {
    return 0n;
  }

  if (executionFee == undefined || executionFee <= 0) {
    return null;
  }

  const topUp = currentAutoTopUpAmount > executionFee ? executionFee : currentAutoTopUpAmount;
  const reducedCost = executionFee - topUp;

  // execution fee is fully reduced, calculating sum(countByMainAccBalance, subAccNativeTokenBalance / executionFee)
  if (reducedCost <= 0) {
    // how many times we can transfer executionFee + how many times we can perform without topUp
    const countByMainAccBalance = topUp <= 0 ? 0n : mainAccWrappedTokenBalance / topUp;
    return countByMainAccBalance + subAccNativeTokenBalance / executionFee;
  }

  const operationsWithReducedCost = subAccNativeTokenBalance / reducedCost;
  const operationsBackedByMainAccBalance = topUp == 0n ? 0n : mainAccWrappedTokenBalance / topUp;

  if (operationsWithReducedCost <= operationsBackedByMainAccBalance) {
    return (subAccNativeTokenBalance - executionFee) / reducedCost + 1n;
  } else {
    const operationsWithoutReduce =
      (subAccNativeTokenBalance - reducedCost * operationsBackedByMainAccBalance) / executionFee;

    return operationsBackedByMainAccBalance + operationsWithoutReduce;
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
    maxAllowedActions: 10n,
  };
}

function notNullOrThrow<T>(item: T | null | undefined): T {
  if (item === null || item === undefined) {
    throw new Error("Item is null or undefined");
  }

  return item;
}
