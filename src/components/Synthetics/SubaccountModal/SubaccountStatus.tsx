import { Trans } from "@lingui/macro";
import {
  useIsSubaccountActive,
  useSubaccountActionCounts,
  useSubaccountInsufficientFunds,
  useSubaccountState,
} from "context/SubaccountContext/SubaccountContext";
import { ReactNode, memo } from "react";
import "./SubaccountStatus.scss";

function SubaccountStatusImpl() {
  const isSubaccountActive = useIsSubaccountActive();
  const { remaining: remainingActionsCount } = useSubaccountActionCounts();

  const oneClickTradingState = useSubaccountState();
  const shouldShowAllowedActionsError = isSubaccountActive && remainingActionsCount?.eq(0);
  const shouldShowInsufficientFundsWarning = remainingActionsCount?.lte(2) && isSubaccountActive;
  const insufficientFunds = useSubaccountInsufficientFunds(oneClickTradingState.baseExecutionFee?.feeTokenAmount);
  const shouldShowInsufficientFundsError = isSubaccountActive && insufficientFunds;

  let statusText: ReactNode = null;
  let description: ReactNode = null;
  let status: "warning" | "error" | "active" = "active";
  let needToShowRemainingActionsCount = false;

  if (shouldShowAllowedActionsError) {
    statusText = <Trans>One-Click Trading is inactive</Trans>;
    status = "error";
    description = <Trans>The previously authorized maximum number of Actions have been reached.</Trans>;
  } else if (shouldShowInsufficientFundsError) {
    statusText = <Trans>One-Click Trading is inactive.</Trans>;
    status = "error";
    description = <Trans>Not enough funds on subaccount.</Trans>;
  } else if (shouldShowInsufficientFundsWarning) {
    statusText = <Trans>One-Click Trading is active.</Trans>;
    status = "warning";
    needToShowRemainingActionsCount = true;
    description = <Trans>Funds are running low for One-Click Trading.</Trans>;
  } else if (!isSubaccountActive) {
    statusText = <Trans>One-Click Trading is inactive.</Trans>;
    status = "warning";
    description = <Trans>Need to click Activate to proceed.</Trans>;
  } else {
    statusText = <Trans>One-Click trading is active.</Trans>;
    status = "active";
    needToShowRemainingActionsCount = true;
  }

  const className = status === "error" ? "text-red" : status === "warning" ? "text-warning" : "text-green";

  return (
    <div className={`SubaccountStatus ${className}`}>
      {statusText && <div>Status: {statusText}</div>}
      {needToShowRemainingActionsCount && (
        <div>
          <Trans>Remaining actions: {remainingActionsCount?.toString()}</Trans>
        </div>
      )}
      <br />
      {description && <div>{description}</div>}
      {description && <br />}
    </div>
  );
}
export const SubaccountStatus = memo(SubaccountStatusImpl);
