import { t } from "@lingui/macro";
import values from "lodash/values";

import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import { TokensData } from "domain/synthetics/tokens";
import { useGmTokensFavorites } from "domain/synthetics/tokens/useGmTokensFavorites";
import { GmSwapFees } from "domain/synthetics/trade";

import { showMarketToast } from "../showMarketToast";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import { GmFees } from "components/Synthetics/GmSwap/GmFees/GmFees";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";
import { HighPriceImpactRow } from "../HighPriceImpactRow";

export function InfoRows({
  indexName,
  marketAddress,
  marketTokensData,
  isDeposit,
  fees,
  executionFee,
  isHighPriceImpact,
  isHighPriceImpactAccepted,
  setIsHighPriceImpactAccepted,
  isSingle,
  onMarketChange,
}: {
  indexName: string | undefined;
  marketAddress: string | undefined;
  marketTokensData: TokensData | undefined;
  isDeposit: boolean;
  fees: GmSwapFees | undefined;
  executionFee: ExecutionFee | undefined;
  isHighPriceImpact: boolean;
  isHighPriceImpactAccepted: boolean;
  setIsHighPriceImpactAccepted: (val: boolean) => void;
  isSingle: boolean;
  onMarketChange: (marketAddress: string) => void;
}) {
  const gmTokenFavoritesContext = useGmTokensFavorites();
  const markets = values(useSelector(selectMarketsInfoData));

  return (
    <ExchangeInfo className="GmSwapBox-info-section" dividerClassName="App-card-divider">
      <ExchangeInfo.Group>
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Pool`}
          value={
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
