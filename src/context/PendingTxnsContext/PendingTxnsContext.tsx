import { Trans } from "@lingui/macro";
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useMemo, useState } from "react";

import { getExplorerUrl } from "config/chains";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";
import { parseError } from "lib/errors";
import { getCallStaticError } from "lib/errors/additionalValidation";
import { helperToast } from "lib/helperToast";
import { OrderMetricId, sendTxnErrorMetric } from "lib/metrics";
import { useJsonRpcProvider } from "lib/rpc";
import { TradingActionName } from "lib/tradingErrorTracker";
import type { SendWalletCallsResult } from "lib/transactions/sendWalletCalls";
import { sendUserAnalyticsOrderResultEvent } from "lib/userAnalytics";

import { getInsufficientExecutionFeeToastContent } from "components/Errors/errorToasts";
import ExternalLink from "components/ExternalLink/ExternalLink";

export type PendingTransactionData = {
  estimatedExecutionFee: bigint;
  estimatedExecutionGasLimit: bigint;
};

type PendingTransactionBase = {
  message: ReactNode | undefined;
  messageDetails?: ReactNode;
  metricId?: OrderMetricId;
  data?: PendingTransactionData;
  actionName?: TradingActionName;
};

export type PendingTransaction = PendingTransactionBase &
  (
    | {
        type?: "transaction";
        hash: string;
      }
    | {
        type: "walletCalls";
        chainId: number;
        callBundleId: string;
        getCallsStatus: SendWalletCallsResult["getStatus"];
      }
  );

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

export function getPendingTxnFailureToastContent({ txUrl }: { txUrl?: string }) {
  if (!txUrl) {
    return (
      <div>
        <Trans>Transaction failed</Trans>
      </div>
    );
  }

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
  txUrl?: string;
}) {
  return (
    <div className="StatusNotification">
      <div className="StatusNotification-title">{message}</div>
      {txUrl && (
        <>
          <br />
          <ExternalLink href={txUrl}>
            <Trans>View</Trans>
          </ExternalLink>
        </>
      )}
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

  useEffect(() => {
    const checkPendingTxns = async () => {
      if (!provider) {
        return;
      }

      const updatedPendingTxns: PendingTransaction[] = [];
      for (let i = 0; i < pendingTxns.length; i++) {
        const pendingTxn = pendingTxns[i];
        let hash: string | undefined;
        let resolvedChainId: number = chainId;
        let isSuccess = false;
        let isFailure = false;

        if (pendingTxn.type === "walletCalls") {
          try {
            const callsStatus = await pendingTxn.getCallsStatus();

            if (callsStatus.status === "pending" || callsStatus.status === undefined) {
              updatedPendingTxns.push(pendingTxn);
              continue;
            }

            hash = callsStatus.receipts?.at(-1)?.transactionHash;
            resolvedChainId = callsStatus.chainId ?? pendingTxn.chainId;
            isSuccess = callsStatus.status === "success" && callsStatus.atomic;
            isFailure = !isSuccess;
          } catch {
            updatedPendingTxns.push(pendingTxn);
            continue;
          }
        } else {
          const receipt = await provider.getTransactionReceipt(pendingTxn.hash);

          if (!receipt) {
            updatedPendingTxns.push(pendingTxn);
            continue;
          }

          hash = pendingTxn.hash;
          isSuccess = receipt.status === 1;
          isFailure = receipt.status === 0;
        }

        const txUrl = hash ? getExplorerUrl(resolvedChainId) + "tx/" + hash : undefined;

        if (isFailure) {
          const { error: onchainError, txnData } =
            pendingTxn.type !== "walletCalls" && hash
              ? await getCallStaticError(chainId, provider, undefined, hash)
              : { error: new Error("Wallet call bundle failed"), txnData: undefined };
          const errorData = onchainError ? parseError(onchainError as any) : undefined;

          let toastMsg: ReactNode;

          if (errorData?.contractError === "InsufficientExecutionFee" && txnData && txUrl) {
            const [minExecutionFee, executionFee]: bigint[] = errorData.contractErrorArgs;

            toastMsg = getInsufficientExecutionFeeToastContent({
              minExecutionFee,
              executionFee,
              chainId,
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
            sendUserAnalyticsOrderResultEvent(resolvedChainId, pendingTxn.metricId, false);
          }
        }

        if (isSuccess && pendingTxn.message) {
          helperToast.success(
            getPendingTxnSuccessToastContent({
              message: pendingTxn.message,
              messageDetails: pendingTxn.messageDetails,
              txUrl,
            })
          );
        }
      }

      if (updatedPendingTxns.length !== pendingTxns.length) {
        setPendingTxns(updatedPendingTxns);
      }
    };

    const interval = setInterval(() => {
      checkPendingTxns();
    }, 2 * 1000);
    return () => clearInterval(interval);
  }, [provider, pendingTxns, chainId, setIsSettingsVisible, executionFeeBufferBps]);

  const state = useMemo(() => ({ pendingTxns, setPendingTxns }), [pendingTxns, setPendingTxns]);

  return <PendingTxnsContext.Provider value={state}>{children}</PendingTxnsContext.Provider>;
}
