import "./SLTPEntries.scss";
import NumberInput from "components/NumberInput/NumberInput";
import { NUMBER_WITH_TWO_DECIMALS } from "components/PercentageInput/PercentageInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { FaPlus } from "react-icons/fa";
import cx from "classnames";
import { formatUsd } from "lib/numbers";
import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import { MarketInfo } from "domain/synthetics/markets";
import { t } from "@lingui/macro";
import { useRef } from "react";
import { SLTPInfo } from "domain/synthetics/orders/useSLTPEntries";

const SUGGESTION_PERCENTAGE_LIST = [10, 25, 50, 75, 100];

type Props = {
  entriesInfo: SLTPInfo;
  marketInfo?: MarketInfo;
};

function SLTPEntries({ entriesInfo, marketInfo }: Props) {
  const { addEntry, updateEntry, canAddEntry, deleteEntry } = entriesInfo;
  const sltpRef = useRef<HTMLDivElement>(null);

  function handleAddEntry() {
    addEntry();
    setTimeout(() => {
      const inputs = sltpRef.current?.querySelectorAll(".SLTP-price input");
      (inputs && (inputs[inputs.length - 1] as HTMLInputElement))?.focus();
    });
  }

  return (
    <div className="SLTPEntries-wrapper" ref={sltpRef}>
      {entriesInfo.entries.map((entry) => {
        const indexToken = marketInfo?.indexToken;
        const entrySizeUsd = entry.amounts?.sizeDeltaUsd;
        const priceTooltipMsg =
          !entry.error &&
          entry.price &&
          indexToken &&
          entrySizeUsd &&
          t`Decrease ${indexToken?.symbol} Long by ${formatUsd(entrySizeUsd)} at $${entry.price}.`;

        return (
          <div key={entry.id}>
            <div className="SLTPEntry-row" key={entry.id}>
              <div className={cx("SLTP-price", { "input-error": !!entry.error?.price })}>
                <span className="price-symbol">$</span>

                <NumberInput
                  value={entry.price}
                  onValueChange={(e) => updateEntry(entry.id, { ...entry, price: e.target.value })}
                  placeholder="Price"
                  className="price-input"
                />

                {entry.error?.price && (
                  <div className={cx("SLTP-price-error", "Tooltip-popup", "z-index-1001", "bottom")}>
                    {entry.error?.price}
                  </div>
                )}
              </div>
              <div className={cx("SLTP-percentage", { "input-error": !!entry.error?.percentage })}>
                <SuggestionInput
                  value={entry.percentage}
                  setValue={(value) => {
                    if (NUMBER_WITH_TWO_DECIMALS.test(value) || value.length === 0) {
                      updateEntry(entry.id, { ...entry, percentage: value });
                    }
                  }}
                  placeholder="Size"
                  suggestionList={SUGGESTION_PERCENTAGE_LIST}
                  symbol="%"
                />
                {entry.error?.percentage && (
                  <div className={cx("SLTP-percent-error", "Tooltip-popup", "z-index-1001", "top-end")}>
                    {entry.error?.percentage}
                  </div>
                )}
                {entrySizeUsd && priceTooltipMsg ? (
                  <div className={cx("SLTP-percent-info", "Tooltip-popup", "z-index-1001", "top-end")}>
                    {priceTooltipMsg}
                  </div>
                ) : (
                  ""
                )}
              </div>
              <div className="SLTP-actions">
                <TooltipWithPortal
                  handle={
                    <button className="action-add" disabled={!canAddEntry} onClick={handleAddEntry}>
                      <FaPlus color="#5EC989" />
                    </button>
                  }
                  portalClassName="SLTP-helper-text"
                  handleClassName="mr-8"
                  position="right"
                  renderContent={() => <span>Add Row</span>}
                  openDelay={1500}
                />
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
                  portalClassName="SLTP-helper-text"
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

export default SLTPEntries;
