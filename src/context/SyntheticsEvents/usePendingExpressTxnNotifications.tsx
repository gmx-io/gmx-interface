import { Dispatch, MutableRefObject, SetStateAction, useEffect } from "react";
import { toast } from "react-toastify";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useTokensBalancesUpdates } from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { getPossiblyInsufficientPayTokens } from "domain/synthetics/express/insufficientPayTokens";
import type { TokensData } from "domain/synthetics/tokens";
import { TokenBalanceType } from "domain/tokens";
import { parseError } from "lib/errors";
import {
  getIsInsufficientExecutionFeeError,
  getIsInvalidSignatureError,
  getIsOutdatedSubaccountApprovalError,
} from "lib/errors/customErrors";
import { helperToast } from "lib/helperToast";
import { sendTxnErrorMetric } from "lib/metrics/utils";
import { updateByKey } from "lib/objects";
import { sleep } from "lib/sleep";
import { StatusCode } from "sdk/utils/express";

import {
  getDebugErrorMessage,
  getInsufficientBalanceToastBanner,
  getInsufficientBalanceToastContent,
  getInsufficientExecutionFeeToastContent,
  getOutdatedSubaccountApprovalToastContent,
  InvalidSignatureToastContent,
} from "components/Errors/errorToasts";

import type { PendingExpressTxns, PendingPositionsUpdates, RelayTaskStatus } from "./types";
import { extractRelayTaskError } from "./utils";

