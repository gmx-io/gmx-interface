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
import { useRef, useMemo, useCallback } from "react";
import { SidecarOrderEntryGroup, SidecarOrderEntry } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { isIncreaseOrderType } from "domain/synthetics/orders";
import { TokenData } from "domain/synthetics/tokens";

const SUGGESTION_PERCENTAGE_LIST = [10, 25, 50, 75, 100];

interface SidecarEntryProps {
  entry: SidecarOrderEntry;
  indexToken?: TokenData;
  displayMode: "sizeUsd" | "percentage";
  updateEntry: (id: string, field: "sizeUsd" | "percentage" | "price", value: string) => void;
  deleteEntry: (id: string) => void;
  canAddEntry: boolean;
  allowAddEntry: boolean;
  handleAddEntry: () => void;
  entriesCount: number;
}

function SidecarEntry({
  entry,
  indexToken,
  displayMode,
  entriesCount,
  updateEntry,
  deleteEntry,
  canAddEntry,
  allowAddEntry,
  handleAddEntry,
}: SidecarEntryProps) {
  const percentageError = entry.percentage?.error;
  const priceError = entry.price?.error;
  const sizeError = displayMode === "percentage" ? percentageError : entry.sizeUsd?.error;

  const isIncrease = entry.order && isIncreaseOrderType(entry.order.orderType);
  const isLong = entry.order?.isLong;

  const priceTooltipMsg =
    indexToken &&
    entry.price?.value &&
    entry.sizeUsd?.value &&
    `${isIncrease ? "Increase" : "Decrease"} ${indexToken?.symbol} ${isLong ? "Long" : "Short"} by ${formatUsd(
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

  const onPriceValueChange = useCallback(
    (e) => {
      updateEntry(entry.id, "price", e.target.value);
    },
    [updateEntry, entry.id]
  );

  const onSizeUsdValueChange = useCallback(
    (e) => {
      updateEntry(entry.id, "sizeUsd", e.target.value);
    },
    [updateEntry, entry.id]
  );

  const onPercentageSetValue = useCallback(
    (value) => {
      if (NUMBER_WITH_TWO_DECIMALS.test(value) || value.length === 0) {
        updateEntry(entry.id, "percentage", value);
      }
    },
    [updateEntry, entry.id]
  );

  const onDeleteEntry = useCallback(() => deleteEntry(entry.id), [deleteEntry, entry.id]);

  const addRowTooltip = useMemo(() => <span>{t`Add Row`}</span>, []);
  const removeRowTooltip = useMemo(() => <span>{t`Remove Row`}</span>, []);

  return (
    <div className="SidecarEntry-row" key={entry.id}>
      <div className={cx("Sidecar-price", { "input-error": priceError })}>
        <span className="price-symbol">$</span>

        <NumberInput
          value={entry.price.input}
          onValueChange={onPriceValueChange}
          placeholder="Price"
          className="price-input"
        />

        {priceError && (
          <div className={cx("Sidecar-price-error", "Tooltip-popup", "z-index-1001", "bottom")}>{priceError}</div>
        )}
      </div>
      {displayMode === "percentage" && (
        <div className={cx("Sidecar-percentage", { "input-error": !!percentageError })}>
          <SuggestionInput
            value={entry.percentage?.input ?? ""}
            setValue={onPercentageSetValue}
            placeholder="Size"
            suggestionList={SUGGESTION_PERCENTAGE_LIST}
            symbol="%"
          />
          {sizeTooltipMsg && (
            <div className={cx("Sidecar-size-info", "Tooltip-popup", "z-index-1001", "top-end")}>{sizeTooltipMsg}</div>
          )}
        </div>
      )}
      {displayMode === "sizeUsd" && (
        <div className={cx("Sidecar-size", { "input-error": !!sizeError })}>
          <span className="price-symbol">$</span>
          <NumberInput
            value={entry.sizeUsd.input ?? ""}
            onValueChange={onSizeUsdValueChange}
            placeholder="Size"
            className="size-input"
          />
          {sizeTooltipMsg && (
            <div className={cx("Sidecar-size-info", "Tooltip-popup", "z-index-1001", "top-end")}>{sizeTooltipMsg}</div>
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
            content={addRowTooltip}
            openDelay={1500}
          />
        )}
        <TooltipWithPortal
          handle={
            <button
              className="action-remove"
              onClick={onDeleteEntry}
              disabled={entriesCount === 1 && !entry.percentage && !entry.price}
            >
              <FaPlus color="#E74E5D" className="rotate-45" />
            </button>
          }
          portalClassName="Sidecar-helper-text"
          position="right"
          content={removeRowTooltip}
          openDelay={1500}
        />
      </div>
    </div>
  );
}

type SidecarEntriesProps = {
  entriesInfo: SidecarOrderEntryGroup;
  marketInfo?: MarketInfo;
  displayMode: "percentage" | "sizeUsd";
};

function SidecarEntries({ entriesInfo, marketInfo, displayMode }: SidecarEntriesProps) {
  const { addEntry, updateEntry, canAddEntry, allowAddEntry, deleteEntry } = entriesInfo;
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAddEntry = useCallback(() => {
    addEntry();
    requestAnimationFrame(() => {
      const inputs = containerRef.current?.querySelectorAll(".Sidecar-price input");
      (inputs && (inputs[inputs.length - 1] as HTMLInputElement))?.focus();
    });
  }, [addEntry, containerRef]);

  const displayableEntries = useMemo(
    () => entriesInfo.entries.filter((entry) => entry.txnType !== "cancel"),
    [entriesInfo]
  );

  return (
    <div className="SidecarEntries-wrapper" ref={containerRef}>
      {displayableEntries?.map((entry) => (
        <SidecarEntry
          key={entry.id}
          entry={entry}
          entriesCount={entriesInfo.entries.length}
          indexToken={marketInfo?.indexToken}
          displayMode={displayMode}
          updateEntry={updateEntry}
          deleteEntry={deleteEntry}
          canAddEntry={canAddEntry}
          allowAddEntry={allowAddEntry}
          handleAddEntry={handleAddEntry}
        />
      ))}
    </div>
  );
}

export default SidecarEntries;
