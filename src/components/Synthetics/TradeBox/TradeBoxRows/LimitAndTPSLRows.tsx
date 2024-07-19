import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import Tooltip from "components/Tooltip/Tooltip";
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
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatPercentage, formatUsd } from "lib/numbers";
import { usePrevious } from "lib/usePrevious";
import { useCallback, useEffect, useMemo } from "react";
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import { SideOrderEntries } from "../components/SideOrderEntries";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function LimitAndTPSLRows() {
  const { stopLoss, takeProfit, limit } = useSidecarOrders();

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
          className="swap-box-info-row"
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
              <Tooltip
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

                    const price = entry.price?.value && formatAmount(entry.price.value, USD_DECIMALS, 2);
                    const percentage =
                      entry.percentage?.value && formatAmount(entry.percentage.value, PERCENTAGE_DECEMALS, 0);

                    return (
                      <div className="mb-5 flex justify-between" key={index}>
                        {(price && percentage && (
                          <span className="mr-15">
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

  const hasError = useMemo(() => {
    return entries.some((e) => {
      if (e.txnType === "cancel") return false;

      return e.sizeUsd?.error || e.percentage?.error || e.price?.error;
    });
  }, [entries]);

  const previousHasError = usePrevious(hasError);

  useEffect(() => {
    if (hasError && !previousHasError) {
      setOptions((ops) => ({
        ...ops,
        limitOrTPSL: true,
      }));
    }
  }, [hasError, previousHasError, setOptions]);

  const isTpSlVisible = hasError ? true : options.limitOrTPSL;

  const toggleLimitOrTPSL = useCallback(() => {
    if (hasError) {
      return;
    }

    setOptions((ops) => ({
      ...ops,
      limitOrTPSL: !options.limitOrTPSL,
    }));
  }, [setOptions, options.limitOrTPSL, hasError]);

  if (!showTPSL) {
    return null;
  }

  const title = (
    <span className="flex flex-row justify-between align-middle">
      <Trans>Limit / TP / SL</Trans>
    </span>
  );

  return (
    <>
      <ExchangeInfo.Row
        onClick={toggleLimitOrTPSL}
        label={
          hasError ? (
            <TooltipWithPortal handle={title} content={<Trans>There are issues in the TP/SL orders.</Trans>} />
          ) : (
            title
          )
        }
        className={cx("!items-center", {
          "!mb-12": options.limitOrTPSL,
          "cursor-not-allowed": hasError,
        })}
        value={
          isTpSlVisible ? (
            <BiChevronUp className="-mb-4 -mr-[0.35rem] -mt-4 h-24 w-24 opacity-70" />
          ) : (
            <BiChevronDown className="-mb-4 -mr-[0.35rem] -mt-4 h-24 w-24 opacity-70" />
          )
        }
      />
      {isTpSlVisible && <LimitAndTPSLRows />}
    </>
  );
}
