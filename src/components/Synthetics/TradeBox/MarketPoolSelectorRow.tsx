import { t } from "@lingui/macro";

import { useTradeboxTradeType } from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { selectTradeboxRelatedMarketsStats } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { type MarketInfo, getMarketPoolName } from "domain/synthetics/markets";
import type { Token } from "domain/tokens";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { TradeboxPoolWarnings } from "../TradeboxPoolWarnings/TradeboxPoolWarnings";
import { PoolSelector2 } from "../PoolSelector2/PoolSelector2";

export type Props = {
  indexToken?: Token;
  selectedMarket?: MarketInfo;
  isOutPositionLiquidity?: boolean;
  currentPriceImpactBps?: bigint;
  onSelectMarketAddress: (marketAddress?: string) => void;
};

export function MarketPoolSelectorRow(p: Props) {
  const { selectedMarket, onSelectMarketAddress } = p;
  const { relatedMarketStats, relatedMarketsPositionStats } = useSelector(selectTradeboxRelatedMarketsStats);
  const tradeType = useTradeboxTradeType();

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
              onSelect={onSelectMarketAddress}
            />
          </>
        }
      />

      <TradeboxPoolWarnings />
    </>
  );
}
