import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectMaxAutoCancelOrders } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectOrdersByPositionKey } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { selectTradeboxSelectedPositionKey } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import ExternalLink from "components/ExternalLink/ExternalLink";


export function useMaxAutoCancelOrdersState({
  positionKey,
  isCreatingNewAutoCancel,
}: {
  positionKey?: string;
  isCreatingNewAutoCancel?: boolean;
}) {
  const { isAutoCancelTPSL: isEnabledAutoCancel } = useSettings();
  const maxAutoCancelOrders = useSelector(selectMaxAutoCancelOrders);
  const { stopLoss, takeProfit } = useSidecarOrders();
  const positionOrders = useSelector(makeSelectOrdersByPositionKey(positionKey));
  const selectedPositionKey = useSelector(selectTradeboxSelectedPositionKey);

  const shouldCountDraftSidecarOrders = positionKey === selectedPositionKey;

  let draftOrdersCount = isCreatingNewAutoCancel ? 1 : 0;
  if (shouldCountDraftSidecarOrders) {
    draftOrdersCount += [...stopLoss.entries, ...takeProfit.entries].filter(
      (entry) => entry.txnType === "create"
    ).length;
  }

  const existingAutoCancelOrders = useMemo(() => {
    return positionOrders.filter((order) => order.autoCancel);
  }, [positionOrders]);

  if (maxAutoCancelOrders === undefined || !isEnabledAutoCancel) {
    return {
      warning: null,
      autoCancelOrdersLimit: 0,
    };
  }

  const allowedAutoCancelOrdersNumber = Number(maxAutoCancelOrders);
  const autoCancelOrdersLimit = allowedAutoCancelOrdersNumber - existingAutoCancelOrders.length;
  const showWarning = autoCancelOrdersLimit < draftOrdersCount;

  let warning: React.ReactNode = null;

  if (showWarning) {
    warning = (
      <AlertInfoCard>
        <Trans>
          You can have up to {allowedAutoCancelOrdersNumber} active auto-cancelable TP/SL orders. Additional orders must
          be canceled manually, while existing ones will still close automatically with their related position.
        </Trans>{" "}
        <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#auto-cancel-tp--sl">
          <Trans>Read more.</Trans>
        </ExternalLink>
      </AlertInfoCard>
    );
  }

  return {
    warning,
    autoCancelOrdersLimit,
  };
}
