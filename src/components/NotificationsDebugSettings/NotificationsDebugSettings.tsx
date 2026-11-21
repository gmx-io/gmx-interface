import { Trans } from "@lingui/macro";
import { useState } from "react";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { useNotificationsContext } from "context/NotificationsContext/NotificationsContextProvider";

import Button from "components/Button/Button";
import { ExpandableRow } from "components/ExpandableRow";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

export function NotificationsDebugSettings() {
  const [open, setOpen] = useState(false);
  const { openConnectModal } = useConnectModal();
  const { status, receivingAccount, pendingAccount, error, testState, turnOn, turnOff, retry, sendTest } =
    useNotificationsContext();

  const isBusy = status === "turningOn" || status === "turningOff";
  const isOn = status === "on" || status === "walletSwitchFailed";
  const canTurnOn = status === "off" || status === "notAsked" || status === "on";
  const canRetry =
    status === "turnOnFailed" ||
    status === "walletSwitchFailed" ||
    status === "limitReached" ||
    (status === "on" && Boolean(error));

  return (
    <ExpandableRow title={<Trans>Push notifications</Trans>} open={open} onToggle={setOpen}>
      <div className="flex flex-col gap-12 rounded-8 bg-slate-800 p-12 text-12">
        <SyntheticsInfoRow label={<Trans>Status</Trans>} value={status} />
        <SyntheticsInfoRow label={<Trans>Wallet</Trans>} value={receivingAccount ?? "-"} valueClassName="break-all" />
        {pendingAccount && (
          <SyntheticsInfoRow label={<Trans>Pending wallet</Trans>} value={pendingAccount} valueClassName="break-all" />
        )}
        {testState && (
          <SyntheticsInfoRow
            label={<Trans>Test</Trans>}
            value={testState === "cooldown" ? <Trans>Wait one minute between tests</Trans> : testState}
          />
        )}
        {status === "blocked" && (
          <div className="text-yellow-300">
            <Trans>The browser blocks notifications for this site</Trans>
          </div>
        )}
        {error && <div className="break-words text-red-500">{error}</div>}

        <div className="flex flex-wrap gap-8">
          {status === "noWallet" && openConnectModal && (
            <Button variant="secondary" onClick={openConnectModal}>
              <Trans>Connect wallet</Trans>
            </Button>
          )}
          <Button variant="secondary" disabled={isBusy || !canTurnOn} onClick={turnOn}>
            <Trans>Turn on</Trans>
          </Button>
          <Button variant="secondary" disabled={isBusy || (!isOn && status !== "limitReached")} onClick={turnOff}>
            <Trans>Turn off</Trans>
          </Button>
          <Button variant="secondary" disabled={!isOn || testState === "sending"} onClick={sendTest}>
            <Trans>Send test</Trans>
          </Button>
          {canRetry && (
            <Button variant="secondary" disabled={isBusy} onClick={retry}>
              <Trans>Retry</Trans>
            </Button>
          )}
        </div>
      </div>
    </ExpandableRow>
  );
}
