import { t } from "@lingui/macro";
import { useRef } from "react";

import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxRelatedMarketsStats,
  selectTradeboxState,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMarketPoolName } from "domain/synthetics/markets";
import { getByKey } from "lib/objects";

import { BlockField } from "components/BlockField/BlockField";

import { PoolSelector2 } from "../PoolSelector2/PoolSelector2";

type Props = {
  disabled?: boolean;
};

export function MarketPoolSelectorField({ disabled }: Props = {}) {
  const { relatedMarketStats, relatedMarketsPositionStats } = useSelector(selectTradeboxRelatedMarketsStats);
  const { marketAddress, setMarketAddress } = useSelector(selectTradeboxState);
  const tradeType = useSelector(selectTradeboxTradeType);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const popoverReferenceRef = useRef<HTMLDivElement | null>(null);

  const selectedMarket = marketAddress ? getByKey(marketsInfoData, marketAddress) : undefined;
  const poolName = selectedMarket ? getMarketPoolName(selectedMarket) : undefined;

  return (
    <BlockField
      containerRef={popoverReferenceRef}
      forwardClickToSelector
      label={t`Pool`}
      className="group/selector-field"
      disabled={disabled}
      content={
        <PoolSelector2
          selectedPoolName={poolName}
          options={relatedMarketStats}
          tradeType={tradeType}
          positionStats={relatedMarketsPositionStats}
          onSelect={setMarketAddress}
          handleClassName="inline-block overflow-hidden text-ellipsis whitespace-nowrap text-12 group-gmx-hover/selector-field:text-blue-300"
          chevronClassName="w-12 text-typography-secondary max-lg:ml-4 group-gmx-hover/selector-field:text-blue-300"
          wrapperClassName="overflow-hidden"
          popoverReferenceRef={popoverReferenceRef}
          disabled={disabled}
        />
      }
    />
  );
}
