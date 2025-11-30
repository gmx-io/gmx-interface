import { t } from "@lingui/macro";

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

export function MarketPoolSelectorRow() {
  const { relatedMarketStats, relatedMarketsPositionStats } = useSelector(selectTradeboxRelatedMarketsStats);
  const { marketAddress, setMarketAddress } = useSelector(selectTradeboxState);
  const tradeType = useSelector(selectTradeboxTradeType);
  const marketsInfoData = useSelector(selectMarketsInfoData);

  const selectedMarket = marketAddress ? getByKey(marketsInfoData, marketAddress) : undefined;
  const poolName = selectedMarket ? getMarketPoolName(selectedMarket) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <BlockField
        label={t`Pool`}
        content={
          <PoolSelector2
            selectedPoolName={poolName}
            options={relatedMarketStats}
            tradeType={tradeType}
            positionStats={relatedMarketsPositionStats}
            onSelect={setMarketAddress}
            handleClassName="text-12"
            chevronClassName="w-10"
          />
        }
      />
    </div>
  );
}
