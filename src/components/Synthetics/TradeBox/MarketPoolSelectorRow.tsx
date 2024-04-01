import { t } from "@lingui/macro";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import { AvailableMarketsOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { getMarketIndexName, MarketInfo } from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { EMPTY_ARRAY } from "lib/objects";
import { TradeboxPoolWarnings } from "../TradeboxPoolWarnings/TradeboxPoolWarnings";

export type Props = {
  indexToken?: Token;
  selectedMarket?: MarketInfo;
  marketsOptions?: AvailableMarketsOptions;
  hasExistingPosition?: boolean;
  hasExistingOrder?: boolean;
  isOutPositionLiquidity?: boolean;
  currentPriceImpactBps?: BigNumber;
  onSelectMarketAddress: (marketAddress?: string) => void;
};

export function MarketPoolSelectorRow(p: Props) {
  const { selectedMarket, indexToken, marketsOptions, onSelectMarketAddress } = p;

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
