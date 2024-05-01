import { t } from "@lingui/macro";
import { BigNumber } from "ethers";

import { useTradeboxTradeType } from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { selectTradeboxAvailableMarketsOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { MarketInfo, getMarketPoolName } from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import { EMPTY_OBJECT } from "lib/objects";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { TradeboxPoolWarnings } from "../TradeboxPoolWarnings/TradeboxPoolWarnings";
import { NewPoolSelector } from "./NewPoolSelector";

export type Props = {
  indexToken?: Token;
  selectedMarket?: MarketInfo;
  isOutPositionLiquidity?: boolean;
  currentPriceImpactBps?: BigNumber;
  onSelectMarketAddress: (marketAddress?: string) => void;
};

export function MarketPoolSelectorRow(p: Props) {
  const { selectedMarket, onSelectMarketAddress } = p;
  const marketsOptions = useSelector(selectTradeboxAvailableMarketsOptions);
  const { availableMarketsOpenFees, availableIndexTokenStat } = marketsOptions || {};
  const tradeType = useTradeboxTradeType();

  const poolName = selectedMarket ? getMarketPoolName(selectedMarket) : undefined;

  return (
    <>
      <ExchangeInfoRow
        className="SwapBox-info-row"
        label={t`Pool`}
        value={
          <>
            <NewPoolSelector
              selectedPoolName={poolName}
              options={availableIndexTokenStat?.marketsStats}
              tradeType={tradeType}
              openFees={availableMarketsOpenFees || EMPTY_OBJECT}
              onSelect={onSelectMarketAddress}
            />
          </>
        }
      />

      <TradeboxPoolWarnings />
    </>
  );
}
