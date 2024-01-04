import { Trans, t } from "@lingui/macro";
import {
  useIsSubaccountActive,
  useSubaccountActionCounts,
  useSubaccountAddress,
  useSubaccountInsufficientFunds,
  useSubaccountState,
} from "context/SubaccountContext/SubaccountContext";
import { ReactNode, memo, useCallback } from "react";
import "./SubaccountStatus.scss";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { BigNumber } from "ethers";
import infoIcon from "img/ic_info.svg";
import ExternalLink from "components/ExternalLink/ExternalLink";
import cx from "classnames";

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
  const insufficientFunds = useSubaccountInsufficientFunds(oneClickTradingState.baseExecutionFee?.feeTokenAmount);
  const shouldShowInsufficientFundsError = isSubaccountActive && insufficientFunds;

  let working = false;
  let description: ReactNode = null;
  let needToShowRemainingActionsCount = false;
  let statusText: string = "";
  let needToRenderActivationButton = false;

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
  } else if (!isSubaccountActive) {
    needToRenderActivationButton = true;
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

  const subaccountAddress = useSubaccountAddress();

  if (needToRenderActivationButton) {
    return (
      <Info standalone={!subaccountAddress}>
        Generate and activate a Subaccount for <ExternalLink href="#">One-Click Trading</ExternalLink> to reduce signing
        popups.
      </Info>
    );
  }

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

const Info = ({ standalone = false, children }: { children: ReactNode; standalone?: boolean }) => {
  return (
    <div className={cx("SubaccountModal-warning", { standalone })}>
      <div className="SubaccountModal-warning-icon">
        <img src={infoIcon} alt="Warning" />
      </div>
      <div className="SubaccountModal-warning-text text-gray">{children}</div>
    </div>
  );
};
