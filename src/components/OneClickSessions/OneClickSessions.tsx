import { plural, t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import {
  getCurrentSubaccountSession,
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

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { ExpandableRow } from "components/ExpandableRow";
import { Chip } from "components/SettingsModal/shared";

const NO_EXPIRY_TIMESTAMP = 4102444800n;
const UNLIMITED_ACTIONS = 1_000_000n;

function getSessionStatusText(session: SubaccountSession): string {
  if (session.isResignNeeded) {
    return t`Re-sign needed`;
  }

  if (getIsSubaccountSessionUsable(session)) {
    const remainingActions = getSubaccountSessionRemainingActions(session);
    const actionsText =
      remainingActions >= UNLIMITED_ACTIONS
        ? t`unlimited actions`
        : plural(Number(remainingActions), { one: "# action left", other: "# actions left" });

    if (session.isPending) {
      return t`Pending first trade, ${actionsText}`;
    }

    let activeText = t`Active, no expiry, ${actionsText}`;

    if (session.expiresAt < NO_EXPIRY_TIMESTAMP) {
      const expiryDate = formatDate(Number(session.expiresAt));

      activeText = t`Active until ${expiryDate}, ${actionsText}`;
    }

    return session.hasPendingChanges ? t`${activeText}, pending next trade` : activeText;
  }

  if (session.expiresAt === 0n) {
    return t`Expired`;
  }

  if (session.expiresAt <= BigInt(nowInSeconds())) {
    const expiryDate = formatDate(Number(session.expiresAt));

    return t`Expired on ${expiryDate}`;
  }

  return t`No actions left`;
}

export function OneClickSessions() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const { subaccount, subaccountConfig, legacySubaccountConfig, removeSubaccountSessions } = useSubaccountContext();
  const { sessions, refreshSessions } = useSubaccountSessions(chainId, account);
  const [isExpanded, setIsExpanded] = useState(false);
  const [removeAllConfirmKey, setRemoveAllConfirmKey] = useState<string | undefined>(undefined);
  const [removingAddresses, setRemovingAddresses] = useState<string[]>([]);

  const currentAddress = subaccountConfig?.isNew ? subaccountConfig.address : undefined;
  const legacyAddress = legacySubaccountConfig?.address;

  useEffect(
    function refreshSessionsOnCurrentSessionChange() {
      refreshSessions();
    },
    [currentAddress, refreshSessions]
  );

  const sortedSessions = useMemo(() => {
    if (!sessions) {
      return [];
    }

    const currentSession = getCurrentSubaccountSession(subaccount);
    const allSessions = currentSession
      ? [currentSession, ...sessions.filter((session) => session.address !== currentSession.address)]
      : sessions;

    const getRank = (session: SubaccountSession) => {
      if (session.address === currentAddress) {
        return 0;
      }

      return getIsSubaccountSessionUsable(session) ? 1 : 2;
    };

    return [...allSessions].sort((a, b) => getRank(a) - getRank(b));
  }, [currentAddress, sessions, subaccount]);

  const otherSessionAddresses = useMemo(
    () => sortedSessions.filter((session) => session.address !== currentAddress).map((session) => session.address),
    [currentAddress, sortedSessions]
  );

  const otherSessionsKey = [chainId, account, ...otherSessionAddresses].join();
  const isRemoveAllConfirmVisible = removeAllConfirmKey === otherSessionsKey;

  const handleRemove = useCallback(
    async (subaccountAddresses: string[]) => {
      setRemoveAllConfirmKey(undefined);
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
            Each browser has its own session. A session from another browser appears here after its first trade. Bots
            and apps that trade for you are listed too.
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
                  className="-mr-8 shrink-0 !px-8"
                  disabled={isRemoving}
                  onClick={() => handleRemove([session.address])}
                >
                  {removingAddresses.includes(session.address) ? <Trans>Removing...</Trans> : <Trans>Remove</Trans>}
                </Button>
              )}
            </div>
          );
        })}

        {otherSessionAddresses.length > 1 &&
          (isRemoveAllConfirmVisible ? (
            <div className="flex flex-col gap-8" data-qa="one-click-sessions-remove-all-confirm">
              <AlertInfoCard type="warning" hideClose>
                <Trans>
                  This also removes sessions of bots and apps that trade for you. They stop working until you approve
                  them again.
                </Trans>
              </AlertInfoCard>
              <div className="grid grid-cols-2 gap-8">
                <Button
                  variant="secondary"
                  size="small"
                  showExternalLinkArrow={false}
                  onClick={() => setRemoveAllConfirmKey(undefined)}
                >
                  <Trans>Cancel</Trans>
                </Button>
                <Button variant="primary" size="small" onClick={() => handleRemove(otherSessionAddresses)}>
                  <Trans>Remove all</Trans>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="small"
              textAlign="center"
              showExternalLinkArrow={false}
              disabled={isRemoving}
              onClick={() => setRemoveAllConfirmKey(otherSessionsKey)}
            >
              <Trans>Remove all other sessions</Trans>
            </Button>
          ))}
      </div>
    </ExpandableRow>
  );
}
