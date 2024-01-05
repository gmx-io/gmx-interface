import { Trans } from "@lingui/macro";
import cx from "classnames";
import ExternalLink from "components/ExternalLink/ExternalLink";
import {
  useIsSubaccountActive,
  useSubaccountActionCounts,
  useSubaccountAddress,
  useSubaccountInsufficientFunds,
  useSubaccountState,
} from "context/SubaccountContext/SubaccountContext";
import { SUBACCOUNT_DOCS_URL } from "domain/synthetics/subaccount/constants";
import infoIcon from "img/ic_info.svg";
import warnIcon from "img/ic_warn.svg";
import { ReactNode, memo } from "react";
import "./SubaccountStatus.scss";

function SubaccountStatusImpl({ hasBorder }: { hasBorder: boolean }) {
  const isSubaccountActive = useIsSubaccountActive();
  const { remaining: remainingActionsCount } = useSubaccountActionCounts();

  const oneClickTradingState = useSubaccountState();
  const shouldShowAllowedActionsError = isSubaccountActive && remainingActionsCount?.eq(0);
  const insufficientFunds = useSubaccountInsufficientFunds(oneClickTradingState.baseExecutionFee?.feeTokenAmount);
  const subaccountAddress = useSubaccountAddress();
  const shouldShowInsufficientFundsError = isSubaccountActive && insufficientFunds;

  const content: ReactNode[] = [];

  if (shouldShowAllowedActionsError || shouldShowInsufficientFundsError) {
    if (shouldShowAllowedActionsError) {
      content.push(
        <Info warning key="1">
          <Trans>The previously authorized maximum number of Actions have been reached.</Trans>
        </Info>
      );
    }

    if (shouldShowInsufficientFundsError) {
      content.push(
        <Info warning key="2">
          <Trans>
            Not enough funds on One&#8209;Click&nbsp;Trading subaccount. Use top-up field to increase the subaccount
            balance.
          </Trans>
        </Info>
      );
    }
  } else if (!isSubaccountActive) {
    return (
      <Info standalone={!subaccountAddress}>
        <Trans>
          Generate and activate a Subaccount for{" "}
          <ExternalLink href={SUBACCOUNT_DOCS_URL}>One-Click Trading</ExternalLink> to reduce signing popups.
        </Trans>
      </Info>
    );
  } else {
    return null;
  }

  return <div className={`SubaccountStatus ${hasBorder ? "SubaccountStatus-border" : ""}`}>{content}</div>;
}

export const SubaccountStatus = memo(SubaccountStatusImpl) as typeof SubaccountStatusImpl;

const Info = ({
  standalone = false,
  children,
  warning,
}: {
  children: ReactNode;
  standalone?: boolean;
  warning?: boolean;
}) => {
  return (
    <div className={cx("SubaccountModal-warning", { standalone })}>
      <div className="SubaccountModal-warning-icon">
        <img src={warning ? warnIcon : infoIcon} alt="Warning" />
      </div>
      <div className="SubaccountModal-warning-text text-gray">{children}</div>
    </div>
  );
};
