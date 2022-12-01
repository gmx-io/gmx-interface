import { t } from "@lingui/macro";
import { getChainIcon } from "config/chains";
import { getToken } from "config/tokens";
import { useMarketPools } from "domain/synthetics/markets/useMarketPools";
import { useMarkets } from "domain/synthetics/markets/useMarkets";
import { useMarketTokenPrices } from "domain/synthetics/markets/useMarketTokenPrices";
import { getMarket, getMarketName, getMarketPoolAmount, getMarketTokenPrice } from "domain/synthetics/markets/utils";
import { useWhitelistedTokensData } from "domain/synthetics/tokens/useTokensData";
import gmIcon from "img/gm_icon.svg";
import { useChainId } from "lib/chains";
import { GM_DECIMALS, importImage } from "lib/legacy";
import { bigNumberify } from "lib/numbers";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { useMemo } from "react";
import { CardRow } from "components/CardRow/CardRow";
import { useTokenBalances } from "domain/synthetics/tokens/useTokenBalances";
import { useTokenTotalSupply } from "domain/synthetics/tokens/useTokenTotalSupply";
import {
  convertToUsdByPrice,
  formatTokenAmountWithUsd,
  formatUsdAmount,
  getTokenBalance,
  getTokenTotalSupply,
} from "domain/synthetics/tokens/utils";
import "./SyntheticsMarketStats.scss";

type Props = {
  marketKey?: string;
};

export function SyntheticsMarketStats(p: Props) {
  const { chainId } = useChainId();

  const marketsData = useMarkets(chainId);
  const poolsData = useMarketPools(chainId);
  const marketPricesData = useMarketTokenPrices(chainId);
  const tokensData = useWhitelistedTokensData(chainId);
  const marketTokenBalancesData = useTokenBalances(chainId, { tokenAddresses: p.marketKey ? [p.marketKey] : [] });
  const marketTotalSupplyData = useTokenTotalSupply(chainId, { tokenAddresses: p.marketKey ? [p.marketKey] : [] });

  const data = {
    ...marketsData,
    ...tokensData,
    ...marketPricesData,
    ...poolsData,
    ...marketTokenBalancesData,
    ...marketTotalSupplyData,
  };

  const market = getMarket(data, p.marketKey);
  const marketName = getMarketName(chainId, data, market?.marketTokenAddress);
  const marketPrice = getMarketTokenPrice(data, market?.marketTokenAddress);

  const marketBalance = getTokenBalance(data, market?.marketTokenAddress);
  const marketBalanceUsd =
    marketBalance && marketPrice ? convertToUsdByPrice(marketBalance, GM_DECIMALS, marketPrice) : undefined;

  const marketTotalSupply = getTokenTotalSupply(data, market?.marketTokenAddress);
  const marketTotalSupplyUsd =
    marketTotalSupply && marketPrice ? convertToUsdByPrice(marketTotalSupply, GM_DECIMALS, marketPrice) : undefined;

  const { longCollateral, shortCollateral } = useMemo(() => {
    if (!market) return { longCollateral: undefined, shortCollateral: undefined };

    return {
      longCollateral: getToken(chainId, market.longTokenAddress),
      shortCollateral: getToken(chainId, market.shortTokenAddress),
    };
  }, [chainId, market]);

  const longPoolAmount = getMarketPoolAmount(data, market?.marketTokenAddress, market?.longTokenAddress);
  const shortPoolAmount = getMarketPoolAmount(data, market?.marketTokenAddress, market?.shortTokenAddress);

  return (
    <div className="App-card SyntheticsMarketStats-card">
      <div className="App-card-title">
        <div className="App-card-title-mark">
          <div className="App-card-title-mark-icon">
            <img src={gmIcon} alt="glp40Icon" />
            <img
              src={importImage(getChainIcon(chainId, 16))}
              alt="arbitrum16Icon"
              className="selected-network-symbol"
            />
          </div>
          <div className="App-card-title-mark-info">
            <div className="App-card-title-mark-title">GM</div>
            <div className="App-card-title-mark-subtitle">GMX Market tokens</div>
          </div>
          <div>
            <AssetDropdown assetSymbol="GM" />
          </div>
        </div>
      </div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        <CardRow label={t`Perp`} value={marketName} />
        <CardRow label={t`Price`} value={formatUsdAmount(marketPrice)} />
        <CardRow
          label={t`Wallet`}
          value={marketBalance ? formatTokenAmountWithUsd(marketBalance, marketBalanceUsd, "GM", GM_DECIMALS) : "..."}
        />

        <CardRow label={t`Market worth`} value={formatUsdAmount(bigNumberify(0))} />
        <CardRow label={t`APR`} value={"14.00%"} />

        <CardRow
          label={t`Total Supply`}
          value={
            marketTotalSupply
              ? formatTokenAmountWithUsd(marketTotalSupply, marketTotalSupplyUsd, "GM", GM_DECIMALS)
              : "..."
          }
        />

        <div className="App-card-divider" />

        <CardRow label={t`Long Collateral`} value={longCollateral?.symbol || "..."} />
        <CardRow
          label={t`Pool amount`}
          value={longCollateral && longPoolAmount ? formatUsdAmount(longPoolAmount) : "..."}
        />

        <div className="App-card-divider" />

        <CardRow label={t`Short Collateral`} value={shortCollateral?.symbol || "..."} />
        <CardRow
          label={t`Pool amount`}
          value={shortCollateral && shortPoolAmount ? formatUsdAmount(shortPoolAmount) : "..."}
        />
      </div>
    </div>
  );
}
