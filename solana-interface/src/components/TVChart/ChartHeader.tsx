import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useState } from "react";

import { SOLANA_USD_DECIMALS } from "config/factors";
import { formatAmountHuman, formatUsdPrice } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";

import DocsIcon from "img/docs.svg?react";

import ChartTokenSelectorSolana, { type SolanaMarketItem } from "../ChartTokenSelector/ChartTokenSelectorSolana";

const MIN_FADE_AREA = 24; //px
const MAX_SCROLL_LEFT_TO_END_AREA = 50; //px
const MIN_SCROLL_END_SPACE = 5; // px


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

  return (
    <div className="flex flex-wrap items-center gap-16">
      <ChartTokenSelectorSolana
        selectedToken={selectedItem?.token}
        oneRowLabels={true}
        onSelect={(address) => {
          const item = items.find((item) => item.token.address === address);
          if (!item) return;
          if (onSolanaIndexTokenChange) {
            onSolanaIndexTokenChange(address, item.token.symbol);
          } else {
            setLocalSelectedAddress(address);
          }
        }}
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
          <>
            <span className="text-green-500">{formatValue(selectedItem?.openInterestLong)}</span>
            {" / "}
            <span className="text-red-500">{formatValue(selectedItem?.openInterestShort)}</span>
          </>
        }
      />
      <ChartHeaderItem
        label={<Trans>Available liquidity</Trans>}
        value={`${formatValue(selectedItem?.longLiquidity)} / ${formatValue(selectedItem?.shortLiquidity)}`}
      />
    </div>
  );
}

export default function ChartHeader(props: ChartHeaderProps) {

  return <ChartHeaderSolana {...props} />;
}
