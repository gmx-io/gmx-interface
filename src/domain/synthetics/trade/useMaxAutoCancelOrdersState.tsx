import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectMaxAutoCancelOrders } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectOrdersByPositionKey } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { selectTradeboxSelectedPositionKey } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";

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
  const sidecarEntries = useSidecarEntries();
  const positionOrders = useSelector(makeSelectOrdersByPositionKey(positionKey));
  const selectedPositionKey = useSelector(selectTradeboxSelectedPositionKey);

  const shouldCountDraftSidecarOrders = positionKey === selectedPositionKey;

  let draftOrdersCount = isCreatingNewAutoCancel ? 1 : 0;
  if (shouldCountDraftSidecarOrders) {
    draftOrdersCount += sidecarEntries.filter((entry) => entry.txnType === "create").length;
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
      <AlertInfoCard type="warning" hideClose>
        <Trans>
          Max {allowedAutoCancelOrdersNumber} auto-cancel TP/SL orders allowed. Extra orders require manual
          cancellation. Existing orders still close with the position.{" "}
          <ExternalLink href="https://docs.gmx.io/docs/trading/#auto-cancel-tp--sl">Read more</ExternalLink>.
        </Trans>
      </AlertInfoCard>
    );
  }

  return {
    warning,
    autoCancelOrdersLimit,
  };
}
