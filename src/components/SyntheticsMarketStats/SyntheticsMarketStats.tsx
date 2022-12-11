import { t } from "@lingui/macro";
import { getChainIcon } from "config/chains";
import { getToken } from "config/tokens";
import gmIcon from "img/gm_icon.svg";
import { useChainId } from "lib/chains";
import { importImage } from "lib/legacy";
import { useMemo } from "react";
import { CardRow } from "components/CardRow/CardRow";
import { PLACEHOLDER_MARKET_NAME } from "config/synthetics";

import "./SyntheticsMarketStats.scss";
import {
  getMarket,
  getMarketName,
  getMarketPoolData,
  getMarketTokenData,
  useMarketsData,
  useMarketsPoolsData,
  useMarketTokensData,
} from "domain/synthetics/markets";
import {
  convertToUsdByPrice,
  formatTokenAmountWithUsd,
  formatUsdAmount,
  getUsdFromTokenAmount,
  useWhitelistedTokensData,
} from "domain/synthetics/tokens";

type Props = {
  marketKey?: string;
};

export function SyntheticsMarketStats(p: Props) {
  const { chainId } = useChainId();

  const marketsData = useMarketsData(chainId);
  const poolsData = useMarketsPoolsData(chainId);
  const tokensData = useWhitelistedTokensData(chainId);
  const marketTokensData = useMarketTokensData(chainId);

  const market = getMarket(marketsData, p.marketKey);
  const marketName = getMarketName(marketsData, tokensData, market?.marketTokenAddress);

  const marketToken = getMarketTokenData(marketTokensData, p.marketKey);
  const marketPrice = marketToken?.prices?.maxPrice;

  const marketBalance = marketToken?.balance;
  const marketBalanceUsd =
    marketBalance && marketPrice ? convertToUsdByPrice(marketBalance, marketToken.decimals, marketPrice) : undefined;

  const marketTotalSupply = marketToken?.totalSupply;

  const marketTotalSupplyUsd =
    marketTotalSupply && marketPrice
      ? convertToUsdByPrice(marketTotalSupply, marketToken.decimals, marketPrice)
      : undefined;

  const { longCollateral, shortCollateral } = useMemo(() => {
    if (!market) return { longCollateral: undefined, shortCollateral: undefined };

    return {
      longCollateral: getToken(chainId, market.longTokenAddress),
      shortCollateral: getToken(chainId, market.shortTokenAddress),
    };
  }, [chainId, market]);

  const pools = getMarketPoolData(poolsData, market?.marketTokenAddress);

  const longPoolAmount = pools?.longPoolAmount;
  const longPoolAmountUsd = getUsdFromTokenAmount(tokensData, market?.longTokenAddress, longPoolAmount);
  const shortPoolAmount = pools?.shortPoolAmount;
  const shortPoolAmountUsd = getUsdFromTokenAmount(tokensData, market?.shortTokenAddress, shortPoolAmount);

  return (
    <div className="App-card SyntheticsMarketStats-card">
      <div className="SyntheticsMarketStats-title">
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
            <div className="App-card-title-mark-title">{marketName || PLACEHOLDER_MARKET_NAME}</div>
            <div className="App-card-title-mark-subtitle">GMX Market tokens</div>
          </div>
          {/* TODO */}
          {/* <div>
            <AssetDropdown assetSymbol="GM" />
          </div> */}
        </div>
      </div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        {/* <CardRow label={t`Market`} value={marketName} /> */}
        <CardRow label={t`Price`} value={marketPrice ? formatUsdAmount(marketPrice) : "..."} />
        <CardRow
          label={t`Wallet`}
          value={
            marketBalance && marketBalanceUsd
              ? formatTokenAmountWithUsd(marketBalance, marketBalanceUsd, marketToken.symbol, marketToken.decimals)
              : "..."
          }
        />

        {/* TODO */}
        {/* <CardRow label={t`Market worth`} value={formatUsdAmount(bigNumberify(0))} /> */}

        {/* TODO */}
        {/* <CardRow label={t`APR`} value={"14.00%"} /> */}

        <CardRow
          label={t`Total Supply`}
          value={
            marketTotalSupply && marketTotalSupplyUsd
              ? formatTokenAmountWithUsd(
                  marketTotalSupply,
                  marketTotalSupplyUsd,
                  marketToken.symbol,
                  marketToken.decimals
                )
              : "..."
          }
        />

        <div className="App-card-divider" />

        <CardRow label={t`Long Collateral`} value={longCollateral?.symbol || "..."} />
        <CardRow
          label={t`Pool amount`}
          value={formatTokenAmountWithUsd(
            longPoolAmount,
            longPoolAmountUsd,
            longCollateral?.symbol,
            longCollateral?.decimals
          )}
        />

        <div className="App-card-divider" />

        <CardRow label={t`Short Collateral`} value={shortCollateral?.symbol || "..."} />
        <CardRow
          label={t`Pool amount`}
          value={formatTokenAmountWithUsd(
            shortPoolAmount,
            shortPoolAmountUsd,
            shortCollateral?.symbol,
            shortCollateral?.decimals
          )}
        />
      </div>
    </div>
  );
}
