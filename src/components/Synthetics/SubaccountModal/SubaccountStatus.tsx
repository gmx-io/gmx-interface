import { Trans, t } from "@lingui/macro";
import {
  useIsSubaccountActive,
  useSubaccountActionCounts,
  useSubaccountInsufficientFunds,
  useSubaccountState,
} from "context/SubaccountContext/SubaccountContext";
import { ReactNode, memo, useCallback } from "react";
import "./SubaccountStatus.scss";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { BigNumber } from "ethers";

function SubaccountStatusImpl({
  isSubaccountUpdating,
  hasBorder,
  approxNumberOfOperationsByBalance,
}: {
  isSubaccountUpdating: boolean;
  hasBorder: boolean;
  approxNumberOfOperationsByBalance: BigNumber | null;
}) {
  const isSubaccountActive = useIsSubaccountActive();
  const { remaining: remainingActionsCount } = useSubaccountActionCounts();

  const oneClickTradingState = useSubaccountState();
  const shouldShowAllowedActionsError = isSubaccountActive && remainingActionsCount?.eq(0);
  // FIXME
  const shouldShowInsufficientFundsWarning = false; // isSubaccountActive && remainingActionsCount?.lte(2) && isSubaccountActive;
  const insufficientFunds = useSubaccountInsufficientFunds(oneClickTradingState.baseExecutionFee?.feeTokenAmount);
  const shouldShowInsufficientFundsError = isSubaccountActive && insufficientFunds;

  let working = false;
  let description: ReactNode = null;
  let needToShowRemainingActionsCount = false;
  let statusText: string;

  if (isSubaccountUpdating) {
    statusText = t`Updating`;
    working = true;
  } else if (shouldShowAllowedActionsError) {
    statusText = t`Inactive`;
    working = false;
    description = <Trans>The previously authorized maximum number of Actions have been reached.</Trans>;
  } else if (shouldShowInsufficientFundsError) {
    statusText = t`Inactive`;
    working = false;
    description = (
      <Trans>
        Not enough funds on One&#8209;Click&nbsp;Trading subaccount. Use top-up field to increase the subaccount
        balance.
      </Trans>
    );
  } else if (shouldShowInsufficientFundsWarning) {
    statusText = t`Active`;
    working = true;
    needToShowRemainingActionsCount = true;
    description = <Trans>Almost out of funds for One&#8209;Click&nbsp;Trading.</Trans>;
  } else if (!isSubaccountActive) {
    statusText = t`Inactive`;
    working = false;
    description = <Trans>Need to click Activate to proceed.</Trans>;
  } else {
    statusText = t`Active`;
    working = true;
    needToShowRemainingActionsCount = true;
  }

  const renderRemainingContent = useCallback(() => {
    return (
      <>
        <StatsTooltipRow showDollar={false} label={t`Max allowed actions`} value={remainingActionsCount?.toString()} />
        <StatsTooltipRow
          showDollar={false}
          label={t`Based on balances`}
          value={approxNumberOfOperationsByBalance?.toString()}
        />
      </>
    );
  }, [approxNumberOfOperationsByBalance, remainingActionsCount]);

  const remaining = remainingActionsCount?.lt(approxNumberOfOperationsByBalance ?? 0)
    ? remainingActionsCount
    : approxNumberOfOperationsByBalance;

  return (
    <div className={`SubaccountStatus ${hasBorder ? "SubaccountStatus-border" : ""}`}>
      <StatsTooltipRow
        showDollar={false}
        label={t`Status`}
        value={
          description ? (
            <TooltipWithPortal
              position="right-top"
              handle={<span className={working ? undefined : "text-red"}>{statusText}</span>}
              renderContent={() => description}
            />
          ) : (
            <span className={working ? undefined : "text-red"}>{statusText}</span>
          )
        }
      />
      {needToShowRemainingActionsCount && (
        <StatsTooltipRow
          showDollar={false}
          label={t`Remaining actions`}
          value={
            <TooltipWithPortal
              position="right-top"
              renderContent={renderRemainingContent}
              handle={remaining?.toString()}
            />
          }
        />
      )}
    </div>
  );
}
export const SubaccountStatus = memo(SubaccountStatusImpl);
