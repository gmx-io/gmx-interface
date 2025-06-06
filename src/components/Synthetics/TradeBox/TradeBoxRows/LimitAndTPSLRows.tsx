import { t, Trans } from "@lingui/macro";
import { useCallback, useMemo, useRef } from "react";
import { FaPlus } from "react-icons/fa6";

import { selectSelectedMarketVisualMultiplier } from "context/SyntheticsStateContext/selectors/statsSelectors";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxSetAdvancedOptions,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { SidecarOrderEntryGroup } from "domain/synthetics/sidecarOrders/types";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { PERCENTAGE_DECIMALS } from "domain/synthetics/sidecarOrders/utils";
import { formatAmount, formatPercentage, formatUsd, formatUsdPrice } from "lib/numbers";

import { ExpandableRow } from "components/Synthetics/ExpandableRow";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { EntryButton } from "../components/EntryButton";
import { SideOrderEntries } from "../components/SideOrderEntries";

function SideOrders({ type }: { type: "stopLoss" | "takeProfit" | "limit" }) {
  const { stopLoss, takeProfit, limit } = useSidecarOrders();
  const visualMultiplier = useSelector(selectSelectedMarketVisualMultiplier);
  const containerRef = useRef<HTMLDivElement>(null);

  const isStopLoss = type === "stopLoss";
  const isLimitGroup = type === "limit";

  const entriesInfo: SidecarOrderEntryGroup = {
    stopLoss: stopLoss,
    takeProfit: takeProfit,
    limit: limit,
  }[type];

  const handleAddEntry = useCallback(() => {
    entriesInfo.addEntry();

    requestAnimationFrame(() => {
      const inputs = containerRef.current?.querySelectorAll(".SideOrderInput");
      (inputs && (inputs[inputs.length - 1] as HTMLInputElement))?.focus();
    });
  }, [entriesInfo]);

  if (!entriesInfo || entriesInfo.entries.every((e) => e.txnType === "cancel")) return;

  const label = {
    stopLoss: t`Stop Loss`,
    takeProfit: t`Take Profit`,
    limit: t`Limit`,
  }[type];

  const labelPnl = isStopLoss ? t`Stop Loss PnL` : t`Take Profit PnL`;

  return (
    <>
      <SyntheticsInfoRow
        className="whitespace-nowrap leading-[16px]"
        label={
          <div className="flex items-center gap-6">
            {label}
            {entriesInfo.canAddEntry && (
              <TooltipWithPortal
                as="div"
                className="flex items-center"
                position="left-start"
                disabled={entriesInfo.allowAddEntry}
                content={
                  isStopLoss
                    ? t`Combined stop losses are at maximum (100%). Decrease existing values to add more orders.`
                    : t`Combined take profits are at maximum (100%). Decrease existing values to add more orders.`
                }
              >
                <EntryButton
                  theme="green"
                  onClick={handleAddEntry}
                  disabled={!entriesInfo.allowAddEntry}
                  className="-my-5"
                >
                  <FaPlus />
                </EntryButton>
              </TooltipWithPortal>
            )}
          </div>
        }
        valueClassName="-my-5"
        value={
          <div className="profit-loss-wrapper" ref={containerRef}>
            <SideOrderEntries entriesInfo={entriesInfo} displayMode={type === "limit" ? "sizeUsd" : "percentage"} />
          </div>
        }
      />
      {(!isLimitGroup && entriesInfo.totalPnL !== undefined && entriesInfo.totalPnLPercentage !== undefined && (
        <SyntheticsInfoRow label={labelPnl} className="leading-[16px]">
          {entriesInfo.totalPnL === 0n ? (
            "-"
          ) : (
            <TooltipWithPortal
              handle={`${formatUsd(entriesInfo.totalPnL)} (${formatPercentage(entriesInfo?.totalPnLPercentage, {
                signed: true,
              })})`}
              position="bottom-end"
              handleClassName={
                entriesInfo.totalPnL !== undefined && entriesInfo.totalPnL < 0
                  ? "text-red-500 !decoration-red-500/50"
                  : "text-green-500 !decoration-green-500/50"
              }
              className="SLTP-pnl-tooltip"
              renderContent={() =>
                entriesInfo?.entries?.map((entry, index) => {
                  if (!entry || !entry.decreaseAmounts || entry.txnType === "cancel") return;

                  const price = formatUsdPrice(entry.price?.value ?? undefined, {
                    visualMultiplier,
                  });
                  const percentage =
                    entry.percentage?.value && formatAmount(entry.percentage.value, PERCENTAGE_DECIMALS, 0);

                  return (
                    <div className="mb-5 flex justify-between whitespace-nowrap" key={index}>
                      {(price && percentage && (
                        <span className="mr-15 whitespace-nowrap">
                          At {price}, {isStopLoss ? "SL" : "TP"} {percentage}%:
                        </span>
                      )) ||
                        null}

                      <span
                        className={
                          entry.decreaseAmounts?.realizedPnl && entry.decreaseAmounts?.realizedPnl < 0
                            ? "text-red-500"
                            : "text-green-500"
                        }
                      >
                        {formatUsd(entry.decreaseAmounts?.realizedPnl)} (
                        {formatPercentage(entry.decreaseAmounts?.realizedPnlPercentage, {
                          signed: true,
                        })}
                        )
                      </span>
                    </div>
                  );
                })
              }
            />
          )}
        </SyntheticsInfoRow>
      )) ||
        null}
    </>
  );
}

export function LimitAndTPSLRows({ hasExistingLimitOrder }: { hasExistingLimitOrder: boolean }) {
  return (
    <div className="flex flex-col gap-14 py-14">
      <SideOrders type="limit" />
      {hasExistingLimitOrder && <div className="h-[0.5px] bg-stroke-primary" />}
      <SideOrders type="takeProfit" />
      <div className="h-[0.5px] bg-stroke-primary" />
      <SideOrders type="stopLoss" />
    </div>
  );
}

export function LimitAndTPSLGroup() {
  const options = useSelector(selectTradeboxAdvancedOptions);
  const setOptions = useSelector(selectTradeboxSetAdvancedOptions);
  const { isTrigger, isSwap } = useSelector(selectTradeboxTradeFlags);

  const showTPSL = !isTrigger && !isSwap;

  const entries = useSidecarEntries();
  const orders = useSidecarOrders();

  const hasError = useMemo(() => {
    const hasAnyEntryError = entries.some((e) => {
      if (e.txnType === "cancel") return false;

      return e.sizeUsd?.error || e.percentage?.error || e.price?.error;
    });
    return Boolean(orders.stopLoss.error?.percentage || orders.takeProfit.error?.percentage || hasAnyEntryError);
  }, [entries, orders]);

  const isTpSlVisible = hasError ? true : options.limitOrTPSL;

  const hasExistingLimitOrder = useMemo(() => {
    return orders.limit.entries.length > 0;
  }, [orders.limit.entries]);

  const toggleLimitOrTPSL = useCallback(
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
        hasExistingLimitOrder ? <Trans>Limit / Take Profit / Stop Loss</Trans> : <Trans>Take Profit / Stop Loss</Trans>
      }
      hasError={hasError}
      disableCollapseOnError
      autoExpandOnError
      errorMessage={<Trans>There are issues in the TP/SL orders.</Trans>}
      onToggle={toggleLimitOrTPSL}
      contentClassName=""
      withToggleSwitch
    >
      <LimitAndTPSLRows hasExistingLimitOrder={hasExistingLimitOrder} />
    </ExpandableRow>
  );
}
