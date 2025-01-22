import { Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { getExplorerUrl } from "config/chains";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  getExecutionFeeBufferBps,
  getGasPremium,
  getMinimumExecutionFeeBufferBps,
} from "domain/synthetics/fees/utils/executionFee";
import { useChainId } from "lib/chains";
import { getCallStaticError } from "lib/contracts/transactionErrors";
import { helperToast } from "lib/helperToast";
import { OrderMetricId, sendTxnErrorMetric } from "lib/metrics";
import { formatPercentage } from "lib/numbers";
import { parseError } from "lib/parseError";
import { sendUserAnalyticsOrderResultEvent } from "lib/userAnalytics";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useMemo, useState } from "react";

export type PendingTransactionData = {
  estimatedExecutionFee: bigint;
  estimatedExecutionGasLimit: bigint;
};

export type PendingTransaction = {
  hash: string;
  message: string;
  messageDetails?: string;
  metricId?: OrderMetricId;
  data?: PendingTransactionData;
};

export type SetPendingTransactions = Dispatch<SetStateAction<PendingTransaction[]>>;

export type PendingTxnsContextType = {
  pendingTxns: PendingTransaction[];
  setPendingTxns: SetPendingTransactions;
};

export const PendingTxnsContext = createContext<PendingTxnsContextType>({
  pendingTxns: [],
  setPendingTxns: () => null,
});

export function usePendingTxns() {
  return useContext(PendingTxnsContext);
}

export function PendingTxnsContextProvider({ children }: { children: ReactNode }) {
  const signer = useEthersSigner();
  const { chainId } = useChainId();
  const { setIsSettingsVisible, executionFeeBufferBps } = useSettings();

  const [pendingTxns, setPendingTxns] = useState<PendingTransaction[]>([]);

  useEffect(() => {
    const checkPendingTxns = async () => {
      if (!signer) {
        return;
      }

      const updatedPendingTxns: any[] = [];
      for (let i = 0; i < pendingTxns.length; i++) {
        const pendingTxn = pendingTxns[i];
        const receipt = await signer.provider.getTransactionReceipt(pendingTxn.hash);
        if (receipt) {
          if (receipt.status === 0) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash;
            const { error: onchainError, txnData } = await getCallStaticError(
              signer.provider,
              undefined,
              pendingTxn.hash
            );
            const errorData = onchainError ? parseError(onchainError) : undefined;

            let toastMsg: ReactNode;

            if (errorData?.contractError === "InsufficientExecutionFee" && txnData) {
              const [minExecutionFee, executionFee]: bigint[] = errorData.contractErrorArgs;

              const requiredBufferBps = getMinimumExecutionFeeBufferBps({
                minExecutionFee: minExecutionFee,
                estimatedExecutionFee: executionFee,
                currentBufferBps: getExecutionFeeBufferBps(chainId, executionFeeBufferBps),
                premium: getGasPremium(chainId),
                gasLimit: pendingTxn.data?.estimatedExecutionGasLimit ?? 1n,
              });

              toastMsg = (
                <div>
                  <Trans>
                    Transaction failed due to execution fee validation. <ExternalLink href={txUrl}>View</ExternalLink>
                    .
                    <br />
                    <br />
                    Please try increasing execution fee buffer to{" "}
                    {formatPercentage(requiredBufferBps, { displayDecimals: 0 })} in{" "}
                    <div
                      className=" muted inline-block cursor-pointer underline"
                      onClick={() => setIsSettingsVisible(true)}
                    >
                      Settings
                    </div>
                    .
                  </Trans>
                  <br />
                  <br />
                  {errorData?.errorMessage && <ToastifyDebug error={errorData.errorMessage} />}
                </div>
              );
            } else {
              toastMsg = (
                <div>
                  <Trans>
                    Txn failed. <ExternalLink href={txUrl}>View</ExternalLink>.
                  </Trans>
                  <br />
                </div>
              );
            }

            helperToast.error(toastMsg, { autoClose: false });

            if (pendingTxn.metricId) {
              sendTxnErrorMetric(pendingTxn.metricId, onchainError, "minting");
              sendUserAnalyticsOrderResultEvent(chainId, pendingTxn.metricId, false);
            }
          }

          if (receipt.status === 1 && pendingTxn.message) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash;
            helperToast.success(
              <div>
                <div className="px-10 py-8">
                  {pendingTxn.message}{" "}
                  <ExternalLink href={txUrl}>
                    <Trans>View</Trans>
                  </ExternalLink>
                </div>
                {pendingTxn.messageDetails && (
                  <div className="border-t-[1.5px] border-[#0f463d] px-10 py-8">{pendingTxn.messageDetails}</div>
                )}
              </div>,
              {
                className: "OrdersStatusNotificiation",
              }
            );
          }
          continue;
        }
        updatedPendingTxns.push(pendingTxn);
      }

      if (updatedPendingTxns.length !== pendingTxns.length) {
        setPendingTxns(updatedPendingTxns);
      }
    };

    const interval = setInterval(() => {
      checkPendingTxns();
    }, 2 * 1000);
    return () => clearInterval(interval);
  }, [signer, pendingTxns, chainId, setIsSettingsVisible, executionFeeBufferBps]);

  const state = useMemo(() => ({ pendingTxns, setPendingTxns }), [pendingTxns, setPendingTxns]);

  return <PendingTxnsContext.Provider value={state}>{children}</PendingTxnsContext.Provider>;
}
