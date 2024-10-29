import { t, Trans } from "@lingui/macro";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { ExpandableRow } from "components/Synthetics/ExpandableRow";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxSetAdvancedOptions,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { SidecarOrderEntryGroup } from "domain/synthetics/sidecarOrders/types";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { PERCENTAGE_DECEMALS } from "domain/synthetics/sidecarOrders/utils";
import { USD_DECIMALS } from "config/factors";
import { formatAmount, formatPercentage, formatUsd } from "lib/numbers";
import { useCallback, useMemo } from "react";
import { SideOrderEntries } from "../components/SideOrderEntries";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { selectSelectedMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";

export function LimitAndTPSLRows() {
  const { stopLoss, takeProfit, limit } = useSidecarOrders();
  const marketDecimals = useSelector(selectSelectedMarketPriceDecimals);

  function renderSideOrders(type: "stopLoss" | "takeProfit" | "limit") {
    const isStopLoss = type === "stopLoss";
    const isLimitGroup = type === "limit";

    const entriesInfo: SidecarOrderEntryGroup = {
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      limit: limit,
    }[type];

    if (!entriesInfo || entriesInfo.entries.every((e) => e.txnType === "cancel")) return;

    const label = {
      stopLoss: t`Stop-Loss`,
      takeProfit: t`Take-Profit`,
      limit: t`Limit`,
    }[type];

    const labelPnl = isStopLoss ? t`Stop-Loss PnL` : t`Take-Profit PnL`;

    return (
      <div>
        <ExchangeInfo.Row
          className="swap-box-info-row whitespace-nowrap"
          label={label}
          value={
            <div className="profit-loss-wrapper">
              <SideOrderEntries entriesInfo={entriesInfo} displayMode={type === "limit" ? "sizeUsd" : "percentage"} />
            </div>
          }
        />
        {(!isLimitGroup && entriesInfo.totalPnL !== undefined && entriesInfo.totalPnLPercentage !== undefined && (
          <ExchangeInfo.Row className="swap-box-info-row" label={labelPnl}>
            {entriesInfo.totalPnL === 0n ? (
              "-"
            ) : (
              <TooltipWithPortal
                handle={`${formatUsd(entriesInfo.totalPnL)} (${formatPercentage(entriesInfo?.totalPnLPercentage, {
                  signed: true,
                })})`}
                position="bottom-end"
                handleClassName={
                  entriesInfo.totalPnL !== undefined && entriesInfo.totalPnL < 0 ? "text-red-500" : "text-green-500"
                }
                className="SLTP-pnl-tooltip"
                renderContent={() =>
                  entriesInfo?.entries?.map((entry, index) => {
                    if (!entry || !entry.decreaseAmounts || entry.txnType === "cancel") return;

                    const price = entry.price?.value && formatAmount(entry.price.value, USD_DECIMALS, marketDecimals);
                    const percentage =
                      entry.percentage?.value && formatAmount(entry.percentage.value, PERCENTAGE_DECEMALS, 0);

                    return (
                      <div className="mb-5 flex justify-between whitespace-nowrap" key={index}>
                        {(price && percentage && (
                          <span className="mr-15 whitespace-nowrap">
                            At ${price}, {isStopLoss ? "SL" : "TP"} {percentage}%:
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
          </ExchangeInfo.Row>
        )) ||
          null}
      </div>
    );
  }

  const limitGroup = renderSideOrders("limit");

  return (
    <>
      {limitGroup && <div className="mb-8">{limitGroup}</div>}
      {renderSideOrders("takeProfit")}
      {renderSideOrders("stopLoss")}
    </>
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
      className="-my-[1.05rem]"
      open={isTpSlVisible}
      title={<Trans>Limit / TP / SL</Trans>}
      hasError={hasError}
      disableCollapseOnError
      autoExpandOnError
      errorMessage={<Trans>There are issues in the TP/SL orders.</Trans>}
      onToggle={toggleLimitOrTPSL}
    >
      <LimitAndTPSLRows />
    </ExpandableRow>
  );
}
