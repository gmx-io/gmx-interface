import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { USD_DECIMALS } from "config/factors";
import {
  MarketInfo,
  getMarketIndexName,
  getPoolUsdWithoutPnl,
  getStrictestMaxPoolUsdForDeposit,
} from "domain/synthetics/markets";
import { getMintableInfoGlv, getTotalSellableInfoGlv, isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvAndGmMarketsInfoData, GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { TokenData, TokensData, convertToTokenAmount } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";
import { bigintToNumber, formatAmountHuman } from "lib/numbers";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import { AmountWithUsdHuman } from "components/AmountWithUsd/AmountWithUsd";
import { BridgingInfo } from "components/BridgingInfo/BridgingInfo";
import { useMarketMintableTokens } from "components/MarketStats/hooks/useMarketMintableTokens";
import { useMarketSellableToken } from "components/MarketStats/hooks/useMarketSellableToken";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

import { PoolsDetailsMarketAmount } from "./PoolsDetailsMarketAmount";

export function PoolsDetailsAbout({
  glvOrMarketInfo,
  marketToken,
  marketsInfoData,
  marketTokensData,
}: {
  glvOrMarketInfo: GlvOrMarketInfo | undefined;
  marketToken: TokenData | undefined;
  marketsInfoData: GlvAndGmMarketsInfoData;
  marketTokensData: TokensData | undefined;
}) {
  const { chainId } = useChainId();
  const isGlv = isGlvInfo(glvOrMarketInfo);
  const sellableInfo = useMarketSellableToken(glvOrMarketInfo, marketToken);
  const mintableInfo = useMarketMintableTokens(glvOrMarketInfo, marketToken);
  const sellable = isGlv ? getTotalSellableInfoGlv(glvOrMarketInfo, marketsInfoData, marketTokensData) : sellableInfo;
  const mintable = isGlv ? getMintableInfoGlv(glvOrMarketInfo, marketTokensData) : mintableInfo;

  const isMobile = usePoolsIsMobilePage();

  const marketName = glvOrMarketInfo ? getMarketIndexName(glvOrMarketInfo) : "";

  const exposedToLabel = glvOrMarketInfo?.isSameCollaterals
    ? glvOrMarketInfo?.longToken?.symbol
    : `${glvOrMarketInfo?.longToken?.symbol} and ${glvOrMarketInfo?.shortToken?.symbol}`;

  return (
    <div className="flex flex-col gap-16">
      <div className="text-body-medium text-typography-secondary">
        {isGlv ? (
          <Trans>
            This token is a vault of automatically rebalanced GM tokens that accrue fees from leverage trading and swaps
            from the included markets. Backed by {glvOrMarketInfo?.longToken?.symbol} and{" "}
            {glvOrMarketInfo?.shortToken?.symbol}.
          </Trans>
        ) : (
          <Trans>
            This token automatically accrues fees from leverage trading and swaps for the {marketName} market. It is
            also exposed to {exposedToLabel} as per the composition displayed.
          </Trans>
        )}
      </div>

      <BridgingInfo chainId={chainId} tokenSymbol={glvOrMarketInfo?.longToken?.symbol} />
      {!glvOrMarketInfo?.isSameCollaterals && (
        <BridgingInfo chainId={chainId} tokenSymbol={glvOrMarketInfo?.shortToken?.symbol} />
      )}

      <div className={cx("flex pt-8", { "flex-col gap-12": isMobile, "flex-row gap-20": !isMobile })}>
        <PoolsDetailsMarketAmount
          label={<Trans>Buyable</Trans>}
          value={
            marketToken?.decimals
              ? `${formatAmountHuman(mintable?.mintableAmount, marketToken?.decimals, false, 2)} ${marketToken?.symbol}`
              : "..."
          }
          valueClassName="text-13"
          secondaryValueClassName="text-12"
          secondaryValue={mintable ? formatAmountHuman(mintable?.mintableUsd, USD_DECIMALS, true, 2) : undefined}
          tooltipContent={
            !isGlv ? <BuyableTooltipContent marketInfo={glvOrMarketInfo} mintableInfo={mintableInfo} /> : undefined
          }
        />
        <PoolsDetailsMarketAmount
          label={<Trans>Sellable</Trans>}
          value={
            marketToken?.decimals
              ? `${formatAmountHuman(sellable?.totalAmount, marketToken?.decimals, false, 2)} ${marketToken?.symbol}`
              : "..."
          }
          valueClassName="text-13"
          secondaryValueClassName="text-12"
          secondaryValue={sellable ? formatAmountHuman(sellable?.totalUsd, USD_DECIMALS, true, 2) : undefined}
          tooltipContent={
            !isGlv ? <SellableTooltipContent marketInfo={glvOrMarketInfo} sellableInfo={sellableInfo} /> : undefined
          }
        />

        {isGlv && (
          <PoolsDetailsMarketAmount
            label={<Trans>Last Rebalance</Trans>}
            value={
              glvOrMarketInfo?.shiftLastExecutedAt
                ? glvOrMarketInfo?.shiftLastExecutedAt === 0n
                  ? "-"
                  : formatDateTime(bigintToNumber(glvOrMarketInfo.shiftLastExecutedAt, 0))
                : "..."
            }
            valueClassName="text-13"
            secondaryValueClassName="text-12"
          />
        )}
      </div>
    </div>
  );
}

const SellableTooltipContent = ({
  marketInfo,
  sellableInfo,
}: {
  marketInfo: MarketInfo | undefined;
  sellableInfo: ReturnType<typeof useMarketSellableToken>;
}) => {
  const maxLongSellableTokenAmount = convertToTokenAmount(
    sellableInfo?.maxLongSellableUsd,
    marketInfo?.longToken?.decimals,
    marketInfo?.longToken?.prices?.minPrice
  );

  const maxShortSellableTokenAmount = convertToTokenAmount(
    sellableInfo?.maxShortSellableUsd,
    marketInfo?.shortToken?.decimals,
    marketInfo?.shortToken?.prices?.minPrice
  );

  return (
    <div>
      {marketInfo?.isSameCollaterals ? (
        <Trans>
          GM can be sold for {marketInfo?.longToken?.symbol} for this market up to the specified selling caps. The
          remaining tokens in the pool are reserved for currently open positions.
        </Trans>
      ) : (
        <Trans>
          GM can be sold for {marketInfo?.longToken?.symbol} and {marketInfo?.shortToken?.symbol} for this market up to
          the specified selling caps. The remaining tokens in the pool are reserved for currently open positions.
        </Trans>
      )}
      <br />
      <br />
      {marketInfo?.isSameCollaterals ? (
        <StatsTooltipRow
          label={t`Max ${marketInfo?.longToken.symbol}`}
          value={
            <AmountWithUsdHuman
              amount={(maxLongSellableTokenAmount ?? 0n) + (maxShortSellableTokenAmount ?? 0n)}
              usd={(sellableInfo?.maxLongSellableUsd ?? 0n) + (sellableInfo?.maxShortSellableUsd ?? 0n)}
              decimals={marketInfo?.longToken?.decimals}
              symbol={marketInfo?.longToken?.symbol}
            />
          }
          showDollar={false}
        />
      ) : (
        <>
          <StatsTooltipRow
            label={t`Max ${marketInfo?.longToken.symbol}`}
            value={
              <AmountWithUsdHuman
                amount={maxLongSellableTokenAmount}
                usd={sellableInfo?.maxLongSellableUsd}
                decimals={marketInfo?.longToken?.decimals}
                symbol={marketInfo?.longToken?.symbol}
              />
            }
            showDollar={false}
          />
          <StatsTooltipRow
            label={t`Max ${marketInfo?.shortToken.symbol}`}
            value={
              <AmountWithUsdHuman
                amount={maxShortSellableTokenAmount}
                usd={sellableInfo?.maxShortSellableUsd}
                decimals={marketInfo?.shortToken?.decimals}
                symbol={marketInfo?.shortToken?.symbol}
              />
            }
            showDollar={false}
          />
        </>
      )}
    </div>
  );
};

const BuyableTooltipContent = ({
  marketInfo,
  mintableInfo,
}: {
  marketInfo: MarketInfo | undefined;
  mintableInfo: ReturnType<typeof useMarketMintableTokens>;
}) => {
  const longTokenMaxValue = useMemo(() => {
    if (!marketInfo?.longToken) {
      return undefined;
    }

    if (marketInfo?.isSameCollaterals) {
      const poolUsd = formatAmountHuman(
        getPoolUsdWithoutPnl(marketInfo, true, "midPrice") + getPoolUsdWithoutPnl(marketInfo, false, "midPrice"),
        USD_DECIMALS,
        true,
        2
      );
      const maxPoolUsd = formatAmountHuman(
        getStrictestMaxPoolUsdForDeposit(marketInfo, true) + getStrictestMaxPoolUsdForDeposit(marketInfo, false),
        USD_DECIMALS,
        true,
        2
      );

      return [
        <AmountWithUsdHuman
          key="longTokenMaxValue-isSameCollaterals"
          amount={(mintableInfo?.longDepositCapacityAmount ?? 0n) + (mintableInfo?.shortDepositCapacityAmount ?? 0n)}
          decimals={marketInfo?.longToken?.decimals}
          usd={(mintableInfo?.longDepositCapacityUsd ?? 0n) + (mintableInfo?.shortDepositCapacityUsd ?? 0n)}
        />,
        <span
          key="longTokenMaxValue-isSameCollaterals-ratio"
          className="text-body-small text-typography-secondary numbers"
        >
          ({poolUsd} / {maxPoolUsd})
        </span>,
      ];
    }

    const poolUsd = formatAmountHuman(getPoolUsdWithoutPnl(marketInfo, true, "midPrice"), USD_DECIMALS, true, 2);
    const maxPoolUsd = formatAmountHuman(getStrictestMaxPoolUsdForDeposit(marketInfo, true), USD_DECIMALS, true, 2);

    return [
      <AmountWithUsdHuman
        key="longTokenMaxValue"
        amount={mintableInfo?.longDepositCapacityAmount}
        decimals={marketInfo?.longToken?.decimals}
        usd={mintableInfo?.longDepositCapacityUsd}
        symbol={marketInfo?.longToken?.symbol}
      />,
      <span key="longTokenMaxValue-ratio" className="text-body-small text-typography-secondary numbers">
        ({poolUsd} / {maxPoolUsd})
      </span>,
    ];
  }, [
    marketInfo,
    mintableInfo?.longDepositCapacityAmount,
    mintableInfo?.longDepositCapacityUsd,
    mintableInfo?.shortDepositCapacityAmount,
    mintableInfo?.shortDepositCapacityUsd,
  ]);

  const shortTokenMaxValue = useMemo(() => {
    if (!marketInfo?.shortToken) {
      return undefined;
    }

    const poolUsd = formatAmountHuman(getPoolUsdWithoutPnl(marketInfo, false, "midPrice"), USD_DECIMALS, true, 2);
    const maxPoolUsd = formatAmountHuman(getStrictestMaxPoolUsdForDeposit(marketInfo, false), USD_DECIMALS, true, 2);

    return [
      <AmountWithUsdHuman
        key="shortTokenMaxValue"
        amount={mintableInfo?.shortDepositCapacityAmount}
        decimals={marketInfo?.shortToken?.decimals}
        usd={mintableInfo?.shortDepositCapacityUsd}
        symbol={marketInfo?.shortToken?.symbol}
      />,
      <span key="shortTokenMaxValue-ratio" className="text-body-small text-typography-secondary numbers">
        ({poolUsd} / {maxPoolUsd})
      </span>,
    ];
  }, [marketInfo, mintableInfo]);

  const content = (
    <AmountWithUsdHuman
      amount={mintableInfo?.mintableAmount}
      decimals={marketInfo?.longToken?.decimals}
      usd={mintableInfo?.mintableUsd}
      symbol={marketInfo?.longToken?.symbol}
    />
  );

  if (!marketInfo?.longToken || !marketInfo?.shortToken) {
    return content;
  }

  return (
    <>
      <p className="text-typography-primary">
        {marketInfo?.isSameCollaterals ? (
          <Trans>
            {marketInfo?.longToken?.symbol} can be used to buy GM for this market up to the specified buying caps.
          </Trans>
        ) : (
          <Trans>
            {marketInfo?.longToken?.symbol} and {marketInfo?.shortToken?.symbol} can be used to buy GM for this market
            up to the specified buying caps.
          </Trans>
        )}
      </p>
      <br />
      <StatsTooltipRow label={`Max ${marketInfo?.longToken?.symbol}`} value={longTokenMaxValue} />
      {!marketInfo?.isSameCollaterals && (
        <StatsTooltipRow label={`Max ${marketInfo?.shortToken?.symbol}`} value={shortTokenMaxValue} />
      )}
    </>
  );
};
