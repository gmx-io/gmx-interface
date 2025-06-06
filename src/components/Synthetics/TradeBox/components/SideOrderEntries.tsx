import { useCallback, useMemo, useRef } from "react";
import { FaPlus } from "react-icons/fa6";
import { useMedia } from "react-use";

import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isIncreaseOrderType } from "domain/synthetics/orders";
import { SidecarOrderEntry, SidecarOrderEntryGroup } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { TokenData } from "domain/synthetics/tokens";
import { formatUsd, formatUsdPrice } from "lib/numbers";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

import { NUMBER_WITH_TWO_DECIMALS } from "components/PercentageInput/PercentageInput";
import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { EntryButton } from "./EntryButton";

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
    (value) => {
      updateEntry(entry.id, "price", value);
    },
    [updateEntry, entry.id]
  );

  const onSizeUsdValueChange = useCallback(
    (value) => {
      updateEntry(entry.id, "sizeUsd", value);
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
    <div className="flex flex-row gap-4" key={entry.id}>
      <TooltipWithPortal
        disabled={!priceError}
        content={priceError}
        tooltipClassName="!min-w-[25rem]"
        position="top-end"
        disableHandleStyle
      >
        <SuggestionInput
          label="$"
          isError={!!priceError}
          className="w-88"
          value={entry.price.input}
          setValue={onPriceValueChange}
          placeholder="Price"
        />
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
              className="w-64"
              value={entry.percentage?.input ?? ""}
              setValue={onPercentageSetValue}
              suggestionList={SUGGESTION_PERCENTAGE_LIST}
              placeholder="Size"
              symbol="%"
            />
          </TooltipWithPortal>
        </div>
      )}
      {displayMode === "sizeUsd" && (
        <TooltipWithPortal
          disabled={!sizeTooltipMsg}
          content={sizeTooltipMsg}
          tooltipClassName="!min-w-[25rem]"
          position="top-end"
          disableHandleStyle
        >
          <SuggestionInput
            isError={!!sizeError}
            className="w-81"
            value={entry.sizeUsd.input ?? ""}
            setValue={onSizeUsdValueChange}
            placeholder="Size"
            label="$"
          />
        </TooltipWithPortal>
      )}

      <EntryButton
        onClick={onDeleteEntry}
        disabled={entriesCount === 1 && !entry.percentage && !entry.price}
        theme="red"
      >
        <FaPlus className="rotate-45" />
      </EntryButton>
    </div>
  );
}

type SidecarEntriesProps = {
  entriesInfo: SidecarOrderEntryGroup;
  displayMode: "percentage" | "sizeUsd";
};

export function SideOrderEntries({ entriesInfo, displayMode }: SidecarEntriesProps) {
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const { updateEntry, deleteEntry } = entriesInfo;
  const containerRef = useRef<HTMLDivElement>(null);

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
        />
      ))}
    </div>
  );
}
