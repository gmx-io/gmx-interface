import { Trans } from "@lingui/macro";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { selectMaxAutoCancelOrders } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectOrdersByPositionKey } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { selectTradeboxSelectedPositionKey } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useMemo } from "react";

export function useMaxAutoCancelOrdersState({ positionKey }: { positionKey?: string }) {
  const maxAutoCancelOrders = useSelector(selectMaxAutoCancelOrders);
  const { stopLoss, takeProfit } = useSidecarOrders();
  const positionOrders = useSelector(makeSelectOrdersByPositionKey(positionKey));
  const selectedPositionKey = useSelector(selectTradeboxSelectedPositionKey);

  const shouldCountSidecarOrders = positionKey === selectedPositionKey;

  let draftOrdersCount = 0;
  if (shouldCountSidecarOrders) {
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

  const allowedAutoCancelOrders = Number(maxAutoCancelOrders) - 1;
  autoCancelOrdersLimit = allowedAutoCancelOrders - existingAutoCancelOrders.length;
  const canAddAutoCancelOrder = autoCancelOrdersLimit - draftOrdersCount > 0;

  if (!canAddAutoCancelOrder) {
    warning = (
      <AlertInfo type="info">
        <Trans>
          You can have up to {allowedAutoCancelOrders} active auto-cancelable TP/SL orders. Additional orders must be
          canceled manually, while existing ones will still close automatically with their related position.
        </Trans>{" "}
        <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v1">
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
