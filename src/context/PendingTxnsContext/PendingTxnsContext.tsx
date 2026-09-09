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

import { getExplorerUrl } from "config/chains";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";
import { parseError } from "lib/errors";
import { getCallStaticError } from "lib/errors/additionalValidation";
import { helperToast } from "lib/helperToast";
import { OrderMetricId, sendTxnErrorMetric } from "lib/metrics";
import { getProvider, useJsonRpcProvider } from "lib/rpc";
import { TradingActionName } from "lib/tradingErrorTracker";
import { sendUserAnalyticsOrderResultEvent } from "lib/userAnalytics";

import { getInsufficientExecutionFeeToastContent } from "components/Errors/errorToasts";
import ExternalLink from "components/ExternalLink/ExternalLink";

import { PendingTxnReplacementTracker } from "./PendingTxnReplacementTracker";

export type PendingTransactionData = {
  estimatedExecutionFee: bigint;
  estimatedExecutionGasLimit: bigint;
};

export type PendingTransaction = {
  hash: string;
  message: ReactNode | undefined;
  messageDetails?: ReactNode;
  metricId?: OrderMetricId;
  data?: PendingTransactionData;
  actionName?: TradingActionName;
  onError?: () => void;
  chainId?: number;
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
  const { chainId } = useChainId();
  const { provider } = useJsonRpcProvider(chainId);
  const { setIsSettingsVisible, executionFeeBufferBps } = useSettings();

  const [pendingTxns, setPendingTxns] = useState<PendingTransaction[]>([]);
  const latestPendingTxns = useLatest(pendingTxns);
  const isMounted = useMountedState();
  const isPolling = useRef(false);

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
          getPendingTxnFailureToastContent({ txUrl: getExplorerUrl(pendingTxn.chainId ?? chainId) + "tx/" + hash })
        );
      }
    },
    [chainId, isMounted, latestPendingTxns]
  );

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

          const txnChainId = pendingTxn.chainId ?? chainId;
          const txnProvider = pendingTxn.chainId ? getProvider(undefined, txnChainId) : provider;
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
                  txUrl,
                  errorMessage: errorData?.errorMessage,
                  shouldOfferExpress: true,
                  setIsSettingsVisible,
                  estimatedExecutionGasLimit: pendingTxn.data?.estimatedExecutionGasLimit ?? 1n,
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
  }, [provider, pendingTxns, chainId, setIsSettingsVisible, executionFeeBufferBps, isMounted, latestPendingTxns]);

  const state = useMemo(() => ({ pendingTxns, setPendingTxns }), [pendingTxns, setPendingTxns]);

  return (
    <PendingTxnsContext.Provider value={state}>
      {pendingTxns.map((transaction) =>
        transaction.onReplaced && transaction.chainId !== undefined ? (
          <PendingTxnReplacementTracker
            key={`${transaction.chainId}:${transaction.hash}`}
            transaction={transaction}
            chainId={transaction.chainId}
            onReplaced={handleReplacement}
          />
        ) : null
      )}
      {children}
    </PendingTxnsContext.Provider>
  );
}
