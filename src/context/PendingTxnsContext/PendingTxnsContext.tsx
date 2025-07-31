import { Trans } from "@lingui/macro";
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useMemo, useState } from "react";

import { getExplorerUrl } from "config/chains";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  getExecutionFeeBufferBps,
  getGasPremium,
  getMinimumExecutionFeeBufferBps,
} from "domain/synthetics/fees/utils/executionFee";
import { useChainId } from "lib/chains";
import { parseError } from "lib/errors";
import { getCallStaticError } from "lib/errors/additionalValidation";
import { helperToast } from "lib/helperToast";
import { OrderMetricId, sendTxnErrorMetric } from "lib/metrics";
import { formatPercentage } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { sendUserAnalyticsOrderResultEvent } from "lib/userAnalytics";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

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
  const { chainId } = useChainId();
  const { provider } = useJsonRpcProvider(chainId);
  const { setIsSettingsVisible, executionFeeBufferBps } = useSettings();

  const [pendingTxns, setPendingTxns] = useState<PendingTransaction[]>([]);

  useEffect(() => {
    const checkPendingTxns = async () => {
      if (!provider) {
        return;
      }

      const updatedPendingTxns: any[] = [];
      for (let i = 0; i < pendingTxns.length; i++) {
        const pendingTxn = pendingTxns[i];
        const receipt = await provider.getTransactionReceipt(pendingTxn.hash);
        if (receipt) {
          if (receipt.status === 0) {
            const txUrl = getExplorerUrl(chainId) + "tx/" + pendingTxn.hash;
            const { error: onchainError, txnData } = await getCallStaticError(
              chainId,
              provider,
              undefined,
              pendingTxn.hash
            );
            const errorData = onchainError ? parseError(onchainError as any) : undefined;

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
                    Transaction failed due to execution fee validation. <ExternalLink href={txUrl}>View</ExternalLink>.
                    <br />
                    <br />
                    Please{" "}
                    <div
                      className=" muted inline-block cursor-pointer underline"
                      onClick={() => setIsSettingsVisible(true)}
                    >
                      enable Express trading
                    </div>{" "}
                    under settings, which should offer a better experience.
                    <br />
                    <br />
                    Otherwise, try increasing the max network fee buffer to{" "}
                    {formatPercentage(requiredBufferBps, { displayDecimals: 0 })} in{" "}
                    <div
                      className=" muted inline-block cursor-pointer underline"
                      onClick={() => setIsSettingsVisible(true)}
                    >
                      settings
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
  }, [provider, pendingTxns, chainId, setIsSettingsVisible, executionFeeBufferBps]);

  const state = useMemo(() => ({ pendingTxns, setPendingTxns }), [pendingTxns, setPendingTxns]);

  return <PendingTxnsContext.Provider value={state}>{children}</PendingTxnsContext.Provider>;
}
