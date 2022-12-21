import { t } from "@lingui/macro";
import { InfoRow } from "components/InfoRow/InfoRow";
import {
  getMarket,
  getMarketName,
  getMarketPoolData,
  useMarketsData,
  useMarketsPoolsData,
} from "domain/synthetics/markets";
import {
  formatTokenAmountWithUsd,
  getTokenData,
  getUsdFromTokenAmount,
  useAvailableTradeTokensData,
} from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";

export type Props = {
  swapPath?: string[];
  marketAddress?: string;
  toTokenAddress?: string;
  fromTokenAddress?: string;
  indexTokenAddress?: string;
  isLong: boolean;
  isSwap: boolean;
};

export function MarketCard(p: Props) {
  const { chainId } = useChainId();

  const marketsData = useMarketsData(chainId);
  const poolsData = useMarketsPoolsData(chainId);
  const tokensData = useAvailableTradeTokensData(chainId);

  const market = getMarket(marketsData, p.marketAddress || p.swapPath?.[p.swapPath.length - 1]);
  const marketName = getMarketName(marketsData, tokensData, market?.marketTokenAddress);

  const pools = getMarketPoolData(poolsData, market?.marketTokenAddress);

  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);

  const longPoolAmount = pools?.longPoolAmount;

  const shortPoolAmount = pools?.shortPoolAmount;

  const longPoolAmountUsd = getUsdFromTokenAmount(tokensData, market?.longTokenAddress, longPoolAmount);

  const shortPoolAmountUsd = getUsdFromTokenAmount(tokensData, market?.shortTokenAddress, shortPoolAmount);

  function getTitle() {
    if (p.isSwap) {
      const toToken = getTokenData(tokensData, p.toTokenAddress);
      if (toToken) {
        return t`Swap to ${toToken?.symbol}`;
      }

      return t`Swap`;
    }

    const positionTypeText = p.isLong ? t`Long` : t`Short`;
    const indexToken = getTokenData(tokensData, p.indexTokenAddress);

    return t`${positionTypeText} ${indexToken?.symbol}`;
  }

  return (
    <div className="SwapMarketStats App-card">
      <div className="App-card-title">{getTitle()}</div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        <InfoRow label={t`Market`} value={marketName || "..."} />

        <InfoRow
          label={p.isSwap ? t`${longToken?.symbol} liquidity` : t`Long liquidity`}
          value={
            formatTokenAmountWithUsd(longPoolAmount, longPoolAmountUsd, longToken?.symbol, longToken?.decimals) || "..."
          }
        />

        <InfoRow
          label={p.isSwap ? t`${shortToken?.symbol} liquidity` : t`Short liquidity`}
          value={
            formatTokenAmountWithUsd(shortPoolAmount, shortPoolAmountUsd, shortToken?.symbol, shortToken?.decimals) ||
            "..."
          }
        />
      </div>
    </div>
  );
}
