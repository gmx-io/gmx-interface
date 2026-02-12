import { Trans } from "@lingui/macro";
import Skeleton from "react-loading-skeleton";

import { PLATFORM_TOKEN_DECIMALS } from "context/PoolsDetailsContext/selectors";
import { MultichainMarketTokenBalances } from "domain/multichain/types";
import {
  GlvOrMarketInfo,
  getGlvDisplayName,
  getGlvOrMarketAddress,
  getMarketBadge,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { Mode, Operation } from "domain/synthetics/markets/types";
import { formatPercentage } from "lib/numbers";
import { EarnPagePortfolioItemType, sendEarnPortfolioItemClickEvent } from "lib/userAnalytics/earnEvents";
import { ContractsChainId } from "sdk/configs/chains";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { MultichainBalanceTooltip } from "components/MultichainBalanceTooltip/MultichainBalanceTooltip";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import MinusCircleIcon from "img/ic_minus_circle.svg?react";
import NewLinkIcon from "img/ic_new_link.svg?react";
import PlusCircleIcon from "img/ic_plus_circle.svg?react";

import { BaseAssetCard } from "./BaseAssetCard";

type Props = {
  marketInfo: GlvOrMarketInfo;
  chainId: ContractsChainId;
  totalPerformanceApy: bigint | undefined;
  performanceApy30d: bigint | undefined;
  isPerformanceLoading: boolean;
  multichainMarketTokenBalances: MultichainMarketTokenBalances | undefined;
};

export function GmGlvAssetCard({
  marketInfo,
  chainId,
  totalPerformanceApy,
  performanceApy30d,
  isPerformanceLoading,
  multichainMarketTokenBalances,
}: Props) {
  const marketAddress = getGlvOrMarketAddress(marketInfo);

  const isGlv = isGlvInfo(marketInfo);
  const indexToken = isGlv ? marketInfo.glvToken : marketInfo.indexToken;
  const longToken = marketInfo.longToken;
  const shortToken = marketInfo.shortToken;

  const balance = multichainMarketTokenBalances?.totalBalance ?? 0n;
  const balanceUsd = multichainMarketTokenBalances?.totalBalanceUsd ?? 0n;
  const symbol = isGlv ? "GLV" : "GM";

  const tooltipContent = (
    <MultichainBalanceTooltip
      multichainBalances={multichainMarketTokenBalances}
      symbol={symbol}
      decimals={PLATFORM_TOKEN_DECIMALS}
    />
  );

  const title = isGlv
    ? getGlvDisplayName(marketInfo)
    : `GM: ${getMarketIndexName({ indexToken, isSpotOnly: marketInfo.isSpotOnly })}`;
  const subtitle = `[${getMarketPoolName({ longToken, shortToken })}]`;

  const iconTokenSymbol = isGlv
    ? "GLV"
    : marketInfo.isSpotOnly
      ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
      : getNormalizedTokenSymbol(indexToken.symbol);

  const detailsPath = `/pools/details?market=${marketAddress}`;
  const buyPath = `${detailsPath}&operation=${Operation.Deposit}&mode=${Mode.Single}`;
  const sellPath = `${detailsPath}&operation=${Operation.Withdrawal}&mode=${Mode.Single}`;

  const makeHandleClick = (type: EarnPagePortfolioItemType) => {
    return () => {
      sendEarnPortfolioItemClickEvent({ item: isGlv ? "GLV" : "GM", type });
    };
  };

  return (
    <BaseAssetCard
      icon={
        <TokenIcon
          symbol={iconTokenSymbol}
          displaySize={40}
          badge={getMarketBadge(chainId, marketInfo)}
          badgeClassName={isGlv ? "left-[50%] -translate-x-1/2 right-[unset] -bottom-1" : undefined}
        />
      }
      title={title}
      subtitle={subtitle}
      headerButton={
        <Button variant="secondary" className="w-32 !p-0" to={detailsPath} onClick={makeHandleClick("details")}>
          <NewLinkIcon className="size-16" />
        </Button>
      }
      footer={
        <div className="grid w-full grid-cols-2 gap-8">
          <Button variant="secondary" to={buyPath} onClick={makeHandleClick("buy")}>
            <PlusCircleIcon className="size-16" />
            <Trans>Buy</Trans>
          </Button>
          <Button variant="secondary" to={sellPath} onClick={makeHandleClick("sell")}>
            <MinusCircleIcon className="size-16" />
            <Trans>Sell</Trans>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-12">
        <SyntheticsInfoRow
          label={<Trans>Wallet</Trans>}
          value={
            balance !== 0n ? (
              tooltipContent ? (
                <TooltipWithPortal
                  handle={
                    <AmountWithUsdBalance
                      amount={balance}
                      decimals={PLATFORM_TOKEN_DECIMALS}
                      usd={balanceUsd}
                      symbol={symbol}
                    />
                  }
                  content={tooltipContent}
                  position="bottom-end"
                />
              ) : (
                <AmountWithUsdBalance
                  amount={balance}
                  decimals={PLATFORM_TOKEN_DECIMALS}
                  usd={balanceUsd}
                  symbol={symbol}
                />
              )
            ) : (
              <span>-</span>
            )
          }
        />
        <SyntheticsInfoRow
          label={<Trans>Total Performance APY</Trans>}
          value={
            totalPerformanceApy !== undefined ? (
              formatPercentage(totalPerformanceApy, { bps: false })
            ) : isPerformanceLoading ? (
              <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={50} className="leading-base" />
            ) : (
              "N/A"
            )
          }
        />
        <SyntheticsInfoRow
          label={<Trans>30d Performance APY</Trans>}
          value={
            performanceApy30d !== undefined ? (
              formatPercentage(performanceApy30d, { bps: false })
            ) : isPerformanceLoading ? (
              <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={50} className="leading-base" />
            ) : (
              "N/A"
            )
          }
        />
      </div>
    </BaseAssetCard>
  );
}
