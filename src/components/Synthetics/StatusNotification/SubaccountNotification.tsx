import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import SpinningLoader from "components/Common/SpinningLoader";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import { useSubaccountNotificationState, useSubaccountPendingTx } from "context/SubaccountContext/SubaccountContext";
import { useChainId } from "lib/chains";
import { museNeverExist } from "lib/types";
import { usePrevious } from "lib/usePrevious";
import { ReactNode, memo, useMemo } from "react";
import { useToastAutoClose } from "./useToastAutoClose";

const SubaccountNotificationImpl = ({
  toastId,
  subaccountWasAlreadyGenerated,
  subaccountWasAlreadyActivated,
}: {
  toastId: number;
  subaccountWasAlreadyGenerated: boolean;
  subaccountWasAlreadyActivated: boolean;
}) => {
  const hasError = false;

  const [notificationState] = useSubaccountNotificationState();
  const isCompleted = useMemo(() => {
    return ["activated", "deactivated", "deactivationFailed", "activationFailed", "generationFailed"].includes(
      notificationState
    );
  }, [notificationState]);
  useToastAutoClose(isCompleted, toastId);

  let content: ReactNode = null;
  let title: ReactNode = null;

  const [activeTx] = useSubaccountPendingTx();
  const { chainId } = useChainId();

  const latestTransactionHash = usePrevious(activeTx);
  const tx = isCompleted ? latestTransactionHash : activeTx;

  const link = useMemo(() => {
    if (!tx) return null;

    const txUrl = getExplorerUrl(chainId) + "tx/" + tx;
    return (
      <ExternalLink href={txUrl}>
        <Trans>View status.</Trans>
      </ExternalLink>
    );
  }, [chainId, tx]);

  const isUpdate = subaccountWasAlreadyGenerated && subaccountWasAlreadyActivated;
  const renderActivationTitle = () => {
    if (isUpdate) return t`Updating Subaccount`;
    return subaccountWasAlreadyGenerated ? t`Activating Subaccount` : t`Generating and activating Subaccount`;
  };
  const renderActivationContent = (step: 1 | 2 | 3) => {
    if (isUpdate) {
      if (step === 2)
        return (
          <span>
            <Trans>Pending Wallet transaction sign</Trans> <SpinningLoader />
          </span>
        );
      return <Trans>Subaccount is updated.</Trans>;
    }

    return (
      <div>
        {step === 1 ? <Trans>Pending Wallet message sign</Trans> : <Trans>Subaccount created.</Trans>}{" "}
        {step === 1 ? <SpinningLoader /> : null}
        <br />
        {step === 3 ? <Trans>Subaccount activated.</Trans> : <Trans>Pending Wallet transaction sign</Trans>}{" "}
        {step === 2 ? <SpinningLoader /> : null}
      </div>
    );
  };

  switch (notificationState) {
    case "generating":
      title = renderActivationTitle();
      content = renderActivationContent(1);
      break;

    case "generationFailed":
      title = renderActivationTitle();
      content = t`Subaccount generation failed.`;
      break;

    case "activating":
      title = renderActivationTitle();
      content = renderActivationContent(2);
      break;

    case "activated":
      title = renderActivationTitle();
      content = renderActivationContent(3);
      break;

    case "activationFailed":
      title = renderActivationTitle();
      content = t`Subaccount activation failed.`;
      break;

    case "deactivating":
      title = t`Deactivation`;
      content = (
        <div>
          <Trans>Deactivating subaccount.</Trans> <SpinningLoader />
        </div>
      );
      break;

    case "deactivated":
      title = t`Deactivation`;
      content = t`Subaccount deactivated.`;
      break;

    case "deactivationFailed":
      title = t`Deactivation`;
      content = t`Subaccount deactivation failed.`;
      break;

    case "none":
      return null;

    default:
      museNeverExist(notificationState);
  }

  return (
    <div className={"StatusNotification"}>
      <div className="StatusNotification-content">
        <div className="StatusNotification-title">{title}</div>
        <div className="StatusNotification-items">
          {content}
          {link && <br />}
          {link}
        </div>
      </div>

      <div className={cx("StatusNotification-background", { error: hasError })}></div>
    </div>
  );
};

export const SubaccountNotification = memo(SubaccountNotificationImpl) as typeof SubaccountNotificationImpl;
