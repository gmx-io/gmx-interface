import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { MarketPoolSelector } from '@/components/Selectors/MarketPoolSelector';
import { TradeboxPoolWarnings } from '@/components/TradeBox/components/TradeboxPoolWarnings';
import { MarketInfo } from '@/selectors/market/types';
import { Token } from '@/selectors/token/types';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { selectTradeboxTradeType } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxRelatedMarketsStats } from '@/selectors/tradebox/selectTradeboxRelatedMarketsStats';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';

type Props = {
  indexToken?: Token;
  selectedMarket?: MarketInfo;
  isOutPositionLiquidity?: boolean;
  currentPriceImpactBps?: number;
  onSelectMarketAddress: (marketAddress?: string) => void;
};

export function MarketPoolSelectorRow(p: Props) {
  const { selectedMarket, onSelectMarketAddress } = p;
  const tradeType = useAppStore(selectTradeboxTradeType);
  const { relatedMarketStats, relatedMarketsPositionStats } = useAppStore(
    selectTradeboxRelatedMarketsStats
  );
  const poolName = selectedMarket
    ? getMarketPoolName(selectedMarket)
    : undefined;

  return (
    <>
      <ExchangeInfoRow
        className="SwapBox-info-row"
        label={t`Pool`}
        value={
          <>
            <MarketPoolSelector
              selectedPoolName={poolName}
              options={relatedMarketStats}
              positionStats={relatedMarketsPositionStats}
              tradeType={tradeType}
              onSelect={(marketAddress) => onSelectMarketAddress(marketAddress)}
            />
          </>
        }
      />
      <TradeboxPoolWarnings />
    </>
  );
}
