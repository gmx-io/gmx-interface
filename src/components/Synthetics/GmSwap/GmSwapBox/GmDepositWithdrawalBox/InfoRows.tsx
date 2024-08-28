import { t } from "@lingui/macro";
import values from "lodash/values";

import { selectAllMarketsData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import { TokensData } from "domain/synthetics/tokens";
import { useGmTokensFavorites } from "domain/synthetics/tokens/useGmTokensFavorites";
import { GmSwapFees } from "domain/synthetics/trade";

import { showMarketToast } from "../showMarketToast";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { GmPoolsSelector } from "components/MarketSelector/GmSelectorForGlv";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import { GmFees } from "components/Synthetics/GmSwap/GmFees/GmFees";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";
import { MarketInfo } from "domain/synthetics/markets";
import { GlvMarketInfo } from "@/domain/synthetics/tokens/useGlvMarkets";
import { useCallback } from "react";
import { isGlv } from "../../../../../domain/synthetics/markets/glv";
import { HighPriceImpactRow } from "../HighPriceImpactRow";

export function InfoRows({
  indexName,
  marketAddress,
  marketTokensData,
  isDeposit,
  fees,
  executionFee,
  marketInfo,
  isHighPriceImpact,
  isHighPriceImpactAccepted,
  setIsHighPriceImpactAccepted,
  isSingle,
  onMarketChange,
  onGmPoolChange,
  selectedGlvGmMarket,
}: {
  indexName: string | undefined;
  marketAddress: string | undefined;
  marketTokensData: TokensData | undefined;
  isDeposit: boolean;
  fees: GmSwapFees | undefined;
  executionFee: ExecutionFee | undefined;
  marketInfo: MarketInfo | GlvMarketInfo | undefined;
  isHighPriceImpact: boolean;
  isHighPriceImpactAccepted: boolean;
  setIsHighPriceImpactAccepted: (val: boolean) => void;
  isSingle: boolean;
  onMarketChange: (marketAddress: string) => void;
  onGmPoolChange?: (marketAddress: string) => void;
  selectedGlvGmMarket?: string;
}) {
  const gmTokenFavoritesContext = useGmTokensFavorites();
  const markets = values(useSelector(selectAllMarketsData));

  const onSelectGmMarket = useCallback(
    (marketInfo: MarketInfo) => {
      onGmPoolChange?.(marketInfo.marketTokenAddress);
    },
    [onGmPoolChange]
  );

  return (
    <ExchangeInfo className="GmSwapBox-info-section" dividerClassName="App-card-divider">
      <ExchangeInfo.Group>
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Pool`}
          value={
            marketInfo && isGlv(marketInfo) ? (
              <GmPoolsSelector
                label={t`Pool`}
                className="-mr-4"
                isDeposit={isDeposit}
                selectedIndexName={indexName}
                selectedMarketAddress={selectedGlvGmMarket}
                markets={markets}
                glvMarketInfo={marketInfo}
                marketTokensData={marketTokensData}
                isSideMenu
                showBalances
                onSelectGmMarket={onSelectGmMarket}
                {...gmTokenFavoritesContext}
              />
            ) : (
              <PoolSelector
                label={t`Pool`}
                className="-mr-4"
                selectedIndexName={indexName}
                selectedMarketAddress={marketAddress}
                markets={markets}
                marketTokensData={marketTokensData}
                isSideMenu
                showBalances
                onSelectMarket={(marketInfo) => {
                  onMarketChange(marketInfo.marketTokenAddress);
                  showMarketToast(marketInfo);
                }}
                {...gmTokenFavoritesContext}
              />
            )
          }
        />
      </ExchangeInfo.Group>

      <ExchangeInfo.Group>
        <div className="GmSwapBox-info-section">
          <GmFees
            isDeposit={isDeposit}
            totalFees={fees?.totalFees}
            swapFee={fees?.swapFee}
            swapPriceImpact={fees?.swapPriceImpact}
            uiFee={fees?.uiFee}
          />
          <NetworkFeeRow executionFee={executionFee} />
        </div>
      </ExchangeInfo.Group>

      {isHighPriceImpact && (
        <HighPriceImpactRow
          isHighPriceImpactAccepted={isHighPriceImpactAccepted}
          setIsHighPriceImpactAccepted={setIsHighPriceImpactAccepted}
          isSingle={isSingle}
        />
      )}
    </ExchangeInfo>
  );
}
