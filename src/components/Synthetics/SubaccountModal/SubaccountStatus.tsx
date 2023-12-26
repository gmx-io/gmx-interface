import { Trans, t } from "@lingui/macro";
import {
  useIsSubaccountActive,
  useSubaccountActionCounts,
  useSubaccountInsufficientFunds,
  useSubaccountState,
} from "context/SubaccountContext/SubaccountContext";
import { ReactNode, memo } from "react";
import "./SubaccountStatus.scss";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

function SubaccountStatusImpl() {
  const isSubaccountActive = useIsSubaccountActive();
  const { remaining: remainingActionsCount } = useSubaccountActionCounts();

  const oneClickTradingState = useSubaccountState();
  const shouldShowAllowedActionsError = isSubaccountActive && remainingActionsCount?.eq(0);
  const shouldShowInsufficientFundsWarning = remainingActionsCount?.lte(2) && isSubaccountActive;
  const insufficientFunds = useSubaccountInsufficientFunds(oneClickTradingState.baseExecutionFee?.feeTokenAmount);
  const shouldShowInsufficientFundsError = isSubaccountActive && insufficientFunds;

  let working = false;
  let description: ReactNode = null;
  let status: "warning" | "error" | "active" = "active";
  let needToShowRemainingActionsCount = false;

  if (shouldShowAllowedActionsError) {
    working = false;
    status = "error";
    description = <Trans>The previously authorized maximum number of Actions have been reached.</Trans>;
  } else if (shouldShowInsufficientFundsError) {
    working = false;
    status = "error";
    description = <Trans>Not enough funds on subaccount</Trans>;
  } else if (shouldShowInsufficientFundsWarning) {
    working = true;
    status = "warning";
    needToShowRemainingActionsCount = true;
    description = <Trans>Funds are running low for One-Click Trading</Trans>;
  } else if (!isSubaccountActive) {
    working = false;
    status = "warning";
    description = <Trans>Need to click Activate to proceed</Trans>;
  } else {
    working = true;
    status = "active";
    needToShowRemainingActionsCount = true;
  }

  const className = status === "error" ? "text-red" : status === "warning" ? "text-warning" : "text-green";

  return (
    <div className={`SubaccountStatus ${className}`}>
      {/* {statusText && <div>Status: {statusText}</div>} */}
      <StatsTooltipRow
        showDollar={false}
        label={t`Status`}
        value={
          description ? (
            <TooltipWithPortal
              position="right-bottom"
              handle={<span className={working ? undefined : "text-red"}>{working ? t`Working` : t`Not working`}</span>}
              renderContent={() => description}
            />
          ) : (
            <span className={working ? undefined : "text-red"}>{working ? t`Working` : t`Not working`}</span>
          )
        }
      />
      {needToShowRemainingActionsCount && (
        <StatsTooltipRow showDollar={false} label={t`Remaining actions`} value={remainingActionsCount?.toString()} />
      )}
    </div>
  );
}
export const SubaccountStatus = memo(SubaccountStatusImpl);
