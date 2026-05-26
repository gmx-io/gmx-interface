import { Trans } from "@lingui/macro";
import { useEffect, useMemo, useRef } from "react";
import { toast, ToastContent } from "react-toastify";

import { useSyntheticsEvents } from "context/SyntheticsEvents";
import type { MultichainFundingHistoryItem } from "domain/multichain/types";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { formatBalanceAmount } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
import { getToken } from "sdk/configs/tokens";

import { FUNDING_OPERATIONS_LABELS } from "components/GmxAccountModal/keys";

import CheckCircleIcon from "img/ic_check_circle.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

import { isMultichainFundingItemLoading } from "./isMultichainFundingItemLoading";
import { useGmxAccountFundingHistory } from "./useGmxAccountFundingHistory";

export const MULTICHAIN_FUNDING_TOAST_ID = "multichain-funding-toast";

export function getMultichainFundingToastContent({
  chainId,
  pendingItems,
  multichainFundingPendingIds,
}: {
  chainId: number;
  pendingItems: Partial<Record<string, MultichainFundingHistoryItem>>;
  multichainFundingPendingIds: Record<string, string>;
}) {
  const hasDeposits = Object.values(pendingItems).some((item) => item?.operation === "deposit");
  const hasWithdrawals = Object.values(pendingItems).some((item) => item?.operation === "withdrawal");

  return (
    <div className="StatusNotification flex flex-col gap-8">
      <div className="StatusNotification-title">
        {hasDeposits && !hasWithdrawals && <Trans>Depositing to GMX Account...</Trans>}
        {hasWithdrawals && !hasDeposits && <Trans>Withdrawing from GMX Account...</Trans>}
        {hasDeposits && hasWithdrawals && <Trans>Depositing to and withdrawing from GMX Account...</Trans>}
      </div>
      {Object.keys(multichainFundingPendingIds).map((staticId, index, array) => {
        const guid = multichainFundingPendingIds[staticId];
        const item = pendingItems[guid];
        if (!item) {
          return null;
        }

        const token = getToken(chainId, item.token);

        const formattedAmount = formatBalanceAmount(item.sentAmount, token.decimals, token.symbol);

        const isLoading = isMultichainFundingItemLoading(item);
        const isError = !isLoading && Boolean(item.isExecutionError);
        const isSuccess = !isLoading && !isError;

        return (
          <div key={staticId} className="flex items-center justify-between gap-6">
            <div className="text-typography-secondary">
              {item.operation === "deposit" ? <Trans>Deposit</Trans> : <Trans>Withdraw</Trans>}
              {array.length > 1 && <> {formattedAmount}</>}
            </div>
            {isLoading && <SpinnerIcon className="spin size-15 shrink-0 text-typography-primary" />}
            {isSuccess && <CheckCircleIcon className="size-15 shrink-0 text-green-500" />}
            {isError && <CloseIcon className="size-15 shrink-0 text-red-500" />}
          </div>
        );
      })}
    </div>
  );
}

function useGmxAccountPendingFundingHistoryItems(
  guids: string[] | undefined
): Partial<Record<string, MultichainFundingHistoryItem>> | undefined {
  const { fundingHistory } = useGmxAccountFundingHistory({ enabled: guids && guids.length > 0 });

  const pendingItems = useMemo((): Partial<Record<string, MultichainFundingHistoryItem>> => {
    if (!fundingHistory || fundingHistory.length === 0 || !guids || guids.length === 0) {
      return EMPTY_OBJECT;
    }
    const result: Record<string, MultichainFundingHistoryItem> = {};

    for (const item of fundingHistory) {
      if (guids.includes(item.id) && item.sourceChainId !== 0) {
        result[item.id] = item;
      }
    }

    return result;
  }, [fundingHistory, guids]);

  return pendingItems;
}

export function useMultichainFundingToast() {
  const { chainId } = useChainId();
  const { multichainFundingPendingIds, removeMultichainFundingPendingIds } = useSyntheticsEvents();

  const clearTimeout = useRef<number | undefined>();
  const dymanicIds = useMemo(() => Object.values(multichainFundingPendingIds), [multichainFundingPendingIds]);
  const pendingItems = useGmxAccountPendingFundingHistoryItems(dymanicIds);

  const labels = useLocalizedMap(FUNDING_OPERATIONS_LABELS);

  useEffect(() => {
    if (!pendingItems || Object.keys(pendingItems).length === 0) {
      if (toast.isActive(MULTICHAIN_FUNDING_TOAST_ID)) {
        toast.dismiss(MULTICHAIN_FUNDING_TOAST_ID);
      }
      return;
    }

    window.clearTimeout(clearTimeout.current);
    clearTimeout.current = undefined;

    const content: ToastContent = getMultichainFundingToastContent({
      chainId,
      pendingItems,
      multichainFundingPendingIds,
    });

    if (toast.isActive(MULTICHAIN_FUNDING_TOAST_ID)) {
      toast.update(MULTICHAIN_FUNDING_TOAST_ID, {
        render: content,
        type: "default",
        onClose: () => {
          removeMultichainFundingPendingIds(Object.keys(multichainFundingPendingIds));
        },
      });
    } else {
      toast(content, {
        toastId: MULTICHAIN_FUNDING_TOAST_ID,
        type: "default",
        autoClose: false,
        onClose: () => {
          removeMultichainFundingPendingIds(Object.keys(multichainFundingPendingIds));
        },
      });
    }
  }, [chainId, labels, multichainFundingPendingIds, pendingItems, removeMultichainFundingPendingIds]);
}
