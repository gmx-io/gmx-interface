import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { getBridgingOptionsForToken } from "config/bridging";
import {
  MarketInfo,
  MarketTokensAPRData,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMaxPoolUsd,
  getMintableMarketTokens,
  getPoolUsdWithoutPnl,
  getSellableMarketToken,
} from "domain/synthetics/markets";
import { TokenData, TokensData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { BN_ZERO, formatAmountHuman, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import MarketTokenSelector from "../MarketTokenSelector/MarketTokenSelector";

import { CardRow } from "components/CardRow/CardRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { BridgingInfo } from "../BridgingInfo/BridgingInfo";

import TokenIcon from "components/TokenIcon/TokenIcon";
import { TOKEN_COLOR_MAP } from "config/tokens";
import { MARKET_STATS_DECIMALS } from "config/ui";
import { bigMath } from "lib/bigmath";
import { ExchangeTd, ExchangeTh, ExchangeTheadTr, ExchangeTr } from "../OrderList/ExchangeTable";
import "./MarketStats.scss";
import { MarketDescription } from "./MarketDescription";

type Props = {
  marketsInfoData?: MarketsInfoData;
  marketTokensData?: TokensData;
  marketInfo?: MarketInfo;
  marketToken?: TokenData;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
};

export function MarketStatsWithComposition(p: Props) {
  const {
    marketInfo,
    marketToken,
    marketsTokensApyData,
    marketsInfoData,
    marketTokensData,
    marketsTokensIncentiveAprData,
  } = p;
  const { chainId } = useChainId();

  const marketPrice = marketToken?.prices?.maxPrice;
  const marketBalance = marketToken?.balance;
  const marketBalanceUsd = convertToUsd(marketBalance, marketToken?.decimals, marketPrice);

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd = convertToUsd(marketTotalSupply, marketToken?.decimals, marketPrice);

  const { longToken, shortToken, longPoolAmount, shortPoolAmount } = marketInfo || {};

  const mintableInfo = marketInfo && marketToken ? getMintableMarketTokens(marketInfo, marketToken) : undefined;
  const sellableInfo = marketInfo && marketToken ? getSellableMarketToken(marketInfo, marketToken) : undefined;

  const maxLongSellableTokenAmount = convertToTokenAmount(
    sellableInfo?.maxLongSellableUsd,
    longToken?.decimals,
    longToken?.prices.minPrice
  );

  const maxShortSellableTokenAmount = convertToTokenAmount(
    sellableInfo?.maxShortSellableUsd,
    shortToken?.decimals,
    shortToken?.prices.minPrice
  );

  const longPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, true, "midPrice") : undefined;
  const shortPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, false, "midPrice") : undefined;

  const apy = getByKey(marketsTokensApyData, marketInfo?.marketTokenAddress);
  const incentiveApr = getByKey(marketsTokensIncentiveAprData, marketInfo?.marketTokenAddress);
  const indexName = marketInfo && getMarketIndexName(marketInfo);
  const poolName = marketInfo && getMarketPoolName(marketInfo);

  const bridgingOprionsForToken = getBridgingOptionsForToken(longToken?.symbol);
  const shouldShowMoreInfo = Boolean(bridgingOprionsForToken);

  const maxLongTokenValue = useMemo(
    () => [
      formatTokenAmountWithUsd(
        mintableInfo?.longDepositCapacityAmount,
        mintableInfo?.longDepositCapacityUsd,
        longToken?.symbol,
        longToken?.decimals
      ),
      marketInfo
        ? `(${formatUsd(getPoolUsdWithoutPnl(marketInfo, true, "midPrice"))} / ${formatUsd(getMaxPoolUsd(marketInfo, true))})`
        : "",
    ],
    [
      longToken?.decimals,
      longToken?.symbol,
      marketInfo,
      mintableInfo?.longDepositCapacityAmount,
      mintableInfo?.longDepositCapacityUsd,
    ]
  );
  const maxShortTokenValue = useMemo(
    () => [
      formatTokenAmountWithUsd(
        mintableInfo?.shortDepositCapacityAmount,
        mintableInfo?.shortDepositCapacityUsd,
        shortToken?.symbol,
        shortToken?.decimals
      ),
      marketInfo
        ? `(${formatUsd(getPoolUsdWithoutPnl(marketInfo, false, "midPrice"))} / ${formatUsd(getMaxPoolUsd(marketInfo, false))})`
        : "",
    ],
    [
      marketInfo,
      mintableInfo?.shortDepositCapacityAmount,
      mintableInfo?.shortDepositCapacityUsd,
      shortToken?.decimals,
      shortToken?.symbol,
    ]
  );

  return (
    <div className="App-card flex flex-grow flex-row">
      <div className="max-w-[36.6rem] pr-20">
        <MarketTokenSelector
          marketTokensData={marketTokensData}
          marketsInfoData={marketsInfoData}
          marketsTokensAPRData={marketsTokensApyData}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          currentMarketInfo={marketInfo}
        />
        <div className="App-card-divider" />
        <div className="App-card-content">
          <MarketDescription marketInfo={marketInfo} />
          <CardRow
            label={t`Market`}
            value={
              indexName && poolName ? (
                <div className="flex items-start">
                  <span>{indexName}</span>
                  <span className="subtext gm-market-name">[{poolName}]</span>
                </div>
              ) : (
                "..."
              )
            }
          />
          <CardRow
            label={t`Price`}
            value={
              <Tooltip
                handle={
                  formatUsd(marketPrice, {
                    displayDecimals: MARKET_STATS_DECIMALS,
                  }) || "..."
                }
                position="bottom-end"
                renderContent={() => {
                  return (
                    <div>
                      <Trans>
                        GM token pricing includes price impact pool amounts, the pending PnL of open positions, and
                        borrowing fees. It excludes funding fees, which are exchanged between traders.
                        <br />
                        <br />
                        <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2/#token-pricing">
                          Read more about GM token pricing
                        </ExternalLink>
                        .
                      </Trans>
                    </div>
                  );
                }}
              />
            }
          />

          <CardRow
            label={t`Wallet`}
            value={formatTokenAmountWithUsd(
              marketBalance ?? 0n,
              marketBalanceUsd ?? 0n,
              "GM",
              marketToken?.decimals ?? 18
            )}
          />

          {/* <CardRow label={t`APY`} value={<AprInfo apy={apy} incentiveApr={incentiveApr} />} /> */}

          <CardRow
            label={t`Total Supply`}
            value={
              marketTotalSupply !== undefined && marketTotalSupplyUsd !== undefined
                ? formatTokenAmountWithUsd(marketTotalSupply, marketTotalSupplyUsd, "GM", marketToken?.decimals, {
                    displayDecimals: 0,
                  })
                : "..."
            }
          />

          <CardRow
            label={t`Buyable`}
            value={
              mintableInfo && marketTotalSupplyUsd !== undefined && marketToken ? (
                <Tooltip
                  maxAllowedWidth={350}
                  handle={formatTokenAmountWithUsd(
                    mintableInfo.mintableAmount,
                    mintableInfo.mintableUsd,
                    "GM",
                    marketToken?.decimals,
                    {
                      displayDecimals: 0,
                    }
                  )}
                  position="bottom-end"
                  content={
                    <div>
                      {marketInfo?.isSameCollaterals ? (
                        <Trans>
                          {marketInfo?.longToken.symbol} can be used to buy GM for this market up to the specified
                          buying caps.
                        </Trans>
                      ) : (
                        <Trans>
                          {marketInfo?.longToken.symbol} and {marketInfo?.shortToken.symbol} can be used to buy GM for
                          this market up to the specified buying caps.
                        </Trans>
                      )}

                      <br />
                      <br />

                      <StatsTooltipRow
                        label={t`Max ${marketInfo?.longToken.symbol}`}
                        value={maxLongTokenValue}
                        showDollar={false}
                      />
                      <br />
                      <StatsTooltipRow
                        label={t`Max ${marketInfo?.shortToken.symbol}`}
                        value={maxShortTokenValue}
                        showDollar={false}
                      />
                    </div>
                  }
                />
              ) : (
                "..."
              )
            }
          />

          <CardRow
            label={t`Sellable`}
            value={
              <Tooltip
                maxAllowedWidth={300}
                handle={formatTokenAmountWithUsd(
                  sellableInfo?.totalAmount,
                  sellableInfo?.totalUsd,
                  "GM",
                  marketToken?.decimals,
                  {
                    displayDecimals: 0,
                  }
                )}
                position="bottom-end"
                content={
                  <div>
                    {marketInfo?.isSameCollaterals ? (
                      <Trans>
                        GM can be sold for {longToken?.symbol} for this market up to the specified selling caps. The
                        remaining tokens in the pool are reserved for currently open positions.
                      </Trans>
                    ) : (
                      <Trans>
                        GM can be sold for {longToken?.symbol} and {shortToken?.symbol} for this market up to the
                        specified selling caps. The remaining tokens in the pool are reserved for currently open
                        positions.
                      </Trans>
                    )}
                    <br />
                    <br />
                    <StatsTooltipRow
                      label={t`Max ${marketInfo?.longToken.symbol}`}
                      value={formatTokenAmountWithUsd(
                        maxLongSellableTokenAmount,
                        sellableInfo?.maxLongSellableUsd,
                        longToken?.symbol,
                        longToken?.decimals
                      )}
                      showDollar={false}
                    />
                    {!marketInfo?.isSameCollaterals && (
                      <StatsTooltipRow
                        label={t`Max ${marketInfo?.shortToken.symbol}`}
                        value={formatTokenAmountWithUsd(
                          maxShortSellableTokenAmount,
                          sellableInfo?.maxShortSellableUsd,
                          shortToken?.symbol,
                          shortToken?.decimals
                        )}
                        showDollar={false}
                      />
                    )}
                  </div>
                }
              />
            }
          />
          <div className="App-card-divider" />
          <BridgingInfo chainId={chainId} tokenSymbol={longToken?.symbol} />
        </div>
      </div>
      <div className="border-l-1 flex-grow border-l-slate-700 pl-20">
        <p>Composition</p>
        <CompositionBar
          data={[
            {
              value: longPoolAmountUsd,
              color: longToken
                ? TOKEN_COLOR_MAP[longToken?.symbol] || TOKEN_COLOR_MAP.default
                : TOKEN_COLOR_MAP.default,
            },
            {
              value: longPoolAmountUsd,
              color: shortToken
                ? TOKEN_COLOR_MAP[shortToken?.symbol] || TOKEN_COLOR_MAP.default
                : TOKEN_COLOR_MAP.default,
            },
          ]}
        />
        <CompositionTableGm
          data={[
            {
              token: longToken,
              amount: longPoolAmount,
              amountUsd: longPoolAmountUsd,
              prefix: "Long",
            },
            {
              token: shortToken,
              amount: shortPoolAmount,
              amountUsd: shortPoolAmountUsd,
              prefix: "Short",
            },
          ].filter(Boolean)}
        />
      </div>
    </div>
  );
}

