import { Trans, t } from "@lingui/macro";
import values from "lodash/values";
import { useCallback } from "react";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GmPoolsSelectorForGlvMarket } from "components/MarketSelector/GmPoolsSelectorForGlvMarket";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import { GmFees } from "components/Synthetics/GmSwap/GmFees/GmFees";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";

import { selectChainId, selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";

import { ARBITRUM } from "config/chains";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import { GlvInfo, GlvOrMarketInfo, MarketInfo } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import { useGmTokensFavorites } from "domain/synthetics/tokens/useGmTokensFavorites";
import { GmSwapFees } from "domain/synthetics/trade";

import { HighPriceImpactRow } from "../HighPriceImpactRow";
import { showMarketToast } from "../showMarketToast";

// TODO: midas, https://app.asana.com/0/1206524620304500/1208269257416079
// Remove this when Chainlink fixes the issue
const ENDANGERED_POOLS = {
  [ARBITRUM]: ["0x0Cf1fb4d1FF67A3D8Ca92c9d6643F8F9be8e03E5", "0xb56E5E2eB50cf5383342914b0C85Fe62DbD861C8"],
};

export function InfoRows({
  indexName,
  marketAddress,
  marketTokensData,
  isDeposit,
  fees,
  executionFee,
  glvInfo,
  isHighPriceImpact,
  isHighPriceImpactAccepted,
  setIsHighPriceImpactAccepted,
  isSingle,
  onMarketChange,
  selectedMarketForGlv,
  disablePoolSelector,
}: {
  indexName: string | undefined;
  marketAddress: string | undefined;
  marketTokensData: TokensData | undefined;
  isDeposit: boolean;
  fees: GmSwapFees | undefined;
  executionFee: ExecutionFee | undefined;
  glvInfo: GlvInfo | undefined;
  isHighPriceImpact: boolean;
  isHighPriceImpactAccepted: boolean;
  setIsHighPriceImpactAccepted: (val: boolean) => void;
  isSingle: boolean;
  onMarketChange: (marketAddress: string) => void;
  selectedMarketForGlv?: string;
  disablePoolSelector?: boolean;
}) {
  const chainId = useSelector(selectChainId);
  const gmTokenFavoritesContext = useGmTokensFavorites();
  const markets = values(useSelector(selectGlvAndMarketsInfoData));

  const onSelectMarket = useCallback(
    (marketInfo: MarketInfo) => {
      onMarketChange?.(marketInfo.marketTokenAddress);
    },
    [onMarketChange]
  );

  const onSelectMarketOrGlv = useCallback(
    (glvOrMarketInfo: GlvOrMarketInfo) => {
      onMarketChange(glvOrMarketInfo.marketTokenAddress);
      showMarketToast(glvOrMarketInfo);
    },
    [onMarketChange]
  );

  const isEndangeredPool = ENDANGERED_POOLS[chainId]?.includes(marketAddress);

  return (
    <ExchangeInfo className="GmSwapBox-info-section" dividerClassName="App-card-divider">
      <ExchangeInfo.Group>
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Pool`}
          value={
            glvInfo ? (
              <GmPoolsSelectorForGlvMarket
                label={t`Pool`}
                className="-mr-4"
                isDeposit={isDeposit}
                selectedIndexName={indexName}
                selectedMarketAddress={selectedMarketForGlv}
                markets={markets}
                glvInfo={glvInfo}
                marketTokensData={marketTokensData}
                isSideMenu
                showAllPools
                showBalances
                disablePoolSelector={disablePoolSelector}
                onSelectMarket={onSelectMarket}
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
                onSelectMarket={onSelectMarketOrGlv}
                {...gmTokenFavoritesContext}
              />
            )
          }
        />

        {isEndangeredPool && (
          <AlertInfo type="info" textColor="text-yellow-500">
            <Trans>
              This pool currently has a 1% sell fee.{" "}
              <ExternalLink
                href="https://gov.gmx.io/t/wsteth-weth-market-temporarily-disabled/3823"
                className="!text-yellow-500"
              >
                <span className="hover:text-yellow-300">Read more</span>
              </ExternalLink>
              .
            </Trans>
          </AlertInfo>
        )}
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
