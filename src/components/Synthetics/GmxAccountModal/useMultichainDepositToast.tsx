import { Trans } from "@lingui/macro";
import { useEffect, useMemo, useRef } from "react";
import { ImSpinner2 } from "react-icons/im";
import { toast, ToastContent } from "react-toastify";

import { MultichainFundingHistoryItem } from "context/GmxAccountContext/types";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { formatBalanceAmount } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
import { getToken } from "sdk/configs/tokens";

import { FUNDING_OPERATIONS_LABELS, isMultichainFundingItemLoading } from "./MainView";
import { useGmxAccountFundingHistory } from "./useGmxAccountFundingHistory";

const TOAST_ID = "multichain-funding-toast";

function useGmxAccountPendingFundingHistoryItems(
  guids: string[] | undefined
): Partial<Record<string, MultichainFundingHistoryItem>> | undefined {
  const fundingHistory = useGmxAccountFundingHistory({ enabled: guids && guids.length > 0 });

  const pendingItems = useMemo((): Partial<Record<string, MultichainFundingHistoryItem>> => {
    if (!fundingHistory || fundingHistory.length === 0 || !guids || guids.length === 0) {
      return EMPTY_OBJECT;
    }
    const result: Record<string, MultichainFundingHistoryItem> = {};

    for (const item of fundingHistory) {
      if (guids.includes(item.id)) {
        result[item.id] = item;
      }
    }

    return result;
  }, [fundingHistory, guids]);

  return pendingItems;
}

export function useMultichainFundingDepositToast() {
  const { chainId } = useChainId();
  const { multichainFundingPendingIds } = useSyntheticsEvents();

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

    window.clearTimeout(clearTimeout.current);
    clearTimeout.current = undefined;

    let content: ToastContent = (
      <div className="flex flex-col gap-8">
        <Trans>Transferring your funds to your GMX account.</Trans>
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
              <div className="text-white/50">
                <Trans>Transaction is pending.</Trans>
                {array.length > 1 && <> {formattedAmount}</>}
              </div>
              {isLoading && <ImSpinner2 width={60} height={60} className="spin size-15 text-white" />}
            </div>
          );
        })}
      </div>
    );

    if (toast.isActive(TOAST_ID)) {
      toast.update(TOAST_ID, {
        render: content,
      });
    } else {
      toast(content, {
        toastId: TOAST_ID,
        type: "success",
        autoClose: false,
      });
    }
  }, [labels, multichainFundingPendingIds, pendingItems]);
}
