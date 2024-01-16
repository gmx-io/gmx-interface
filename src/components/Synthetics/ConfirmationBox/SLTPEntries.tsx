import "./SLTPEntries.scss";
import NumberInput from "components/NumberInput/NumberInput";
import { NUMBER_WITH_TWO_DECIMALS } from "components/PercentageInput/PercentageInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { FaPlus } from "react-icons/fa";
import cx from "classnames";
import { formatUsd } from "lib/numbers";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import { MarketInfo } from "domain/synthetics/markets";
import { IncreasePositionAmounts } from "domain/synthetics/trade";
import { Entry } from "domain/synthetics/orders/useSLTPEntries";
import { t } from "@lingui/macro";

const SUGGESTION_PERCENTAGE_LIST = [10, 25, 50, 75, 100];

type Props = {
  entries: Entry[];
  updateEntry: (id: string, entry: Entry) => void;
  addEntry: () => void;
  deleteEntry: (id: string) => void;
  canAddEntry: boolean;
  marketInfo?: MarketInfo;
  increaseAmounts?: IncreasePositionAmounts;
};

function SLTPEntries({ entries, updateEntry, addEntry, deleteEntry, canAddEntry, increaseAmounts, marketInfo }: Props) {
  return (
    <div className="SLTPEntries-wrapper">
      {entries.map((entry) => {
        const percentage = Math.floor(Number.parseFloat(entry.percentage) * 100);
        const entrySizeUsd =
          increaseAmounts?.sizeDeltaUsd.gt(0) &&
          percentage &&
          increaseAmounts?.sizeDeltaUsd.mul(percentage).div(BASIS_POINTS_DIVISOR);

        const indexToken = marketInfo?.indexToken;
        const priceTooltipMsg =
          !entry.error &&
          entry.price &&
          indexToken &&
          entrySizeUsd &&
          t`Decrease ${indexToken?.symbol} Long by ${formatUsd(entrySizeUsd)} at $${entry.price}.`;

        return (
          <div key={entry.id}>
            <div className="SLTPEntry-row" key={entry.id}>
              <div className={cx("SLTP-price", { "input-error": !!entry.error })}>
                <span className="price-symbol">$</span>

                <NumberInput
                  value={entry.price}
                  onValueChange={(e) => updateEntry(entry.id, { ...entry, price: e.target.value })}
                  placeholder="Price"
                  className="price-input"
                />

                {entry.error && (
                  <div className={cx("SLTP-input-error", "Tooltip-popup", "z-index-1001", "center-bottom")}>
                    {entry.error}
                  </div>
                )}
              </div>
              <div className="SLTP-percentage">
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
                {entrySizeUsd && priceTooltipMsg ? (
                  <div className={cx("SLTP-percent-info", "Tooltip-popup", "z-index-1001", "right-top")}>
                    {priceTooltipMsg}
                  </div>
                ) : (
                  ""
                )}
              </div>
              <div className="SLTP-actions">
                <TooltipWithPortal
                  handle={
                    <button className="action-add" disabled={!canAddEntry} onClick={addEntry}>
                      <FaPlus color="#5EC989" />
                    </button>
                  }
                  portalClassName="SLTP-helper-text"
                  handleClassName="mr-xs"
                  position="right-center"
                  renderContent={() => <span>Add Row</span>}
                  openDelay={1500}
                />
                <TooltipWithPortal
                  handle={
                    <button
                      className="action-remove"
                      onClick={() => deleteEntry(entry.id)}
                      disabled={entries.length === 1}
                    >
                      <FaPlus color="#E74E5D" className="rotate-45" />
                    </button>
                  }
                  portalClassName="SLTP-helper-text"
                  position="right-center"
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
