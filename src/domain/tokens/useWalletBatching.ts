import { useSyncExternalStore } from "react";
import { useAccount } from "wagmi";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { getIsWalletBatchingEnabled } from "domain/synthetics/uiFlags/uiFlags";
import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { useWalletChainCapabilities } from "lib/wallets/useWalletChainCapabilities";
import {
  getIsWalletBatchingDisabledForSession,
  getWalletBatchingSessionKey,
  subscribeToWalletBatchingSession,
} from "lib/wallets/walletBatchingSession";

/** Whether the wallet can send the approvals and the action in one atomic confirmation (EIP-5792) */
export function useWalletBatching({ chainId, enabled }: { chainId: number | undefined; enabled: boolean }) {
  const { connector, address } = useAccount();
  const { uiFlags } = useUiFlagsRequest();
  const { isWalletBatchingQaOverrideEnabled } = useSettings();
  const isFlagEnabled = isWalletBatchingQaOverrideEnabled || getIsWalletBatchingEnabled(uiFlags);

  const atomicStatus = useWalletChainCapabilities({ chainId, enabled: enabled && isFlagEnabled })?.atomicStatus;

  const sessionKey =
    connector && address && chainId !== undefined
      ? getWalletBatchingSessionKey({ connectorUid: connector.uid, account: address, chainId })
      : undefined;
  const isSessionDisabled = useSyncExternalStore(subscribeToWalletBatchingSession, () =>
    sessionKey !== undefined ? getIsWalletBatchingDisabledForSession(sessionKey) : false
  );

  // `ready`: the wallet offers a one-time smart account upgrade before the first batch
  const isAvailable =
    enabled && isFlagEnabled && !isSessionDisabled && (atomicStatus === "supported" || atomicStatus === "ready");

  return { isAvailable, atomicStatus };
}
