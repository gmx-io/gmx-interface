import { t } from "@lingui/macro";

import {
  selectTradeboxMarketAddress,
  selectTradeboxRelatedMarketsStats,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMarketPoolName } from "domain/synthetics/markets";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { PoolSelector2 } from "../PoolSelector2/PoolSelector2";
import { TradeboxPoolWarnings } from "../TradeboxPoolWarnings/TradeboxPoolWarnings";

import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { getByKey } from "lib/objects";
import { useBestMarketAddress } from "./hooks/useBestMarketAddress";

export function MarketPoolSelectorRow() {
  const { relatedMarketStats, relatedMarketsPositionStats } = useSelector(selectTradeboxRelatedMarketsStats);
  const marketAddress = useSelector(selectTradeboxMarketAddress);
  const tradeType = useSelector(selectTradeboxTradeType);
  const marketsInfoData = useSelector(selectMarketsInfoData);

  const { setMarketAddress } = useBestMarketAddress();

  const selectedMarket = marketAddress ? getByKey(marketsInfoData, marketAddress) : undefined;
  const poolName = selectedMarket ? getMarketPoolName(selectedMarket) : undefined;

  return (
    <>
      <ExchangeInfoRow
        className="SwapBox-info-row"
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
