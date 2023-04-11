import { t } from "@lingui/macro";
import { CardRow } from "components/CardRow/CardRow";
import { getIcon } from "config/icons";
import { MarketInfo, getPoolUsd } from "domain/synthetics/markets";
import { TokenData, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { useMarketTokensAPR } from "domain/synthetics/markets/useMarketTokensAPR";
import "./MarketStats.scss";

type Props = {
  marketInfo?: MarketInfo;
  marketToken?: TokenData;
};

export function MarketStats(p: Props) {
  const { marketInfo, marketToken } = p;
  const { chainId } = useChainId();

  const { marketsTokensAPRData } = useMarketTokensAPR(chainId);

  const marketName = `GM: ${marketInfo?.name || "---/--- [-------]"}`;

  const marketPrice = marketToken?.prices?.maxPrice;
  const marketBalance = marketToken?.balance;
  const marketBalanceUsd =
    marketBalance && marketPrice ? convertToUsd(marketBalance, marketToken.decimals, marketPrice) : undefined;

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd =
    marketTotalSupply && marketPrice ? convertToUsd(marketTotalSupply, marketToken.decimals, marketPrice) : undefined;

  const { longToken, shortToken, longPoolAmount, shortPoolAmount } = marketInfo || {};

  const longPoolAmountUsd = marketInfo ? getPoolUsd(marketInfo, true, "midPrice") : undefined;
  const shortPoolAmountUsd = marketInfo ? getPoolUsd(marketInfo, false, "midPrice") : undefined;

  const apr = marketsTokensAPRData?.[marketInfo?.marketTokenAddress || ""];

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

        <CardRow label={t`APR`} value={apr ? `${formatAmount(apr, 2, 2)}%` : "..."} />

        <CardRow
          label={t`Total Supply`}
          value={
            marketTotalSupply && marketTotalSupplyUsd
              ? formatTokenAmountWithUsd(marketTotalSupply, marketTotalSupplyUsd, "GM", marketToken.decimals)
              : "..."
          }
        />

        <div className="App-card-divider" />

        <CardRow label={t`Long Collateral`} value={longToken?.symbol || "..."} />
        <CardRow
          label={t`Pool amount`}
          value={formatTokenAmountWithUsd(longPoolAmount, longPoolAmountUsd, longToken?.symbol, longToken?.decimals)}
        />

        <div className="App-card-divider" />

        <CardRow label={t`Short Collateral`} value={shortToken?.symbol || "..."} />
        <CardRow
          label={t`Pool amount`}
          value={formatTokenAmountWithUsd(
            shortPoolAmount,
            shortPoolAmountUsd,
            shortToken?.symbol,
            shortToken?.decimals
          )}
        />
      </div>
    </div>
  );
}
