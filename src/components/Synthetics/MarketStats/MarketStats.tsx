import { t } from "@lingui/macro";
import { CardRow } from "components/CardRow/CardRow";
import { getToken } from "config/tokens";
import { useChainId } from "lib/chains";
import { useMemo } from "react";

import { getIcon } from "config/icons";
import {
  getMarket,
  getMarketName,
  getMarketPoolData,
  getMarketTokenData,
  getPoolAmountUsd,
  useMarketTokensData,
  useMarketsData,
  useMarketsPoolsData,
} from "domain/synthetics/markets";
import { convertToUsd, useAvailableTokensData } from "domain/synthetics/tokens";
import "./MarketStats.scss";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";

type Props = {
  marketKey?: string;
};

export function MarketStats(p: Props) {
  const { chainId } = useChainId();

  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketTokensData } = useMarketTokensData(chainId);

  const market = getMarket(marketsData, p.marketKey);
  const marketName = getMarketName(marketsData, tokensData, market?.marketTokenAddress, true);

  const marketToken = getMarketTokenData(marketTokensData, p.marketKey);
  const marketPrice = marketToken?.prices?.maxPrice;

  const marketBalance = marketToken?.balance;
  const marketBalanceUsd =
    marketBalance && marketPrice ? convertToUsd(marketBalance, marketToken.decimals, marketPrice) : undefined;

  const marketTotalSupply = marketToken?.totalSupply;

  const marketTotalSupplyUsd =
    marketTotalSupply && marketPrice ? convertToUsd(marketTotalSupply, marketToken.decimals, marketPrice) : undefined;

  const { longCollateral, shortCollateral } = useMemo(() => {
    if (!market) return { longCollateral: undefined, shortCollateral: undefined };

    return {
      longCollateral: getToken(chainId, market.longTokenAddress),
      shortCollateral: getToken(chainId, market.shortTokenAddress),
    };
  }, [chainId, market]);

  const pools = getMarketPoolData(poolsData, market?.marketTokenAddress);

  const longPoolAmount = pools?.longPoolAmount;
  const longPoolAmountUsd = getPoolAmountUsd(
    marketsData,
    poolsData,
    tokensData,
    market?.marketTokenAddress,
    market?.longTokenAddress,
    false
  );

  const shortPoolAmount = pools?.shortPoolAmount;
  const shortPoolAmountUsd = getPoolAmountUsd(
    marketsData,
    poolsData,
    tokensData,
    market?.marketTokenAddress,
    market?.shortTokenAddress,
    false
  );

  return (
    <div className="App-card MarketStats-card">
      <div className="MarketStats-title">
        <div className="App-card-title-mark">
          <div className="App-card-title-mark-icon">
            <img className="MarketStats-gm-icon" src={getIcon(chainId, "gm")} alt="GM" />
            {/* TODO: change to unified */}
            {/* <img
              src={getIcon(chainId, "network")}
              width={20}
              alt="arbitrum16Icon"
              className="selected-network-symbol"
            /> */}
          </div>
          <div className="App-card-title-mark-info">
            <div className="App-card-title-mark-title">{marketName}</div>
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
        <CardRow label={t`Price`} value={formatUsd(marketPrice) || "..."} />
        <CardRow
          label={t`Wallet`}
          value={
            marketBalance && marketBalanceUsd
              ? formatTokenAmountWithUsd(marketBalance, marketBalanceUsd, "GM", marketToken.decimals)
              : "..."
          }
        />

        {/* TODO */}
        {/* <CardRow label={t`Market worth`} value={formatUsd(bigNumberify(0))} /> */}

        {/* TODO */}
        {/* <CardRow label={t`APR`} value={"14.00%"} /> */}

        <CardRow
          label={t`Total Supply`}
          value={
            marketTotalSupply && marketTotalSupplyUsd
              ? formatTokenAmountWithUsd(marketTotalSupply, marketTotalSupplyUsd, "GM", marketToken.decimals)
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
