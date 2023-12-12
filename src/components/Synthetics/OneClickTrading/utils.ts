import { t } from "@lingui/macro";

export function getValidationError({
  initialTopUpIsEmpty,
  maxAutoTopUpAmountIsEmpty,
  wethForAutoTopUpsIsEmpty,
  maxAllowedActionsIsEmpty,
}: {
  initialTopUpIsEmpty: boolean;
  maxAutoTopUpAmountIsEmpty: boolean;
  wethForAutoTopUpsIsEmpty: boolean;
  maxAllowedActionsIsEmpty: boolean;
}) {
  if (initialTopUpIsEmpty) {
    return t`Initial top-up amount is required`;
  }

  if (maxAutoTopUpAmountIsEmpty) {
    return t`Maximum auto top-up amount is required`;
  }

  if (wethForAutoTopUpsIsEmpty) {
    return t`WETH for auto top-ups is required`;
  }

  if (maxAllowedActionsIsEmpty) {
    return t`Maximum allowed actions is required`;
  }

  return null;
}
