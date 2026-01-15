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

import SpinnerIcon from "img/ic_spinner.svg?react";

import { isMultichainFundingItemLoading } from "./isMultichainFundingItemLoading";
import { useGmxAccountFundingHistory } from "./useGmxAccountFundingHistory";

const TOAST_ID = "multichain-funding-toast";

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
      if (toast.isActive(TOAST_ID)) {
        toast.dismiss(TOAST_ID);
      }
      return;
    }

    const hasDeposits = Object.values(pendingItems).some((item) => item?.operation === "deposit");
    const hasWithdrawals = Object.values(pendingItems).some((item) => item?.operation === "withdrawal");

    window.clearTimeout(clearTimeout.current);
    clearTimeout.current = undefined;

    let content: ToastContent = (
      <div className="flex flex-col gap-8">
        {hasDeposits && !hasWithdrawals && <Trans>Depositing funds to GMX Account...</Trans>}
        {hasWithdrawals && !hasDeposits && <Trans>Withdrawing funds from GMX Account...</Trans>}
        {hasDeposits && hasWithdrawals && <Trans>Depositing and withdrawing funds to/from GMX Account...</Trans>}
        {Object.keys(multichainFundingPendingIds).map((staticId, index, array) => {
          const guid = multichainFundingPendingIds[staticId];
          const item = pendingItems[guid];
          if (!item) {
            return null;
          }

          const token = getToken(chainId, item.token);

          const formattedAmount = formatBalanceAmount(item.sentAmount, token.decimals, token.symbol);

          const isLoading = isMultichainFundingItemLoading(item);

          return (
            <div key={staticId} className="flex items-center justify-between">
              <div className="text-typography-secondary">
                {item.operation === "deposit" ? <Trans>Deposit</Trans> : <Trans>Withdraw</Trans>}
                {array.length > 1 && <> {formattedAmount}</>}
              </div>
              {isLoading && <SpinnerIcon className="spin size-15 text-white" />}
            </div>
          );
        })}
      </div>
    );

    if (toast.isActive(TOAST_ID)) {
      toast.update(TOAST_ID, {
        render: content,
        onClose: () => {
          removeMultichainFundingPendingIds(Object.keys(multichainFundingPendingIds));
        },
      });
    } else {
      toast(content, {
        toastId: TOAST_ID,
        type: "success",
        autoClose: false,
        onClose: () => {
          removeMultichainFundingPendingIds(Object.keys(multichainFundingPendingIds));
        },
      });
    }
  }, [chainId, labels, multichainFundingPendingIds, pendingItems, removeMultichainFundingPendingIds]);
}
