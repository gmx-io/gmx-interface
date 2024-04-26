import "./SidecarEntries.scss";
import NumberInput from "components/NumberInput/NumberInput";
import { NUMBER_WITH_TWO_DECIMALS } from "components/PercentageInput/PercentageInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { FaPlus } from "react-icons/fa";
import cx from "classnames";
import { formatUsd } from "lib/numbers";
import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import { MarketInfo } from "domain/synthetics/markets";
import { t } from "@lingui/macro";
import { useRef, useMemo } from "react";
import { SidecarOrderEntryGroup } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { isIncreaseOrderType } from "domain/synthetics/orders";

const SUGGESTION_PERCENTAGE_LIST = [10, 25, 50, 75, 100];

type Props = {
  entriesInfo: SidecarOrderEntryGroup;
  marketInfo?: MarketInfo;
  displayMode: "percentage" | "sizeUsd";
};

function SidecarEntries({ entriesInfo, marketInfo, displayMode }: Props) {
  const { addEntry, updateEntry, canAddEntry, allowAddEntry, deleteEntry } = entriesInfo;
  const containerRef = useRef<HTMLDivElement>(null);

  function handleAddEntry() {
    addEntry();
    setTimeout(() => {
      const inputs = containerRef.current?.querySelectorAll(".Sidecar-price input");
      (inputs && (inputs[inputs.length - 1] as HTMLInputElement))?.focus();
    });
  }

  const displayableEntries = useMemo(
    () => entriesInfo.entries.filter((entry) => entry.txnType !== "cancel"),
    [entriesInfo]
  );

  return (
    <div className="SidecarEntries-wrapper" ref={containerRef}>
      {displayableEntries?.map((entry) => {
        const indexToken = marketInfo?.indexToken;

        const percentageError = entriesInfo.error?.percentage || entry.percentage?.error;
        const priceError = entriesInfo.error?.price || entry.price?.error;
        const sizeError = displayMode === "percentage" ? percentageError : entry.sizeUsd?.error;

        const isIncrease = entry.order && isIncreaseOrderType(entry.order.orderType);
        const isLong = entry.order?.isLong;

        const priceTooltipMsg =
          indexToken &&
          entry.price?.value &&
          entry.sizeUsd?.value &&
          t`${isIncrease ? "Increase" : "Decrease"} ${indexToken?.symbol} ${isLong ? "Long" : "Short"} by ${formatUsd(
            entry.sizeUsd.value
          )} at ${formatUsd(entry.price.value ?? undefined)}.`;

        const sizeTooltipMsg =
          sizeError || priceTooltipMsg ? (
            <>
              {sizeError}
              {sizeError && priceTooltipMsg && (
                <>
                  <br />
                  <br />
                </>
              )}
              {priceTooltipMsg}
            </>
          ) : null;

        /* eslint-disable react-perf/jsx-no-new-object-as-prop */
        return (
          <div key={entry.id}>
            <div className="SidecarEntry-row" key={entry.id} style={{ position: "relative" }}>
              <div style={{ position: "absolute", right: "100%" }}>
                {
                  {
                    keepSize: "ks",
                    keepPercentage: "kp",
                    fitPercentage: "fp",
                  }[entry.mode]
                }
              </div>

              <div className={cx("Sidecar-price", { "input-error": priceError })}>
                <span className="price-symbol">$</span>

                <NumberInput
                  value={entry.price.input}
                  onValueChange={(e) => updateEntry(entry.id, "price", e.target.value)}
                  placeholder="Price"
                  className="price-input"
                />

                {priceError && (
                  <div className={cx("Sidecar-price-error", "Tooltip-popup", "z-index-1001", "bottom")}>
                    {priceError}
                  </div>
                )}
              </div>
              {displayMode === "percentage" && (
                <div className={cx("Sidecar-percentage", { "input-error": !!percentageError })}>
                  <SuggestionInput
                    value={entry.percentage?.input ?? ""}
                    setValue={(value) => {
                      if (NUMBER_WITH_TWO_DECIMALS.test(value) || value.length === 0) {
                        updateEntry(entry.id, "percentage", value);
                      }
                    }}
                    placeholder="Size"
                    suggestionList={SUGGESTION_PERCENTAGE_LIST}
                    symbol="%"
                  />
                  {sizeTooltipMsg && (
                    <div className={cx("Sidecar-size-info", "Tooltip-popup", "z-index-1001", "top-end")}>
                      {sizeTooltipMsg}
                    </div>
                  )}
                </div>
              )}
              {displayMode === "sizeUsd" && (
                <div className={cx("Sidecar-size", { "input-error": !!sizeError })}>
                  <span className="price-symbol">$</span>
                  <NumberInput
                    value={entry.sizeUsd.input ?? ""}
                    onValueChange={(e) => updateEntry(entry.id, "sizeUsd", e.target.value)}
                    placeholder="Size"
                    className="size-input"
                  />
                  {sizeTooltipMsg && (
                    <div className={cx("Sidecar-size-info", "Tooltip-popup", "z-index-1001", "top-end")}>
                      {sizeTooltipMsg}
                    </div>
                  )}
                </div>
              )}
              <div className="Sidecar-actions">
                {canAddEntry && (
                  <TooltipWithPortal
                    handle={
                      <button className="action-add" disabled={!allowAddEntry} onClick={handleAddEntry}>
                        <FaPlus color="#5EC989" />
                      </button>
                    }
                    portalClassName="Sidecar-helper-text"
                    handleClassName="mr-xs"
                    position="right"
                    renderContent={() => <span>Add Row</span>}
                    openDelay={1500}
                  />
                )}
                <TooltipWithPortal
                  handle={
                    <button
                      className="action-remove"
                      onClick={() => deleteEntry(entry.id)}
                      disabled={entriesInfo.entries.length === 1 && !entry.percentage && !entry.price}
                    >
                      <FaPlus color="#E74E5D" className="rotate-45" />
                    </button>
                  }
                  portalClassName="Sidecar-helper-text"
                  position="right"
                  renderContent={() => <span>Remove Row</span>}
                  openDelay={1500}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SidecarEntries;
