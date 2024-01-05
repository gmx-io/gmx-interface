import { Trans } from "@lingui/macro";
import cx from "classnames";
import ExternalLink from "components/ExternalLink/ExternalLink";
import {
  useIsSubaccountActive,
  useMainAccountInsufficientFunds,
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
import { getNativeToken, getWrappedToken } from "config/tokens";
import { useChainId } from "lib/chains";

function SubaccountStatusImpl({ hasBorder }: { hasBorder: boolean }) {
  const isSubaccountActive = useIsSubaccountActive();
  const { remaining: remainingActionsCount } = useSubaccountActionCounts();

  const oneClickTradingState = useSubaccountState();
  const shouldShowAllowedActionsError = isSubaccountActive && remainingActionsCount?.eq(0);
  const subAccountInsufficientFunds = useSubaccountInsufficientFunds(
    oneClickTradingState.baseExecutionFee?.feeTokenAmount
  );
  const mainACcountInsufficientFunds = useMainAccountInsufficientFunds(
    oneClickTradingState.baseExecutionFee?.feeTokenAmount
  );
  const subaccountAddress = useSubaccountAddress();
  const { chainId } = useChainId();
  const shouldShowSubaccountInsufficientFundsError = isSubaccountActive && subAccountInsufficientFunds;
  const shouldShowMainAccountInsufficientFundsError = isSubaccountActive && mainACcountInsufficientFunds;

  const content: ReactNode[] = [];

  if (
    shouldShowAllowedActionsError ||
    shouldShowSubaccountInsufficientFundsError ||
    shouldShowMainAccountInsufficientFundsError
  ) {
    if (shouldShowAllowedActionsError) {
      content.push(
        <Info warning key="1">
          <Trans>
            The maximum number of authorized Actions has been reached. Re-authorize a higher value using the Max allowed
            actions field.
          </Trans>
        </Info>
      );
    }

    if (shouldShowSubaccountInsufficientFundsError) {
      content.push(
        <Info warning key="2">
          <Trans>
            Not enough funds on One&#8209;Click&nbsp;Trading subaccount. Use top-up field to increase the subaccount
            balance.
          </Trans>
        </Info>
      );
    }

    if (shouldShowMainAccountInsufficientFundsError) {
      const wrappedToken = getWrappedToken(chainId);
      const nativeToken = getNativeToken(chainId);
      content.push(
        <Info warning key="3">
          <Trans>
            Not enough {wrappedToken.symbol} on your main account. Use Convert {wrappedToken.symbol} to{" "}
            {nativeToken.symbol} field to increase the balance.
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
