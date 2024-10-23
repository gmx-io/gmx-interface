import { Trans } from "@lingui/macro";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { selectMaxAutoCancelOrders } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectOrdersByPositionKey } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { selectTradeboxSelectedPositionKey } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useMemo } from "react";

export function useMaxAutoCancelOrdersState({ positionKey }: { positionKey?: string }) {
  const { isAutoCancelTPSL } = useSettings();
  const maxAutoCancelOrders = useSelector(selectMaxAutoCancelOrders);
  const { stopLoss, takeProfit } = useSidecarOrders();
  const positionOrders = useSelector(makeSelectOrdersByPositionKey(positionKey));
  const selectedPositionKey = useSelector(selectTradeboxSelectedPositionKey);

  const shouldCountDraftSidecarOrders = positionKey === selectedPositionKey;

  let draftOrdersCount = 0;
  if (shouldCountDraftSidecarOrders) {
    draftOrdersCount = [...stopLoss.entries, ...takeProfit.entries].filter(
      (entry) => entry.txnType === "create"
    ).length;
  }

  const existingAutoCancelOrders = useMemo(() => {
    return positionOrders.filter((order) => order.autoCancel);
  }, [positionOrders]);

  let warning: React.ReactNode = null;
  let autoCancelOrdersLimit = 0;

  if (maxAutoCancelOrders === undefined) {
    return {
      warning,
      autoCancelOrdersLimit,
    };
  }

  const allowedAutoCancelOrdersNumber = Number(maxAutoCancelOrders) - 1;
  autoCancelOrdersLimit = isAutoCancelTPSL ? allowedAutoCancelOrdersNumber - existingAutoCancelOrders.length : 0;
  const isAllowedAddAutoCancelOrder = autoCancelOrdersLimit && autoCancelOrdersLimit - draftOrdersCount > 0;

  if (!isAllowedAddAutoCancelOrder && isAutoCancelTPSL) {
    warning = (
      <AlertInfo type="info">
        <Trans>
          You can have up to {allowedAutoCancelOrdersNumber} active auto-cancelable TP/SL orders. Additional orders must
          be canceled manually, while existing ones will still close automatically with their related position.
        </Trans>{" "}
        <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#auto-cancel-tp--sl">
          <Trans>Read more.</Trans>
        </ExternalLink>
      </AlertInfo>
    );
  }

  return {
    warning,
    autoCancelOrdersLimit,
  };
}
