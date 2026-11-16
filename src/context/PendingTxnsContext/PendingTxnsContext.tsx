import { Trans } from "@lingui/macro";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLatest, useMountedState } from "react-use";
import type { ReplacementReturnType } from "viem";

import { getExplorerUrl, isSolanaNetwork } from "config/chains";
import { getIsSolanaNetworkSelected } from "config/solanaNetwork";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";
import { parseError } from "lib/errors";
import { getCallStaticError } from "lib/errors/additionalValidation";
import { helperToast } from "lib/helperToast";
import { OrderMetricId, sendTxnErrorMetric } from "lib/metrics";
import { useBlockAutoReload } from "lib/pwa/blockAutoReload";
import { getProvider, useJsonRpcProvider } from "lib/rpc";
import { TradingActionName } from "lib/tradingErrorTracker";
import { sendUserAnalyticsOrderResultEvent } from "lib/userAnalytics";
import type { ExecutionFeeEstimate } from "sdk/utils/orderTransactions";

import { getInsufficientExecutionFeeToastContent } from "components/Errors/errorToasts";
import ExternalLink from "components/ExternalLink/ExternalLink";

import { PendingTxnReplacementTracker } from "./PendingTxnReplacementTracker";

export type PendingTransactionData = {
  estimatedExecutionFee: bigint;
  estimatedExecutionGasLimit: bigint;
  estimatedOrders?: ExecutionFeeEstimate[];
};

export type PendingTransaction = {
  hash: string;
  message: ReactNode | undefined;
  messageDetails?: ReactNode;
  metricId?: OrderMetricId;
  data?: PendingTransactionData;
  actionName?: TradingActionName;
  onError?: () => void;
  // The chain the txn was sent on. Pending txns outlive chain switches, so the poller cannot assume the current one.
  chainId: number;
  onReplaced?: (transactionHash: string) => void;
};

export type SetPendingTransactions = Dispatch<SetStateAction<PendingTransaction[]>>;

type PendingTxnsContextType = {
  pendingTxns: PendingTransaction[];
  setPendingTxns: SetPendingTransactions;
};

const PendingTxnsContext = createContext<PendingTxnsContextType>({
  pendingTxns: [],
  setPendingTxns: () => null,
});

export function usePendingTxns() {
  return useContext(PendingTxnsContext);
}

export function getPendingTxnFailureToastContent({ txUrl }: { txUrl: string }) {
  return (
    <div>
      <Trans>
        Transaction failed.
        <br />
        <br />
        <ExternalLink href={txUrl}>View</ExternalLink>
      </Trans>
    </div>
  );
}

export function getPendingTxnSuccessToastContent({
  message,
  messageDetails,
  txUrl,
}: {
  message: ReactNode;
  messageDetails?: ReactNode;
  txUrl: string;
}) {
  return (
    <div className="StatusNotification">
      <div className="StatusNotification-title">{message}</div>
      <br />
      <ExternalLink href={txUrl}>
        <Trans>View</Trans>
      </ExternalLink>
      {messageDetails && (
        <>
          <hr className="my-8 -ml-12 -mr-32 h-[1.5px] border-none bg-[#0f463d]" />
          <div>{messageDetails}</div>
        </>
      )}
    </div>
  );
}

export function PendingTxnsContextProvider({ children }: { children: ReactNode }) {
  const { networkId } = useChainId();
  const isSolana = isSolanaNetwork(networkId);
  const [pendingTxns, setPendingTxns] = useState<PendingTransaction[]>([]);
  const latestPendingTxns = useLatest(pendingTxns);
  const isMounted = useMountedState();

  // Solana does not poll EVM receipts, so pending EVM txns left from before the switch must not block reloads there
  useBlockAutoReload(pendingTxns.length > 0 && !isSolana);

  // The poller unmounts on Solana. SWR keeps the in-flight receipt promise, so this callback has to
  // belong to the provider or a later speed-up / cancel no-ops on the old poller's isMounted().
  const handleReplacement = useCallback(
    (pendingTxn: PendingTransaction, replacement: ReplacementReturnType) => {
      if (!isMounted() || !latestPendingTxns.current.includes(pendingTxn)) return;

      const hash = replacement.transactionReceipt.transactionHash;
      if (replacement.reason === "repriced") {
        pendingTxn.onReplaced?.(hash);
        setPendingTxns((txns) => txns.map((txn) => (txn === pendingTxn ? { ...txn, hash } : txn)));
      } else {
        pendingTxn.onError?.();
        setPendingTxns((txns) => txns.filter((txn) => txn !== pendingTxn));
        helperToast.error(
          getPendingTxnFailureToastContent({ txUrl: getExplorerUrl(pendingTxn.chainId) + "tx/" + hash })
        );
      }
    },
    [isMounted, latestPendingTxns, setPendingTxns]
  );

  const state = useMemo(() => ({ pendingTxns, setPendingTxns }), [pendingTxns, setPendingTxns]);

  return (
    <PendingTxnsContext.Provider value={state}>
      {pendingTxns.map((transaction) =>
        transaction.onReplaced ? (
          <PendingTxnReplacementTracker
            key={`${transaction.chainId}:${transaction.hash}`}
            transaction={transaction}
            chainId={transaction.chainId}
            onReplaced={handleReplacement}
          />
        ) : null
      )}
      {!isSolana && <PendingTxnsPoller pendingTxns={pendingTxns} setPendingTxns={setPendingTxns} />}
      {children}
    </PendingTxnsContext.Provider>
  );
}

