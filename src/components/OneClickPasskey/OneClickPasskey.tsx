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

  const restoreButton = (
    <Button variant="secondary" size="small" disabled={isButtonDisabled} onClick={() => onEnable("use")}>
      <Trans>Restore from passkey</Trans>
    </Button>
  );

  let content: ReactNode;

  if (isPasskeySession) {
    content = (
      <div className="text-12 text-green-500">
        <Trans>
          This session is saved to your passkey. Use Restore from passkey on your other devices. Turning One-Click off
          removes the session on all devices.
        </Trans>
      </div>
    );
  } else if (isUnavailable) {
    content = (
      <div className="text-12 text-yellow-300">
        <Trans>Passkeys are not available in this browser</Trans>
      </div>
    );
  } else if (isSessionUsable) {
    content = (
      <>
        <div className="text-12 text-typography-secondary">
          <Trans>
            Save this session to a passkey to use it on your other devices and after site data is cleared. Saved it on
            another device already? Restore it instead.
          </Trans>
        </div>
        <div className="flex flex-wrap gap-8">
          <Button variant="secondary" size="small" disabled={isButtonDisabled} onClick={() => onEnable("create")}>
            <Trans>Save to passkey</Trans>
          </Button>
          {restoreButton}
        </div>
      </>
    );
  } else {
    content = (
      <>
        <div className="text-12 text-typography-secondary">
          <Trans>Saved a One-Click session to a passkey on another device? Restore it here.</Trans>
        </div>
        <div className="flex flex-wrap gap-8">{restoreButton}</div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-8 rounded-8 border-1/2 border-slate-600 p-12" data-qa="one-click-passkey">
      <div className="text-14 font-medium text-typography-primary">
        <Trans>Passkey (experimental)</Trans>
      </div>
      {content}
      <ExpandableRow open={isDetailsOpen} onToggle={setIsDetailsOpen} title={<Trans>Details</Trans>}>
        <pre className="whitespace-pre-wrap break-all text-12 text-typography-secondary">{details}</pre>
      </ExpandableRow>
    </div>
  );
}
