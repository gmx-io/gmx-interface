import cx from "classnames";
import NumberInput from "components/NumberInput/NumberInput";
import { NUMBER_WITH_TWO_DECIMALS } from "components/PercentageInput/PercentageInput";
import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";
import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isIncreaseOrderType } from "domain/synthetics/orders";
import { SidecarOrderEntry, SidecarOrderEntryGroup } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { TokenData } from "domain/synthetics/tokens";
import { formatUsd, formatUsdPrice } from "lib/numbers";
import { useCallback, useMemo, useRef } from "react";
import { FaPlus } from "react-icons/fa";
import { useMedia } from "react-use";

const SUGGESTION_PERCENTAGE_LIST = [10, 25, 50, 75, 100];

interface SidecarEntryProps {
  entry: SidecarOrderEntry;
  commonError?: {
    price?: string;
    percentage?: string;
  } | null;
  indexToken?: TokenData;
  displayMode: "sizeUsd" | "percentage";
  updateEntry: (id: string, field: "sizeUsd" | "percentage" | "price", value: string) => void;
  deleteEntry: (id: string) => void;
  canAddEntry: boolean;
  allowAddEntry: boolean;
  handleAddEntry: () => void;
  entriesCount: number;
}

function SideOrderEntry({
  entry,
  commonError,
  indexToken,
  displayMode,
  entriesCount,
  updateEntry,
  deleteEntry,
  canAddEntry,
  allowAddEntry,
  handleAddEntry,
}: SidecarEntryProps) {
  const percentageError = commonError?.percentage || entry.percentage?.error;
  const priceError = commonError?.price || entry.price?.error;
  const sizeError = displayMode === "percentage" ? percentageError : entry.sizeUsd?.error;

  const isIncrease = entry.order && isIncreaseOrderType(entry.order.orderType);
  const isLong = entry.order?.isLong;

  const priceTooltipMsg =
    indexToken &&
    entry.price?.value &&
    entry.sizeUsd?.value &&
    `${isIncrease ? "Increase" : "Decrease"} ${getTokenVisualMultiplier(indexToken)}${
      indexToken.baseSymbol || indexToken.symbol
    } ${isLong ? "Long" : "Short"} by ${formatUsd(entry.sizeUsd.value)} at ${formatUsdPrice(
      entry.price.value ?? undefined,
      {
        visualMultiplier: indexToken.visualMultiplier,
      }
    )}.`;

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

  const isSmallMobile = useMedia("(max-width: 375px)");

  return (
    <div
      className={cx("flex flex-row", {
        "gap-10": !isSmallMobile,
        "gap-4": isSmallMobile,
      })}
      key={entry.id}
    >
      <TooltipWithPortal
        disabled={!priceError}
        content={priceError}
        tooltipClassName="!min-w-[25rem]"
        position="top-end"
        disableHandleStyle
      >
        <div
          className={cx("group relative rounded-4 border border-solid bg-slate-700 pl-5 leading-1 ", {
            "border-red-500": !!priceError,
            "border-slate-700": !priceError,
            "focus-within:border-cold-blue-500": !priceError,
            "hover:border-cold-blue-700": !priceError,
            "hover:focus-within:border-cold-blue-500": !priceError,
          })}
        >
          <span className="cursor-pointer text-slate-100">$</span>

          <NumberInput
            value={entry.price.input}
            onValueChange={onPriceValueChange}
            placeholder="Price"
            className={cx("SideOrderInput rounded-4 py-2 pr-5 text-right text-14", {
              "max-w-60": isSmallMobile,
              "max-w-90": !isSmallMobile,
            })}
          />
        </div>
      </TooltipWithPortal>
      {displayMode === "percentage" && (
        <div className="group relative">
          <TooltipWithPortal
            disabled={!sizeTooltipMsg}
            content={sizeTooltipMsg}
            tooltipClassName="!min-w-[25rem]"
            position="top-end"
            disableHandleStyle
          >
            <SuggestionInput
              isError={!!percentageError}
              inputClassName="w-48"
              value={entry.percentage?.input ?? ""}
              setValue={onPercentageSetValue}
              placeholder="Size"
              suggestionList={SUGGESTION_PERCENTAGE_LIST}
              symbol="%"
            />
          </TooltipWithPortal>
        </div>
      )}
      {displayMode === "sizeUsd" && (
        <div
          className={cx("group relative rounded-4 border border-solid bg-slate-700 pl-5 leading-1 ", {
            "border-red-500": !!sizeError,
            "border-slate-700": !sizeError,
            "focus-within:border-cold-blue-500": !sizeError,
            "hover:border-cold-blue-700": !sizeError,
            "hover:focus-within:border-cold-blue-500": !sizeError,
          })}
        >
          <span className="cursor-pointer text-slate-100">$</span>
          <TooltipWithPortal
            disabled={!sizeTooltipMsg}
            content={sizeTooltipMsg}
            tooltipClassName="!min-w-[25rem]"
            position="top-end"
            disableHandleStyle
          >
            <NumberInput
              value={entry.sizeUsd.input ?? ""}
              onValueChange={onSizeUsdValueChange}
              placeholder="Size"
              className="w-81 rounded-4 py-2 pr-5 text-right text-14"
            />
          </TooltipWithPortal>
        </div>
      )}

      <div className="flex h-full items-center gap-5">
        {canAddEntry && (
          <EntryButton onClick={handleAddEntry} disabled={!allowAddEntry} className="bg-green-500/15">
            <FaPlus color="#5EC989" />
          </EntryButton>
        )}
        <EntryButton
          onClick={onDeleteEntry}
          disabled={entriesCount === 1 && !entry.percentage && !entry.price}
          className="bg-red-500/15"
        >
          <FaPlus color="#E74E5D" className="rotate-45" />
        </EntryButton>
      </div>
    </div>
  );
}

function EntryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center rounded-4 border-none p-5 opacity-70",
        "hover:opacity-100 disabled:hover:opacity-70",
        "disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}

type SidecarEntriesProps = {
  entriesInfo: SidecarOrderEntryGroup;
  displayMode: "percentage" | "sizeUsd";
};

export function SideOrderEntries({ entriesInfo, displayMode }: SidecarEntriesProps) {
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const { addEntry, updateEntry, canAddEntry, allowAddEntry, deleteEntry } = entriesInfo;
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAddEntry = useCallback(() => {
    addEntry();
    requestAnimationFrame(() => {
      const inputs = containerRef.current?.querySelectorAll(".SideOrderInput");
      (inputs && (inputs[inputs.length - 1] as HTMLInputElement))?.focus();
    });
  }, [addEntry, containerRef]);

  const displayableEntries = useMemo(
    () => entriesInfo.entries.filter((entry) => entry.txnType !== "cancel"),
    [entriesInfo]
  );

  return (
    <div className="grid gap-y-3" ref={containerRef}>
      {displayableEntries?.map((entry) => (
        <SideOrderEntry
          key={entry.id}
          entry={entry}
          commonError={entriesInfo.error}
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
