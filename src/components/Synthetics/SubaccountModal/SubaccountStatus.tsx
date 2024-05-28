import { Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getNativeToken, getWrappedToken } from "config/tokens";
import {
  useIsSubaccountActive,
  useMainAccountInsufficientFunds,
  useSubaccountActionCounts,
  useSubaccountAddress,
  useSubaccountDefaultExecutionFee,
  useSubaccountInsufficientFunds,
} from "context/SubaccountContext/SubaccountContext";
import { SUBACCOUNT_DOCS_URL } from "domain/synthetics/subaccount/constants";
import { useChainId } from "lib/chains";
import { ReactNode, memo } from "react";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import "./SubaccountStatus.scss";

function SubaccountStatusImpl({
  hasBorder,
  onTopUpClick,
  onConvertClick,
  onMaxAllowedActionsClick,
}: {
  hasBorder: boolean;
  onTopUpClick: () => void;
  onConvertClick: () => void;
  onMaxAllowedActionsClick: () => void;
}) {
  const isSubaccountActive = useIsSubaccountActive();
  const { remaining: remainingActionsCount } = useSubaccountActionCounts();

  const shouldShowAllowedActionsError = isSubaccountActive && remainingActionsCount == 0n;
  const baseFeePerAction = useSubaccountDefaultExecutionFee();
  const subAccountInsufficientFunds = useSubaccountInsufficientFunds(baseFeePerAction);
  const mainACcountInsufficientFunds = useMainAccountInsufficientFunds(baseFeePerAction);
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
        <AlertInfo type="warning" key="1">
          <Trans>
            The maximum number of authorized Actions has been reached. Re-authorize a higher value using the "
            <span onClick={onMaxAllowedActionsClick} className="SubaccountStatus-clickable-text">
              Max allowed actions
            </span>
            " field.
          </Trans>
        </AlertInfo>
      );
    }

    if (shouldShowSubaccountInsufficientFundsError) {
      content.push(
        <AlertInfo type="warning" key="2">
          <Trans>
            There are insufficient funds in your Subaccount for One-Click Trading. Use the "
            <span onClick={onTopUpClick} className="SubaccountStatus-clickable-text">
              Top-up
            </span>
            " field to increase the Subaccount Balance.
          </Trans>
        </AlertInfo>
      );
    }

    if (shouldShowMainAccountInsufficientFundsError) {
      const wrappedToken = getWrappedToken(chainId);
      const nativeToken = getNativeToken(chainId);
      content.push(
        <AlertInfo type="warning" key="3">
          <Trans>
            Not enough {wrappedToken.symbol} on your Main Account. Use the "
            <span onClick={onConvertClick} className="SubaccountStatus-clickable-text">
              Convert {nativeToken.symbol} to {wrappedToken.symbol}
            </span>
            " field to increase the Main Account {wrappedToken.symbol} balance.
          </Trans>
        </AlertInfo>
      );
    }
  } else if (!isSubaccountActive) {
    return (
      <AlertInfo type="info" compact={!subaccountAddress}>
        <Trans>
          Generate and activate a Subaccount for{" "}
          <ExternalLink href={SUBACCOUNT_DOCS_URL}>One-Click Trading</ExternalLink> to reduce signing popups.
        </Trans>
      </AlertInfo>
    );
  } else {
    return null;
  }

  return <div className={`SubaccountStatus ${hasBorder ? "SubaccountStatus-border" : ""}`}>{content}</div>;
}

export const SubaccountStatus = memo(SubaccountStatusImpl) as typeof SubaccountStatusImpl;