export function usePendingExpressTxnNotifications({
  chainId,
  pendingExpressTxns,
  setPendingExpressTxns,
  relayTaskStatuses,
  tokensData,
  setPendingPositionsUpdates,
  pendingOrderToastIdRef,
}: {
  chainId: number;
  pendingExpressTxns: PendingExpressTxns;
  setPendingExpressTxns: Dispatch<SetStateAction<PendingExpressTxns>>;
  relayTaskStatuses: { [taskId: string]: RelayTaskStatus };
  tokensData: TokensData | undefined;
  setPendingPositionsUpdates: Dispatch<SetStateAction<PendingPositionsUpdates>>;
  pendingOrderToastIdRef: MutableRefObject<number | undefined>;
}) {
  const { executionFeeBufferBps, setIsSettingsVisible } = useSettings();
  const { invalidateSubaccountApproval } = useSubaccountContext();
  const { setOptimisticTokensBalancesUpdates, optimisticTokensBalancesUpdates, websocketTokenBalancesUpdates } =
    useTokensBalancesUpdates();

  useEffect(
    function notifyPendingExpressTxn() {
      Object.values(pendingExpressTxns).forEach((pendingExpressTxn) => {
        if (pendingExpressTxn.sendFailed && pendingExpressTxn.key && !pendingExpressTxn.isViewed) {
          setPendingExpressTxns((old) => updateByKey(old, pendingExpressTxn.key!, { isViewed: true }));
          setOptimisticTokensBalancesUpdates((old) => {
            const newState = { ...old };
            Object.keys(pendingExpressTxn.payAmounts ?? {}).forEach((tokenAddress) => {
              delete newState[tokenAddress];
            });
            return newState;
          });
          setPendingPositionsUpdates({});
          return;
        }

        if (pendingExpressTxn.taskId && pendingExpressTxn.key && relayTaskStatuses[pendingExpressTxn.taskId]) {
          const status = relayTaskStatuses[pendingExpressTxn.taskId].statusCode;

          if (status === StatusCode.Success && pendingExpressTxn.successMessage && !pendingExpressTxn.isViewed) {
            helperToast.success(pendingExpressTxn.successMessage);
            setPendingExpressTxns((old) => updateByKey(old, pendingExpressTxn.key!, { isViewed: true }));
          }

          if (status === StatusCode.Reverted || status === StatusCode.Rejected) {
            let isRelayerMetricSent = false;
            let isViewed = false;
            const relayError = extractRelayTaskError(relayTaskStatuses[pendingExpressTxn.taskId]);

            if (pendingExpressTxn.metricId && !pendingExpressTxn.isRelayerMetricSent) {
              sendTxnErrorMetric(pendingExpressTxn.metricId, relayError, "relayer");

              const executionFeeErrorParams = getIsInsufficientExecutionFeeError(relayError);

              if (executionFeeErrorParams.isErrorMatched) {
                const totastContent = getInsufficientExecutionFeeToastContent({
                  minExecutionFee: executionFeeErrorParams.args.minExecutionFee,
                  executionFee: executionFeeErrorParams.args.executionFee,
                  chainId,
                  executionFeeBufferBps,
                  isExpress: true,
                  estimatedExecutionFee: pendingExpressTxn.estimatedExecutionFee,
                  estimatedExecutionGasLimit: pendingExpressTxn.estimatedExecutionGasLimit,
                  estimatedOrders: pendingExpressTxn.estimatedOrders,
                  txUrl: undefined,
                  errorMessage: executionFeeErrorParams.errorData.errorMessage,
                  shouldOfferExpress: false,
                  setIsSettingsVisible,
                });

                // Wait to ensure there is no race condition with the pending order toast
                sleep(500).then(() => {
                  toast.dismiss(pendingOrderToastIdRef.current);
                  helperToast.error(totastContent, {
                    tradingErrorInfo: {
                      actionName: "Express Order",
                      errorData: executionFeeErrorParams.errorData,
                      metricId: pendingExpressTxn.metricId,
                    },
                  });
                });
                isViewed = true;
              }

              const invalidSignatureErrorParams = getIsInvalidSignatureError(relayError);

              if (invalidSignatureErrorParams.isErrorMatched) {
                // Wait to ensure there is no race condition with the pending order toast
                sleep(500).then(() => {
                  toast.dismiss(pendingOrderToastIdRef.current);
                  helperToast.error(<InvalidSignatureToastContent />, {
                    tradingErrorInfo: {
                      actionName: "Express Order",
                      errorData: invalidSignatureErrorParams.errorData,
                      metricId: pendingExpressTxn.metricId,
                    },
                  });
                });
                isViewed = true;
              }

              isRelayerMetricSent = true;
            }

            // not gated on isViewed: the order status toast marks a new order's txn viewed before the relay answers
            if (pendingExpressTxn.subaccountApproval && !pendingExpressTxn.isSubaccountApprovalErrorChecked) {
              setPendingExpressTxns((old) =>
                updateByKey(old, pendingExpressTxn.key!, { isSubaccountApprovalErrorChecked: true })
              );

              if (
                getIsOutdatedSubaccountApprovalError(relayError) &&
                invalidateSubaccountApproval(pendingExpressTxn.subaccountApproval)
              ) {
                // Wait to ensure there is no race condition with the pending order toast
                sleep(500).then(() => {
                  toast.dismiss(pendingOrderToastIdRef.current);
                  helperToast.error(getOutdatedSubaccountApprovalToastContent());
                });
                isViewed = true;
              }
            }

            const relayErrorData = parseError(relayError);
            const payAmounts = pendingExpressTxn.payAmounts ?? {};
            const balanceBanner = getInsufficientBalanceToastBanner({
              chainId,
              errorData: relayErrorData,
              expressTxn: pendingExpressTxn.gasPaymentTokenAddress
                ? {
                    gasPaymentTokenAddress: pendingExpressTxn.gasPaymentTokenAddress,
                    isGmxAccount: Boolean(pendingExpressTxn.isGmxAccount),
                    payTokenAddresses: Object.keys(payAmounts),
                    possiblyInsufficientTokenAddresses: getPossiblyInsufficientPayTokens({
                      payAmounts,
                      tokensData,
                      optimisticUpdates: optimisticTokensBalancesUpdates,
                      websocketUpdates: websocketTokenBalancesUpdates,
                      balanceType: pendingExpressTxn.isGmxAccount
                        ? TokenBalanceType.GmxAccount
                        : TokenBalanceType.Wallet,
                    }),
                  }
                : undefined,
            });

            // a new order's status toast already marked the txn viewed, so the failure-reporting run still shows this
            if (balanceBanner && !isViewed && (isRelayerMetricSent || !pendingExpressTxn.isViewed)) {
              const balanceToastContent = getInsufficientBalanceToastContent({
                chainId,
                banner: balanceBanner,
                debugErrorMessage: getDebugErrorMessage(relayErrorData),
              });

              sleep(500).then(() => {
                toast.dismiss(pendingOrderToastIdRef.current);
                helperToast.error(balanceToastContent, {
                  tradingErrorInfo: {
                    actionName: "Express Order",
                    errorData: relayErrorData,
                    metricId: pendingExpressTxn.metricId,
                  },
                });
              });
              isViewed = true;
            }

            if (pendingExpressTxn.errorMessage && !pendingExpressTxn.isViewed && !isViewed) {
              helperToast.error(pendingExpressTxn.errorMessage, {
                tradingErrorInfo: {
                  actionName: "Express Order",
                  metricId: pendingExpressTxn.metricId,
                },
              });
              isViewed = true;
            }

            if (isViewed || isRelayerMetricSent) {
              // write only the flags this run set: a false one would undo an earlier run and repeat its metric or toast
              setPendingExpressTxns((old) =>
                updateByKey(old, pendingExpressTxn.key!, {
                  ...(isViewed && { isViewed }),
                  ...(isRelayerMetricSent && { isRelayerMetricSent }),
                })
              );
              setOptimisticTokensBalancesUpdates((old) => {
                const newState = { ...old };
                Object.keys(pendingExpressTxn.payAmounts ?? {}).forEach((tokenAddress) => {
                  delete newState[tokenAddress];
                });
                return newState;
              });
              setPendingPositionsUpdates({});
            }
          }
        }
      });
    },
    [
      chainId,
      executionFeeBufferBps,
      invalidateSubaccountApproval,
      relayTaskStatuses,
      pendingExpressTxns,
      setPendingExpressTxns,
      setPendingPositionsUpdates,
      pendingOrderToastIdRef,
      setIsSettingsVisible,
      setOptimisticTokensBalancesUpdates,
      tokensData,
      optimisticTokensBalancesUpdates,
      websocketTokenBalancesUpdates,
    ]
  );
}
