import { Trans, t } from "@lingui/macro";
import { CardRow } from "components/CardRow/CardRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getIcon } from "config/icons";
import { MarketInfo, MarketTokensAPRData, getPoolUsdWithoutPnl } from "domain/synthetics/markets";
import { TokenData, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import "./MarketStats.scss";

type Props = {
  marketInfo?: MarketInfo;
  marketToken?: TokenData;
  marketsTokensAPRData?: MarketTokensAPRData;
};

export function MarketStats(p: Props) {
  const { marketInfo, marketToken, marketsTokensAPRData } = p;
  const { chainId } = useChainId();

  const marketPrice = marketToken?.prices?.maxPrice;
  const marketBalance = marketToken?.balance;
  const marketBalanceUsd = convertToUsd(marketBalance, marketToken?.decimals, marketPrice);

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd = convertToUsd(marketTotalSupply, marketToken?.decimals, marketPrice);

  const { longToken, shortToken, longPoolAmount, shortPoolAmount } = marketInfo || {};

  const longPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, true, "midPrice") : undefined;
  const shortPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, false, "midPrice") : undefined;

  const apr = getByKey(marketsTokensAPRData, marketInfo?.marketTokenAddress);

  return (
    <div className="App-card MarketStats-card">
      <div className="MarketStats-title">
        <div className="App-card-title-mark">
          <div className="App-card-title-mark-icon">
            <img className="MarketStats-gm-icon" src={getIcon(chainId, "gm")} alt="GM" />
          </div>
          <div className="App-card-title-mark-info">
            <div className="App-card-title-mark-title">GM{marketInfo && `: ${marketInfo.name}`}</div>
            <div className="App-card-title-mark-subtitle">GMX Market Tokens</div>
          </div>
        </div>
      </div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        <CardRow label={t`Market`} value={marketInfo?.name || "..."} />
        <CardRow
          label={t`Price`}
          value={
            <Tooltip
              handle={formatUsd(marketPrice) || "..."}
              position="right-bottom"
              renderContent={() => {
                return (
                  <div>
                    <Trans>GM Token pricing includes positions' Pending PnL, Impact Pool Amount and Borrow Fees.</Trans>
                  </div>
                );
              }}
            />
          }
        />
        <CardRow
          label={t`Wallet`}
          value={
            marketBalance && marketBalanceUsd
              ? formatTokenAmountWithUsd(marketBalance, marketBalanceUsd, "GM", marketToken.decimals)
              : "..."
          }
        />

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
          label={t`Pool Amount`}
          value={formatTokenAmountWithUsd(longPoolAmount, longPoolAmountUsd, longToken?.symbol, longToken?.decimals)}
        />

        <div className="App-card-divider" />

        <CardRow label={t`Short Collateral`} value={shortToken?.symbol || "..."} />
        <CardRow
          label={t`Pool Amount`}
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
