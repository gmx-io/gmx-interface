import { Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { GAS_PRICE_PREMIUM_MAP, getExplorerUrl } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";
import { getOnchainError } from "lib/contracts/transactionErrors";
import { helperToast } from "lib/helperToast";
import { OrderMetricId, sendPendingOrderTxnErrorMetric } from "lib/metrics";
import { formatPercentage } from "lib/numbers";
import { sendUserAnalyticsOrderResultEvent } from "lib/userAnalytics";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useMemo, useState } from "react";

export type PendingTransaction = {
  hash: string;
  message: string;
  messageDetails?: string;
  metricId?: OrderMetricId;
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
            const errorData = await getOnchainError(signer.provider, undefined, pendingTxn.hash);

            let toastMsg: ReactNode;

            if (errorData?.contractError === "InsufficientExecutionFee") {
              const [minExecutionFee, executionFee]: bigint[] = errorData.contractErrorArgs;
              const premium = GAS_PRICE_PREMIUM_MAP[chainId] ?? 0n;

              const minExecutionFeeBeforePremium = minExecutionFee - premium;
              const executionFeeBeforePremium = executionFee - premium;

              const delta = minExecutionFeeBeforePremium - executionFeeBeforePremium;
              const deltaPercentage = (delta * BASIS_POINTS_DIVISOR_BIGINT) / executionFeeBeforePremium;

              let bufferIncreaseBps =
                BigInt(executionFeeBufferBps || 0) +
                deltaPercentage +
                // add extra 5%
                BASIS_POINTS_DIVISOR_BIGINT / 10n;

              toastMsg = (
                <div>
                  <Trans>
                    Transaction failed due to execution fee validation. <ExternalLink href={txUrl}>View</ExternalLink>
                    <br />
                    <br />
                    Please try increasing execution fee buffer to{" "}
                    {formatPercentage(bufferIncreaseBps, { displayDecimals: 0 })} in{" "}
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
                    Txn failed. <ExternalLink href={txUrl}>View</ExternalLink>
                  </Trans>
                  <br />
                </div>
              );
            }

            helperToast.error(toastMsg, { autoClose: false });

            if (pendingTxn.metricId) {
              sendPendingOrderTxnErrorMetric(pendingTxn.metricId);
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