function PendingTxnsPoller({
  pendingTxns,
  setPendingTxns,
}: {
  pendingTxns: PendingTransaction[];
  setPendingTxns: SetPendingTransactions;
}) {
  const { chainId } = useChainId();
  const { provider } = useJsonRpcProvider(chainId);
  const { setIsSettingsVisible, executionFeeBufferBps } = useSettings();
  const latestPendingTxns = useLatest(pendingTxns);
  const isMounted = useMountedState();
  const isPolling = useRef(false);

  useEffect(() => {
    const checkPendingTxns = async () => {
      if (!provider || isPolling.current) {
        return;
      }

      isPolling.current = true;
      try {
        const completedPendingTxns = new Set<PendingTransaction>();
        for (let i = 0; i < pendingTxns.length; i++) {
          const pendingTxn = pendingTxns[i];
          if (!isMounted() || !latestPendingTxns.current.includes(pendingTxn)) continue;
          // This provider sits above EvmProviders, so a poll can still be running when Solana gets selected.
          if (getIsSolanaNetworkSelected()) break;

          const txnChainId = pendingTxn.chainId;
          const txnProvider = txnChainId === chainId ? provider : getProvider(undefined, txnChainId);
          const receipt = await txnProvider.getTransactionReceipt(pendingTxn.hash).catch(() => null);
          if (!isMounted() || !latestPendingTxns.current.includes(pendingTxn)) continue;

          if (receipt) {
            if (receipt.status === 0) {
              pendingTxn.onError?.();
              const txUrl = getExplorerUrl(txnChainId) + "tx/" + pendingTxn.hash;
              const { error: onchainError, txnData } = await getCallStaticError(
                txnChainId,
                txnProvider,
                undefined,
                pendingTxn.hash
              );
              if (!isMounted() || !latestPendingTxns.current.includes(pendingTxn)) continue;

              const errorData = onchainError ? parseError(onchainError as any) : undefined;

              let toastMsg: ReactNode;

              if (errorData?.contractError === "InsufficientExecutionFee" && txnData) {
                const [minExecutionFee, executionFee]: bigint[] = errorData.contractErrorArgs;

                toastMsg = getInsufficientExecutionFeeToastContent({
                  minExecutionFee,
                  executionFee,
                  chainId: txnChainId,
                  executionFeeBufferBps,
                  isExpress: false,
                  estimatedExecutionFee: pendingTxn.data?.estimatedExecutionFee,
                  estimatedExecutionGasLimit: pendingTxn.data?.estimatedExecutionGasLimit,
                  estimatedOrders: pendingTxn.data?.estimatedOrders,
                  txUrl,
                  errorMessage: errorData?.errorMessage,
                  shouldOfferExpress: true,
                  setIsSettingsVisible,
                });
              } else {
                toastMsg = getPendingTxnFailureToastContent({ txUrl });
              }

              helperToast.error(toastMsg, {
                autoClose: false,
                tradingErrorInfo: pendingTxn.actionName
                  ? {
                      actionName: pendingTxn.actionName,
                      errorData: errorData ?? onchainError,
                      metricId: pendingTxn.metricId,
                    }
                  : undefined,
              });

              if (pendingTxn.metricId) {
                sendTxnErrorMetric(pendingTxn.metricId, onchainError, "minting");
                sendUserAnalyticsOrderResultEvent(txnChainId, pendingTxn.metricId, false);
              }
            }

            if (receipt.status === 1 && pendingTxn.message) {
              const txUrl = getExplorerUrl(txnChainId) + "tx/" + pendingTxn.hash;
              helperToast.success(
                getPendingTxnSuccessToastContent({
                  message: pendingTxn.message,
                  messageDetails: pendingTxn.messageDetails,
                  txUrl,
                })
              );
            }
            completedPendingTxns.add(pendingTxn);
          }
        }

        if (completedPendingTxns.size > 0) {
          setPendingTxns((txns) => txns.filter((txn) => !completedPendingTxns.has(txn)));
        }
      } finally {
        isPolling.current = false;
      }
    };

    const interval = setInterval(() => {
      checkPendingTxns();
    }, 2 * 1000);
    return () => clearInterval(interval);
  }, [
    provider,
    pendingTxns,
    chainId,
    setIsSettingsVisible,
    executionFeeBufferBps,
    isMounted,
    latestPendingTxns,
    setPendingTxns,
  ]);

  return null;
}
