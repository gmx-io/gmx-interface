import { Dispatch, MutableRefObject, SetStateAction, useEffect, useRef } from "react";
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
import { extractRelayTaskError, removePendingExpressTxnDebits, removePendingExpressTxnPositionsUpdates } from "./utils";

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
  const handledFailedTaskIdsRef = useRef(new Set<string>());

  useEffect(
    function notifyPendingExpressTxn() {
      Object.values(pendingExpressTxns).forEach((pendingExpressTxn) => {
        if (pendingExpressTxn.sendFailed && pendingExpressTxn.key && !pendingExpressTxn.isViewed) {
          setPendingExpressTxns((old) => updateByKey(old, pendingExpressTxn.key!, { isViewed: true }));
          setOptimisticTokensBalancesUpdates((old) => removePendingExpressTxnDebits(old, pendingExpressTxn));
          setPendingPositionsUpdates((old) => removePendingExpressTxnPositionsUpdates(old, pendingExpressTxn));
          return;
        }

        if (pendingExpressTxn.taskId && pendingExpressTxn.key && relayTaskStatuses[pendingExpressTxn.taskId]) {
          const status = relayTaskStatuses[pendingExpressTxn.taskId].statusCode;

          if (status === StatusCode.Success && pendingExpressTxn.successMessage && !pendingExpressTxn.isViewed) {
            helperToast.success(pendingExpressTxn.successMessage);
            setPendingExpressTxns((old) => updateByKey(old, pendingExpressTxn.key!, { isViewed: true }));
          }

          // once per relay task and not gated on isViewed: a new order's status toast marks its txn viewed
          // before the relay answers, and the effect re-runs on every state write
          if (
            (status === StatusCode.Reverted || status === StatusCode.Rejected) &&
            !handledFailedTaskIdsRef.current.has(pendingExpressTxn.taskId)
          ) {
            handledFailedTaskIdsRef.current.add(pendingExpressTxn.taskId);

            let isViewed = false;
            const relayError = extractRelayTaskError(relayTaskStatuses[pendingExpressTxn.taskId]);

            if (pendingExpressTxn.metricId) {
              sendTxnErrorMetric(pendingExpressTxn.metricId, relayError, "relayer");
            }

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

            if (
              pendingExpressTxn.subaccountApproval &&
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

            if (balanceBanner && !isViewed) {
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

            if (isViewed) {
              setPendingExpressTxns((old) => updateByKey(old, pendingExpressTxn.key!, { isViewed: true }));
            }

            setOptimisticTokensBalancesUpdates((old) => removePendingExpressTxnDebits(old, pendingExpressTxn));
            setPendingPositionsUpdates((old) => removePendingExpressTxnPositionsUpdates(old, pendingExpressTxn));
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
