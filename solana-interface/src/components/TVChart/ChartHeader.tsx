import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useState } from "react";

import { SOLANA_USD_DECIMALS, USD_DECIMALS } from "config/factors";
import { formatAmountHuman, formatRatePercentage, formatUsdPrice } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";

import { renderNetFeeHeaderTooltipContent } from "components/MarketsList/NetFeeHeaderTooltipContent";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import DocsIcon from "img/docs.svg?react";
import LongIcon from "img/long.svg?react";
import ShortIcon from "img/short.svg?react";

import ChartTokenSelectorSolana, { type SolanaMarketItem } from "../ChartTokenSelector/ChartTokenSelectorSolana";
import { NetRate1hTooltip } from "./components/NetRate1hTooltip";
import { OpenInterestTooltip } from "./components/OpenInterestTooltip";


const ChartHeaderItem = ({ label, value }: { label: ReactNode; value: ReactNode }) => {
  return (
    <div className="flex flex-col justify-center gap-2">
      <div className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.08em] text-typography-secondary">
        {label}
      </div>
      <div className="text-body-medium numbers">{value}</div>
    </div>
  );
};

const ChartHeaderMobileItem = ({ label, value }: { label: ReactNode; value: ReactNode }) => {
  return (
    <div className="flex flex-col gap-8 text-12 leading-[1.25]">
      <div className="font-medium capitalize text-typography-secondary">{label}</div>
      <div className="flex items-center text-typography-primary numbers">{value}</div>
    </div>
  );
};

type ChartHeaderProps = {
  solanaIndexTokenAddress?: string;
  onSolanaIndexTokenChange?: (address: string, symbol: string) => void;
};

