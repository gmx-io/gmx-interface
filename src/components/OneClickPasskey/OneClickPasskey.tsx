import { Trans } from "@lingui/macro";
import { type ReactNode, useMemo, useState } from "react";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import {
  getIsPasskeySubaccountConfig,
  getIsPasskeyUnavailable,
  type PasskeyMode,
  useLastPasskeyAttempt,
  usePasskeySupport,
} from "domain/synthetics/subaccount/passkey";
import { getIsSubaccountActionsExceeded, getIsSubaccountExpired } from "domain/synthetics/subaccount/utils";

import Button from "components/Button/Button";
import { ExpandableRow } from "components/ExpandableRow";

export function OneClickPasskey({ disabled, onEnable }: { disabled: boolean; onEnable: (mode: PasskeyMode) => void }) {
  const { subaccount, subaccountConfig, isSubaccountReady } = useSubaccountContext();
  const support = usePasskeySupport();
  const lastAttempt = useLastPasskeyAttempt();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const isUnavailable = getIsPasskeyUnavailable(support);
  const isSessionUsable = Boolean(
    subaccount && !getIsSubaccountExpired(subaccount) && !getIsSubaccountActionsExceeded(subaccount, 1)
  );
  const isPasskeySession = isSessionUsable && getIsPasskeySubaccountConfig(subaccountConfig);
  const isButtonDisabled = disabled || !isSubaccountReady;

  const details = useMemo(
    () => JSON.stringify({ support, lastAttempt, userAgent: navigator.userAgent }, null, 2),
    [lastAttempt, support]
  );

  let status: ReactNode;

  if (isPasskeySession) {
    status = (
      <div className="text-12 text-green-500">
        <Trans>This browser uses the passkey session</Trans>
      </div>
    );
  } else if (isSessionUsable) {
    status = (
      <div className="text-12 text-typography-secondary">
        <Trans>Turn off One-Click to switch this browser to a passkey</Trans>
      </div>
    );
  } else if (isUnavailable) {
    status = (
      <div className="text-12 text-yellow-300">
        <Trans>Passkeys are not available in this browser</Trans>
      </div>
    );
  } else {
    status = (
      <div className="flex flex-wrap gap-8">
        <Button variant="secondary" size="small" disabled={isButtonDisabled} onClick={() => onEnable("create")}>
          <Trans>Create passkey</Trans>
        </Button>
        <Button variant="secondary" size="small" disabled={isButtonDisabled} onClick={() => onEnable("use")}>
          <Trans>Use passkey</Trans>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 rounded-8 border-1/2 border-slate-600 p-12" data-qa="one-click-passkey">
      <div className="text-14 font-medium text-typography-primary">
        <Trans>Passkey (experimental)</Trans>
      </div>
      <div className="text-12 text-typography-secondary">
        <Trans>
          One passkey keeps one One-Click session on all your devices, also after site data is cleared. Turning
          One-Click off removes this session on all devices.
        </Trans>
      </div>
      {status}
      <ExpandableRow open={isDetailsOpen} onToggle={setIsDetailsOpen} title={<Trans>Details</Trans>}>
        <pre className="whitespace-pre-wrap break-all text-12 text-typography-secondary">{details}</pre>
      </ExpandableRow>
    </div>
  );
}
