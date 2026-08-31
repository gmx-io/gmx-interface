import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";

import { PLATFORM_TOKEN_DECIMALS } from "context/PoolsDetailsContext/selectors";
import { MultichainMarketTokenBalances } from "domain/multichain/types";
import { useMegaethPointsActive } from "domain/synthetics/common/useMegaethPointsActive";
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
import { formatDeltaUsd, formatPercentage, formatUsd } from "lib/numbers";
import { EarnPagePortfolioItemType, sendEarnPortfolioItemClickEvent } from "lib/userAnalytics/earnEvents";
import { ContractsChainId } from "sdk/configs/chains";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { EarningAttributionNote, EarningAttributionScope, EarningValue } from "components/EarningValue/EarningValue";
import {
  MultichainBalanceTooltip,
  useHasMultichainBreakdown,
} from "components/MultichainBalanceTooltip/MultichainBalanceTooltip";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import MinusCircleIcon from "img/ic_minus_circle.svg?react";
import NewLinkIcon from "img/ic_new_link.svg?react";
import PlusCircleIcon from "img/ic_plus_circle.svg?react";
import sparkleIcon from "img/sparkle.svg";

import { BaseAssetCard } from "./BaseAssetCard";

export type AssetCardEarnings = {
  total: bigint;
  recent: bigint;
  expected365d: bigint;
};

type Props = {
  marketInfo: GlvOrMarketInfo;
  chainId: ContractsChainId;
  totalPerformanceApy: bigint | undefined;
  performanceApy30d: bigint | undefined;
  isPerformanceLoading: boolean;
  multichainMarketTokenBalances: MultichainMarketTokenBalances | undefined;
  hasBalanceOutsideWallet: boolean;
  earnings: AssetCardEarnings | undefined;
  isEarningsLoading: boolean;
  isEarningsAvailable: boolean;
};

function EarningsStripCell({
  label,
  children,
  align = "left",
}: {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <div
      className={cx("flex min-w-0 flex-col gap-2 px-8 first:pl-0 last:pr-0", {
        "items-start": align === "left",
        "items-center": align === "center",
        "items-end": align === "right",
      })}
    >
      <span className="text-body-small whitespace-nowrap font-medium text-typography-secondary">{label}</span>
      <span className="text-body-small whitespace-nowrap font-medium text-typography-primary numbers">{children}</span>
    </div>
  );
}

function EarningsStrip({
  earnings,
  isLoading,
  isAvailable,
  attributionScope,
}: {
  earnings: AssetCardEarnings | undefined;
  isLoading: boolean;
  isAvailable: boolean;
  attributionScope: EarningAttributionScope | undefined;
}) {
  const isAttributable = attributionScope === undefined;
  const attributionNote = attributionScope ? <EarningAttributionNote scope={attributionScope} /> : undefined;

  return (
    <div className="grid grid-cols-3 divide-x-1/2 divide-dashed divide-slate-600 rounded-8 border-1/2 border-dashed border-slate-600 bg-slate-900/[0.88] px-12 py-6">
      <EarningsStripCell label={<Trans>7d Earnings</Trans>}>
        <EarningValue
          value={earnings?.recent}
          isLoading={isLoading}
          isAvailable={isAvailable && isAttributable}
          unavailableTooltip={attributionNote}
          skeletonWidth={40}
        >
          {(value) => (
            <span className={cx({ "text-green-500": value > 0n })}>
              {value > 0n ? formatDeltaUsd(value, undefined, { hidePercentage: true }) : formatUsd(value)}
            </span>
          )}
        </EarningValue>
      </EarningsStripCell>
      <EarningsStripCell label={<Trans>Expected 365d</Trans>} align="center">
        <EarningValue value={earnings?.expected365d} isLoading={isLoading} isAvailable={isAvailable} skeletonWidth={40}>
          {(value) => <span className="text-blue-100">~{formatUsd(value)}</span>}
        </EarningValue>
      </EarningsStripCell>
      <EarningsStripCell label={<Trans>Lifetime</Trans>} align="right">
        <EarningValue
          value={earnings?.total}
          isLoading={isLoading}
          isAvailable={isAvailable && isAttributable}
          unavailableTooltip={attributionNote}
          skeletonWidth={40}
        >
          {(value) => <>{formatUsd(value)}</>}
        </EarningValue>
      </EarningsStripCell>
    </div>
  );
}

export function GmGlvAssetCard({
  marketInfo,
  chainId,
  totalPerformanceApy,
  performanceApy30d,
  isPerformanceLoading,
  multichainMarketTokenBalances,
  hasBalanceOutsideWallet,
  earnings,
  isEarningsLoading,
  isEarningsAvailable,
}: Props) {
  const marketAddress = getGlvOrMarketAddress(marketInfo);
  const isMegaethPointsActive = useMegaethPointsActive();

  const isGlv = isGlvInfo(marketInfo);
  const indexToken = isGlv ? marketInfo.glvToken : marketInfo.indexToken;
  const longToken = marketInfo.longToken;
  const shortToken = marketInfo.shortToken;

  const balance = multichainMarketTokenBalances?.totalBalance ?? 0n;
  const balanceUsd = multichainMarketTokenBalances?.totalBalanceUsd ?? 0n;
  const symbol = isGlv ? "GLV" : "GM";
  const hasMultichainBreakdown = useHasMultichainBreakdown(multichainMarketTokenBalances);
  const attributionScope: EarningAttributionScope | undefined = hasBalanceOutsideWallet
    ? isGlv
      ? "glv"
      : "gm"
    : undefined;

  const tooltipContent = hasMultichainBreakdown ? (
    <MultichainBalanceTooltip
      multichainBalances={multichainMarketTokenBalances}
      symbol={symbol}
      decimals={PLATFORM_TOKEN_DECIMALS}
    />
  ) : null;

  const title = isGlv
    ? getGlvDisplayName(marketInfo)
    : `GM: ${getMarketIndexName({ indexToken, isSpotOnly: marketInfo.isSpotOnly })}`;
  const showMegaethPointsBadge = isGlv && isMegaethPointsActive;
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
        <EarningsStrip
          earnings={earnings}
          isLoading={isEarningsLoading}
          isAvailable={isEarningsAvailable}
          attributionScope={attributionScope}
        />
        {showMegaethPointsBadge && (
          <TooltipWithPortal
            variant="none"
            maxAllowedWidth={350}
            handle={
              <span className="inline-flex w-fit items-center gap-3 rounded-4 bg-blue-300/20 px-6 py-2 text-12 font-medium text-blue-300">
                <img className="h-10" src={sparkleIcon} alt="" />
                <Trans>Earns MegaETH points</Trans>
              </span>
            }
            content={
              <Trans>
                Points are based on the time-weighted average value of your share of the GLV [USDM-USDM] vault over the
                epoch
              </Trans>
            }
          />
        )}
        <SyntheticsInfoRow
          label={<Trans>Balance</Trans>}
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
          label={<Trans>Total performance APY</Trans>}
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
          label={<Trans>30d performance APY</Trans>}
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