function ChartHeaderSolana({ solanaIndexTokenAddress, onSolanaIndexTokenChange }: ChartHeaderProps) {
  const { isMobile } = useBreakpoints();
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [items, setItems] = useState<SolanaMarketItem[]>([]);
  const [localSelectedAddress, setLocalSelectedAddress] = useState<string>();
  const selectedAddress = solanaIndexTokenAddress ?? localSelectedAddress;
  const selectedItem = selectedAddress
    ? items.find((item) => item.token.address === selectedAddress)
    : items.find((item) => item.token.symbol === "SOL");
  const formatValue = (value: bigint | undefined) =>
    value === undefined ? "-" : formatAmountHuman(value, SOLANA_USD_DECIMALS, true);
  const delta = selectedItem?.dayPriceDelta;
  // formatRatePercentage expects USD_DECIMALS precision, Solana rates use SOLANA_USD_DECIMALS
  const formatNetRate = (value: bigint | undefined) =>
    value === undefined ? "..." : formatRatePercentage(value * 10n ** BigInt(USD_DECIMALS - SOLANA_USD_DECIMALS));
  const netRateLabel = (
    <TooltipWithPortal variant="none" renderContent={renderNetFeeHeaderTooltipContent}>
      <Trans>Net rate / 1h</Trans>
    </TooltipWithPortal>
  );
  const netRateLong = (
    <span className="flex flex-row items-center gap-4 numbers">
      <LongIcon width={12} className="relative top-1" />
      {formatNetRate(selectedItem?.netRateLong)}
    </span>
  );
  const netRateShort = (
    <span className="flex flex-row items-center gap-4 numbers">
      <ShortIcon width={12} />
      {formatNetRate(selectedItem?.netRateShort)}
    </span>
  );
  const openInterestTooltip = (
    <OpenInterestTooltip
      openInterestLong={selectedItem?.openInterestLong}
      openInterestShort={selectedItem?.openInterestShort}
    />
  );
  const netRate1hTooltip = (
    <NetRate1hTooltip
      fundingRateLong={selectedItem?.fundingRateLong}
      fundingRateShort={selectedItem?.fundingRateShort}
      borrowingRateLong={selectedItem?.borrowingRateLong}
      borrowingRateShort={selectedItem?.borrowingRateShort}
    />
  );

  const handleSelect = (address: string) => {
    const item = items.find((item) => item.token.address === address);
    if (!item) return;
    if (onSolanaIndexTokenChange) {
      onSolanaIndexTokenChange(address, item.token.symbol);
    } else {
      setLocalSelectedAddress(address);
    }
  };

  if (isMobile) {
    return (
      <div className="rounded-8 bg-button-secondary">
        <div className="flex items-start justify-between max-md:items-center">
          <div className="inline-flex">
            <ChartTokenSelectorSolana
              selectedToken={selectedItem?.token}
              oneRowLabels={false}
              onSelect={handleSelect}
              onItemsChange={setItems}
            />
          </div>

          <div
            className="flex cursor-pointer flex-row items-start gap-8 p-8"
            role="button"
            onClick={() => setDetailsVisible((prev) => !prev)}
          >
            <div className="flex flex-col items-end gap-2">
              <div className="mr-4 text-14 leading-[1.25] numbers">
                {selectedItem?.tokenData
                  ? formatUsdPrice(selectedItem.tokenData.prices.minPrice, { isSolana: true })
                  : "-"}
              </div>
              <div
                className={cx("ExchangeChart-daily-change text-12 leading-[1.25] numbers", {
                  "text-green-500": delta && delta.deltaPercentage > 0,
                  "text-red-500": delta && delta.deltaPercentage < 0,
                })}
              >
                {delta?.deltaPercentageStr ?? "-"}
              </div>
            </div>
            <span className="shrink-0 cursor-pointer rounded-full border-1/2 border-slate-600 p-8 text-typography-secondary">
              <DocsIcon className="size-16" />
            </span>
          </div>
        </div>

        {detailsVisible ? (
          <div className="border-t-1/2 border-t-slate-600 p-16">
            <div className="flex flex-wrap gap-16 min-[440px]:grid min-[440px]:grid-cols-2">
              <ChartHeaderMobileItem label={<Trans>24h volume</Trans>} value={formatValue(selectedItem?.dayVolume)} />
              <ChartHeaderMobileItem
                label={<Trans>Open interest</Trans>}
                value={
                  <TooltipWithPortal
                    variant="none"
                    as="div"
                    className="flex items-center gap-8"
                    position="bottom-end"
                    content={openInterestTooltip}
                  >
                    <span className="text-green-500 numbers">{formatValue(selectedItem?.openInterestLong)}</span>
                    <span className="text-typography-inactive">/</span>
                    <span className="text-red-500 numbers">{formatValue(selectedItem?.openInterestShort)}</span>
                  </TooltipWithPortal>
                }
              />
              <ChartHeaderMobileItem
                label={<Trans>Available liquidity</Trans>}
                value={
                  <div className="flex items-center gap-8">
                    <span className="numbers">{formatValue(selectedItem?.longLiquidity)}</span>
                    <span className="text-typography-inactive">/</span>
                    <span className="numbers">{formatValue(selectedItem?.shortLiquidity)}</span>
                  </div>
                }
              />
              <ChartHeaderMobileItem
                label={netRateLabel}
                value={
                  <TooltipWithPortal
                    variant="none"
                    as="div"
                    className="flex items-center gap-8"
                    position="bottom-end"
                    content={netRate1hTooltip}
                  >
                    <div className="flex items-center gap-4 numbers">{netRateLong}</div>
                    <span className="text-typography-inactive">/</span>
                    <div className="flex items-center gap-4 numbers">{netRateShort}</div>
                  </TooltipWithPortal>
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-16">
      <ChartTokenSelectorSolana
        selectedToken={selectedItem?.token}
        oneRowLabels={true}
        onSelect={handleSelect}
        onItemsChange={setItems}
      />
      <div className="flex flex-col justify-center gap-2 numbers">
        <div className="text-body-medium">
          {selectedItem?.tokenData
            ? formatUsdPrice(selectedItem.tokenData.prices.minPrice, { isSolana: true })
            : "-"}
        </div>
        <div className={cx("text-body-small", {
          "text-green-500": delta && delta.deltaPercentage > 0,
          "text-red-500": delta && delta.deltaPercentage < 0,
        })}>
          {delta?.deltaPercentageStr ?? "-"}
        </div>
      </div>
      <ChartHeaderItem label={<Trans>24h volume</Trans>} value={formatValue(selectedItem?.dayVolume)} />
      <ChartHeaderItem
        label={<Trans>Open interest</Trans>}
        value={
          <TooltipWithPortal variant="none" as="div" position="bottom-end" content={openInterestTooltip}>
            <span className="text-green-500">{formatValue(selectedItem?.openInterestLong)}</span>
            {" / "}
            <span className="text-red-500">{formatValue(selectedItem?.openInterestShort)}</span>
          </TooltipWithPortal>
        }
      />
      <ChartHeaderItem
        label={<Trans>Available liquidity</Trans>}
        value={`${formatValue(selectedItem?.longLiquidity)} / ${formatValue(selectedItem?.shortLiquidity)}`}
      />
      <ChartHeaderItem
        label={netRateLabel}
        value={
          <TooltipWithPortal
            variant="none"
            as="div"
            className="Chart-header-value flex flex-row items-center gap-8"
            position="bottom-end"
            content={netRate1hTooltip}
          >
            <div className="flex items-center gap-4">
              <div className="numbers">{netRateLong}</div>
              <span className="text-typography-inactive">/</span>
              <div className="numbers">{netRateShort}</div>
            </div>
          </TooltipWithPortal>
        }
      />
    </div>
  );
}

export default function ChartHeader(props: ChartHeaderProps) {

  return <ChartHeaderSolana {...props} />;
}
