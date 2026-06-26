import { Trans } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import {
  selectTradeboxAdvancedOptions,
  selectTradeboxIsTPSLEnabled,
  selectTradeboxSetAdvancedOptions,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";

import { ExpandableRow } from "components/ExpandableRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { SideOrderEntry } from "../components/SideOrderEntry";

function SideOrders({ type }: { type: "stopLoss" | "takeProfit" }) {
  const { stopLoss, takeProfit } = useSidecarOrders();

  if (type === "takeProfit") {
    const entry = takeProfit.entries.find((e) => e.txnType !== "cancel");
    if (!entry) return null;
    return <SideOrderEntry type="takeProfit" entry={entry} entriesInfo={takeProfit} />;
  }

  const entry = stopLoss.entries.find((e) => e.txnType !== "cancel");
  if (!entry) return null;
  return <SideOrderEntry type="stopLoss" entry={entry} entriesInfo={stopLoss} />;
}

export function TPSLRows() {
  return (
    <div className="flex flex-col gap-8">
      <SideOrders type="takeProfit" />
      <SideOrders type="stopLoss" />
    </div>
  );
}

export function TPSLGroup() {
  const options = useSelector(selectTradeboxAdvancedOptions);
  const setOptions = useSelector(selectTradeboxSetAdvancedOptions);
  const { isTrigger, isSwap } = useSelector(selectTradeboxTradeFlags);
  const isTpSlEnabled = useSelector(selectTradeboxIsTPSLEnabled);

  const showTPSL = !isTrigger && !isSwap;

  const entries = useSidecarEntries();
  const orders = useSidecarOrders();

  const hasError = useMemo(() => {
    if (!isTpSlEnabled) {
      return false;
    }

    const hasAnyEntryError = entries.some((e) => {
      if (e.txnType === "cancel") return false;

      return e.sizeUsd?.error || e.percentage?.error || e.price?.error;
    });
    return Boolean(orders.stopLoss.error?.percentage || orders.takeProfit.error?.percentage || hasAnyEntryError);
  }, [entries, isTpSlEnabled, orders]);

  const isTpSlVisible = hasError ? true : options.limitOrTPSL;

  const toggleTPSL = useCallback(
    (value: boolean) => {
      setOptions((ops) => ({
        ...ops,
        limitOrTPSL: value,
      }));
    },
    [setOptions]
  );

  if (!showTPSL) {
    return null;
  }

  return (
    <ExpandableRow
      open={isTpSlVisible}
      title={
        <TooltipWithPortal
          handle={<Trans>Take-Profit / Stop-Loss</Trans>}
          variant="iconStroke"
          position="top"
          disableClickToggle
          content={
            <Trans>
              Create basic TP/SL orders that fully close your position. For advanced TP/SL setup, use the positions list
              after opening a position.
            </Trans>
          }
        />
      }
      hasError={hasError}
      disableCollapseOnError
      autoExpandOnError
      onToggle={toggleTPSL}
      withToggleSwitch
    >
      <TPSLRows />
    </ExpandableRow>
  );
}