interface CompositionBarProps {
  data: {
    color: string;
    value?: bigint;
  }[];
}

function CompositionBar({ data }: CompositionBarProps) {
  const sum = data.reduce((acc, { value }) => acc + (value ?? 0n), 0n);
  const percents = data.map(({ value }) => (value === undefined ? 0n : bigMath.mulDiv(value, 100n, sum)));

  return (
    <div className="relative mt-10 h-8 overflow-hidden rounded-2">
      {data.map(({ color, value }, index) => {
        if (value === undefined) {
          return null;
        }
        const widthPc = percents[index].toString();
        const previousWidthPc = index ? percents[index - 1]?.toString() : "0";

        return (
          <div
            key={`comp-pc-${index}`}
            className="[&:not(:last-child)]:border-r-1 absolute left-0 top-0 h-8 border-slate-800"
            style={{ width: `${widthPc}%`, backgroundColor: color, left: previousWidthPc + "%" }}
          />
        );
      })}
    </div>
  );
}

interface CompositionTableGmProps {
  data: { prefix: string; amountUsd?: bigint; token?: TokenData; amount?: bigint }[];
}

export function CompositionTableGm({ data }: CompositionTableGmProps) {
  const sum = data.reduce((acc, { amountUsd }) => acc + (amountUsd ?? 0n), 0n);

  return (
    <table className="w-[100%]">
      <thead>
        <ExchangeTheadTr bordered={false}>
          <ExchangeTh padding="vertical">
            <Trans>COLLATERAL</Trans>
          </ExchangeTh>
          <ExchangeTh padding="vertical">
            <Trans>AMOUNT</Trans>
          </ExchangeTh>
          <ExchangeTh padding="vertical">
            <Trans>COMP.</Trans>
          </ExchangeTh>
        </ExchangeTheadTr>
      </thead>
      <tbody>
        {data.map(({ token, prefix, amountUsd, amount }, index) => {
          if (amount === undefined || amountUsd === undefined || !token) {
            return null;
          }

          return (
            <ExchangeTr key={`comp-data-${token.address}-${index}`} hoverable={false} bordered={false}>
              <ExchangeTd className="py-6" padding="none">
                <span className="flex flex-row items-center gap-8">
                  <span
                    className="inline-block h-10 w-10 rounded-10"
                    style={{ backgroundColor: TOKEN_COLOR_MAP[token.symbol] ?? TOKEN_COLOR_MAP.default }}
                  />
                  <TokenIcon symbol={token.symbol} displaySize={24} />
                  <span>
                    {prefix}: {token.symbol}
                  </span>
                </span>
              </ExchangeTd>
              <ExchangeTd className="py-6" padding="none">
                {formatAmountHuman(amount, token.decimals)}
              </ExchangeTd>
              <ExchangeTd className="py-6" padding="none">
                {bigMath.mulDiv(amountUsd, 100n, sum).toString()}
              </ExchangeTd>
            </ExchangeTr>
          );
        })}
      </tbody>
    </table>
  );
}
