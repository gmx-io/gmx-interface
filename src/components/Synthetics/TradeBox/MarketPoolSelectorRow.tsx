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

import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";

import { PoolSelector2 } from "../PoolSelector2/PoolSelector2";
import { TradeboxPoolWarnings } from "../TradeboxPoolWarnings/TradeboxPoolWarnings";

export function MarketPoolSelectorRow() {
  const { relatedMarketStats, relatedMarketsPositionStats } = useSelector(selectTradeboxRelatedMarketsStats);
  const { marketAddress, setMarketAddress } = useSelector(selectTradeboxState);
  const tradeType = useSelector(selectTradeboxTradeType);
  const marketsInfoData = useSelector(selectMarketsInfoData);

  const selectedMarket = marketAddress ? getByKey(marketsInfoData, marketAddress) : undefined;
  const poolName = selectedMarket ? getMarketPoolName(selectedMarket) : undefined;

  return (
    <>
      <SyntheticsInfoRow
        label={t`Pool`}
        value={
          <>
            <PoolSelector2
              selectedPoolName={poolName}
              options={relatedMarketStats}
              tradeType={tradeType}
              positionStats={relatedMarketsPositionStats}
              onSelect={setMarketAddress}
            />
          </>
        }
      />

      <TradeboxPoolWarnings />
    </>
  );
}
