import { t } from "@lingui/macro";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import Tooltip from "components/Tooltip/Tooltip";
import { SidecarOrderEntryGroup } from "domain/synthetics/sidecarOrders/types";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { PERCENTAGE_DECEMALS } from "domain/synthetics/sidecarOrders/utils";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatPercentage, formatUsd } from "lib/numbers";
import { SideOrderEntries } from "../components/SideOrderEntries";

export function LimitAndTPSLRows({ isVisible }: { isVisible: boolean }) {
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

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <ExchangeInfo.Group>{renderSideOrders("limit")}</ExchangeInfo.Group>
      <div className="App-card-divider" />
      <ExchangeInfo.Group>{renderSideOrders("takeProfit")}</ExchangeInfo.Group>
      <div className="App-card-divider" />
      <ExchangeInfo.Group>{renderSideOrders("stopLoss")}</ExchangeInfo.Group>
      <div className="App-card-divider" />
    </>
  );
}
