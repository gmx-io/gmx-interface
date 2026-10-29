import { plural, t, Trans } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { getIsPasskeySubaccountConfig } from "domain/synthetics/subaccount/passkey";
import {
  getIsSubaccountSessionUsable,
  getSubaccountSessionRemainingActions,
  type SubaccountSession,
  useSubaccountSessions,
} from "domain/synthetics/subaccount/subaccountSessions";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";
import { shortenAddress } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";
import { nowInSeconds } from "sdk/utils/time";

import Button from "components/Button/Button";
import { ExpandableRow } from "components/ExpandableRow";
import { Chip } from "components/SettingsModal/shared";

const NO_EXPIRY_TIMESTAMP = 4102444800n;
const UNLIMITED_ACTIONS = 1_000_000n;

function getSessionStatusText(session: SubaccountSession): string {
  if (getIsSubaccountSessionUsable(session)) {
    const remainingActions = getSubaccountSessionRemainingActions(session);
    const actionsText =
      remainingActions >= UNLIMITED_ACTIONS
        ? t`unlimited actions`
        : plural(Number(remainingActions), { one: "# action left", other: "# actions left" });

    if (session.expiresAt >= NO_EXPIRY_TIMESTAMP) {
      return t`Active, no expiry, ${actionsText}`;
    }

    return t`Active until ${formatDate(Number(session.expiresAt))}, ${actionsText}`;
  }

  if (session.expiresAt <= BigInt(nowInSeconds())) {
    return t`Expired`;
  }

  return t`No actions left`;
}

export function OneClickSessions() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const { subaccountConfig, legacySubaccountConfig, removeSubaccountSessions } = useSubaccountContext();
  const { sessions, refreshSessions } = useSubaccountSessions(chainId, account);
  const [isExpanded, setIsExpanded] = useState(false);
  const [removingAddresses, setRemovingAddresses] = useState<string[]>([]);

  const currentAddress = subaccountConfig?.address;
  const legacyAddress = legacySubaccountConfig?.address;
  const isPasskeySession = getIsPasskeySubaccountConfig(subaccountConfig);

  const sortedSessions = useMemo(() => {
    if (!sessions) {
      return [];
    }

    const getRank = (session: SubaccountSession) => {
      if (session.address === currentAddress) {
        return 0;
      }

      return getIsSubaccountSessionUsable(session) ? 1 : 2;
    };

    return [...sessions].sort((a, b) => getRank(a) - getRank(b));
  }, [currentAddress, sessions]);

  const otherSessionAddresses = useMemo(
    () => sortedSessions.filter((session) => session.address !== currentAddress).map((session) => session.address),
    [currentAddress, sortedSessions]
  );

  const handleRemove = useCallback(
    async (subaccountAddresses: string[]) => {
      setRemovingAddresses(subaccountAddresses);

      try {
        await removeSubaccountSessions(subaccountAddresses);
      } finally {
        setRemovingAddresses([]);
        refreshSessions();
      }
    },
    [refreshSessions, removeSubaccountSessions]
  );

  if (sortedSessions.length === 0) {
    return null;
  }

  const isRemoving = removingAddresses.length > 0;

  return (
    <ExpandableRow
      open={isExpanded}
      onToggle={setIsExpanded}
      title={<Trans>One-Click sessions ({sortedSessions.length})</Trans>}
      className="mb-4"
    >
      <div className="flex flex-col gap-12" data-qa="one-click-sessions">
        <div className="text-12 text-typography-secondary">
          <Trans>
            Each browser where you turn on One-Click Trading has its own session. Bots and apps that trade for you also
            appear here.
          </Trans>
        </div>

        {sortedSessions.map((session) => {
          const isCurrent = session.address === currentAddress;
          const isLegacy = session.address === legacyAddress;

          return (
            <div
              key={session.address}
              className="flex items-center justify-between gap-8"
              data-qa="one-click-session"
              data-address={session.address}
            >
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-6 text-13 text-typography-primary">
                  <span>{shortenAddress(session.address, 13)}</span>
                  {isCurrent && (
                    <Chip variant="outline">
                      <Trans>This browser</Trans>
                    </Chip>
                  )}
                  {isCurrent && isPasskeySession && (
                    <Chip variant="outline">
                      <Trans>Passkey</Trans>
                    </Chip>
                  )}
                  {isLegacy && (
                    <Chip variant="outline">
                      <Trans>Old session</Trans>
                    </Chip>
                  )}
                </div>
                <div className="text-12 text-typography-secondary">{getSessionStatusText(session)}</div>
              </div>

              {!isCurrent && (
                <Button
                  variant="ghost"
                  size="small"
                  disabled={isRemoving}
                  onClick={() => handleRemove([session.address])}
                >
                  {removingAddresses.includes(session.address) ? <Trans>Removing...</Trans> : <Trans>Remove</Trans>}
                </Button>
              )}
            </div>
          );
        })}

        {otherSessionAddresses.length > 1 && (
          <Button
            variant="secondary"
            size="small"
            textAlign="center"
            showExternalLinkArrow={false}
            disabled={isRemoving}
            onClick={() => handleRemove(otherSessionAddresses)}
          >
            <Trans>Remove all other sessions</Trans>
          </Button>
        )}
      </div>
    </ExpandableRow>
  );
}
