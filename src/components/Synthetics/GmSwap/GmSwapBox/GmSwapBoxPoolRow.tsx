import { t } from "@lingui/macro";
import values from "lodash/values";
import { useCallback } from "react";

import { selectChainId, selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvInfo, GlvOrMarketInfo, MarketInfo, getGlvOrMarketAddress } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { GmPoolsSelectorForGlvMarket } from "components/MarketSelector/GmPoolsSelectorForGlvMarket";
import { PoolSelector } from "components/MarketSelector/PoolSelector";

export function GmSwapBoxPoolRow({
  indexName,
  marketAddress,
  marketTokensData,
  isDeposit,
  glvInfo,
  selectedMarketForGlv,
  disablePoolSelector,
  onMarketChange,
}: {
  indexName: string | undefined;
  marketAddress: string | undefined;
  marketTokensData: TokensData | undefined;
  isDeposit: boolean;
  glvInfo: GlvInfo | undefined;
  selectedMarketForGlv?: string;
  disablePoolSelector?: boolean;
  onMarketChange: (marketAddress: string) => void;
}) {
  const chainId = useSelector(selectChainId);
  const markets = values(useSelector(selectGlvAndMarketsInfoData));

  const onSelectMarket = useCallback(
    (marketInfo: MarketInfo) => {
      onMarketChange?.(marketInfo.marketTokenAddress);
    },
    [onMarketChange]
  );

  const onSelectMarketOrGlv = useCallback(
    (glvOrMarketInfo: GlvOrMarketInfo) => {
      onMarketChange(getGlvOrMarketAddress(glvOrMarketInfo));
    },
    [onMarketChange]
  );

  return (
    <ExchangeInfo.Group>
      <ExchangeInfoRow
        className="SwapBox-info-row"
        label={t`Pool`}
        value={
          glvInfo ? (
            <GmPoolsSelectorForGlvMarket
              chainId={chainId}
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
              favoriteKey="gm-pool-selector"
            />
          ) : (
            <PoolSelector
              chainId={chainId}
              label={t`Pool`}
              className="-mr-4"
              selectedIndexName={indexName}
              selectedMarketAddress={marketAddress}
              markets={markets}
              marketTokensData={marketTokensData}
              isSideMenu
              showBalances
              withFilters={false}
              onSelectMarket={onSelectMarketOrGlv}
              favoriteKey="gm-pool-selector"
            />
          )
        }
      />
    </ExchangeInfo.Group>
  );
}
