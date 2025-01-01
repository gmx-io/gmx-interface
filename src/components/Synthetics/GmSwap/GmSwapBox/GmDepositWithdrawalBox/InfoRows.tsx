import { t } from "@lingui/macro";
import values from "lodash/values";
import { useCallback } from "react";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { GmPoolsSelectorForGlvMarket } from "components/MarketSelector/GmPoolsSelectorForGlvMarket";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import { GmFees } from "components/Synthetics/GmSwap/GmFees/GmFees";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";

import { selectChainId, selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";

import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import { getGlvOrMarketAddress, GlvInfo, GlvOrMarketInfo, MarketInfo } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import { GmSwapFees } from "domain/synthetics/trade";

import { GmSwapWarningsRow } from "../GmSwapWarningsRow";
import { showMarketToast } from "../showMarketToast";
import { Operation } from "../types";

export function InfoRows({
  indexName,
  marketAddress,
  marketTokensData,
  isDeposit,
  fees,
  executionFee,
  glvInfo,
  isSingle,
  selectedMarketForGlv,
  disablePoolSelector,
  onMarketChange,

  shouldShowWarning,
  shouldShowWarningForPosition,
  shouldShowWarningForExecutionFee,
  isAccepted,
  setIsAccepted,
}: {
  indexName: string | undefined;
  marketAddress: string | undefined;
  marketTokensData: TokensData | undefined;
  isDeposit: boolean;
  fees: GmSwapFees | undefined;
  executionFee: ExecutionFee | undefined;
  glvInfo: GlvInfo | undefined;
  isSingle: boolean;
  selectedMarketForGlv?: string;
  disablePoolSelector?: boolean;
  onMarketChange: (marketAddress: string) => void;

  shouldShowWarning: boolean;
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForExecutionFee: boolean;
  isAccepted: boolean;
  setIsAccepted: (val: boolean) => void;
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
      showMarketToast(glvOrMarketInfo);
    },
    [onMarketChange]
  );

  return (
    <ExchangeInfo className="GmSwapBox-info-section" dividerClassName="App-card-divider">
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

      <ExchangeInfo.Group>
        <div className="GmSwapBox-info-section">
          <GmFees
            operation={isDeposit ? Operation.Deposit : Operation.Withdrawal}
            totalFees={fees?.totalFees}
            swapFee={fees?.swapFee}
            swapPriceImpact={fees?.swapPriceImpact}
            uiFee={fees?.uiFee}
          />
          <NetworkFeeRow executionFee={executionFee} />
        </div>
      </ExchangeInfo.Group>

      <GmSwapWarningsRow
        isSingle={isSingle}
        isAccepted={isAccepted}
        shouldShowWarning={shouldShowWarning}
        shouldShowWarningForPosition={shouldShowWarningForPosition}
        shouldShowWarningForExecutionFee={shouldShowWarningForExecutionFee}
        setIsAccepted={setIsAccepted}
      />
    </ExchangeInfo>
  );
}
