import { t } from "@lingui/macro";

import { selectTradeboxAvailableMarketsOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { MarketInfo, getMarketIndexName } from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import { EMPTY_ARRAY } from "lib/objects";
import { TradeboxPoolWarnings } from "../TradeboxPoolWarnings/TradeboxPoolWarnings";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { PoolSelector } from "components/MarketSelector/PoolSelector";

export type Props = {
  indexToken?: Token;
  selectedMarket?: MarketInfo;
  isOutPositionLiquidity?: boolean;
  currentPriceImpactBps?: bigint;
  onSelectMarketAddress: (marketAddress?: string) => void;
};

export function MarketPoolSelectorRow(p: Props) {
  const { selectedMarket, indexToken, onSelectMarketAddress } = p;
  const marketsOptions = useSelector(selectTradeboxAvailableMarketsOptions);
  const { availableMarkets } = marketsOptions || {};
  const indexName = indexToken ? getMarketIndexName({ indexToken, isSpotOnly: false }) : undefined;

  return (
    <>
      <ExchangeInfoRow
        className="SwapBox-info-row"
        label={t`Pool`}
        value={
          <>
            <PoolSelector
              label={t`Pool`}
              className="SwapBox-info-dropdown"
              selectedIndexName={indexName}
              selectedMarketAddress={selectedMarket?.marketTokenAddress}
              markets={availableMarkets || EMPTY_ARRAY}
              isSideMenu
              onSelectMarket={(marketInfo) => onSelectMarketAddress(marketInfo.marketTokenAddress)}
            />
          </>
        }
      />

      <TradeboxPoolWarnings />
    </>
  );
}
