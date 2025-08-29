import { Trans } from "@lingui/macro";
import React, { useCallback } from "react";
import { HiDotsVertical } from "react-icons/hi";
import { useHistory } from "react-router-dom";
import { Area, AreaChart } from "recharts";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectChainId,
  selectGlvAndMarketsInfoData,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  MarketTokensAPRData,
  getGlvDisplayName,
  getGlvOrMarketAddress,
  getMarketBadge,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { PerformanceSnapshot, formatPerformanceBps } from "domain/synthetics/markets/performance";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { PerformanceSnapshotsData } from "domain/synthetics/markets/useGmGlvPerformance";
import { PerformanceData } from "domain/synthetics/markets/useGmGlvPerformance";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { TokenData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { AmountWithUsdHuman } from "components/AmountWithUsd/AmountWithUsd";
import { AprInfo } from "components/AprInfo/AprInfo";
import Button from "components/Button/Button";
import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import { TableTd, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";

import { GmTokensBalanceInfo } from "./GmTokensTotalBalanceInfo";
import GmAssetDropdown from "../GmAssetDropdown/GmAssetDropdown";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { FeeApyLabel } from "./FeeApyLabel";
import { PerformanceLabel } from "./PerformanceLabel";

export const tokenAddressStyle = { fontSize: 5 };

export function GmListItem({
  token,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  glvTokensIncentiveAprData,
  marketsTokensLidoAprData,
  glvTokensApyData,
  isFavorite,
  onFavoriteClick,
  glvPerformance,
  gmPerformance,
  glvPerformanceSnapshots,
  gmPerformanceSnapshots,
}: {
  token: TokenData;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  glvTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvTokensApyData: MarketTokensAPRData | undefined;
  isFavorite: boolean | undefined;
  onFavoriteClick: ((address: string) => void) | undefined;
  glvPerformance: PerformanceData | undefined;
  gmPerformance: PerformanceData | undefined;
  glvPerformanceSnapshots: PerformanceSnapshotsData | undefined;
  gmPerformanceSnapshots: PerformanceSnapshotsData | undefined;
}) {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const tokensData = useTokensData();
  const userEarnings = useUserEarnings(chainId, srcChainId);
  const daysConsidered = useDaysConsideredInMarketsApr();
  const { showDebugValues } = useSettings();

  const marketOrGlv = getByKey(marketsInfoData, token?.address);

  const isGlv = isGlvInfo(marketOrGlv);

  const indexToken = isGlv ? marketOrGlv.glvToken : getTokenData(tokensData, marketOrGlv?.indexTokenAddress, "native");
  const longToken = getTokenData(tokensData, marketOrGlv?.longTokenAddress);
  const shortToken = getTokenData(tokensData, marketOrGlv?.shortTokenAddress);

  const marketOrGlvTokenAddress = marketOrGlv && getGlvOrMarketAddress(marketOrGlv);

  const apy = isGlv
    ? getByKey(glvTokensApyData, marketOrGlvTokenAddress)
    : getByKey(marketsTokensApyData, token?.address);
  const incentiveApr = isGlv
    ? getByKey(glvTokensIncentiveAprData, token?.address)
    : getByKey(marketsTokensIncentiveAprData, token?.address);
  const lidoApr = getByKey(marketsTokensLidoAprData, token?.address);
  const marketEarnings = getByKey(userEarnings?.byMarketAddress, token?.address);

  const isMobile = usePoolsIsMobilePage();

  const history = useHistory();

  const handleMobileItemClick = useCallback(
    (event: React.MouseEvent) => {
      history.push(`/pools/details?market=${marketOrGlvTokenAddress}`);
      event.stopPropagation();
    },
    [history, marketOrGlvTokenAddress]
  );

  if (!token || !indexToken || !longToken || !shortToken || !marketOrGlv) {
    return null;
  }

  const totalSupply = token?.totalSupply;
  const totalSupplyUsd = convertToUsd(totalSupply, token?.decimals, token?.prices?.minPrice);
  const tokenIconName = marketOrGlv?.isSpotOnly
    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
    : getNormalizedTokenSymbol(indexToken.symbol);

  const tokenIconBadge = getMarketBadge(chainId, marketOrGlv);

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!marketOrGlvTokenAddress) return;
    onFavoriteClick?.(marketOrGlvTokenAddress);
  };

  const performance = isGlv ? glvPerformance?.[token.address] : gmPerformance?.[token.address];
  const performanceSnapshots = isGlv
    ? glvPerformanceSnapshots?.[token.address]
    : gmPerformanceSnapshots?.[token.address];

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 rounded-8 bg-fill-surfaceElevated50 p-12">
        <div className="flex flex-wrap items-center pb-8" onClick={handleMobileItemClick}>
          <div className="flex items-center">
            <div className="mr-12 flex shrink-0 items-center">
              <TokenIcon
                symbol={tokenIconName}
                displaySize={40}
                importSize={40}
                badge={tokenIconBadge}
                className="min-h-40 min-w-40"
                badgeClassName={isGlv ? "left-[50%] -translate-x-1/2 right-[unset] bottom-0" : undefined}
              />
            </div>
            <div className="flex flex-col">
              <div className="text-body-medium flex">
                <span className="font-medium">
                  {isGlv
                    ? getGlvDisplayName(marketOrGlv)
                    : getMarketIndexName({ indexToken, isSpotOnly: marketOrGlv.isSpotOnly })}
                </span>

                <div className="inline-block">
                  <GmAssetDropdown token={token} marketsInfoData={marketsInfoData} tokensData={tokensData} />
                </div>
              </div>
              <div className="text-12 tracking-normal text-typography-secondary">
                [{getMarketPoolName({ longToken, shortToken })}]
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-8">
            <SnapshotGraph performanceSnapshots={performanceSnapshots ?? EMPTY_ARRAY} performance={performance ?? 0} />

            {onFavoriteClick ? (
              <div>
                <Button variant="secondary" className="shrink-0" onClick={handleFavoriteClick}>
                  <FavoriteStar isFavorite={isFavorite} activeClassName="!text-typography-primary" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-10 border-t border-slate-600 pt-8">
          <SyntheticsInfoRow
            label={<Trans>TVL (Supply)</Trans>}
            value={
              <AmountWithUsdHuman
                amount={totalSupply}
                decimals={token.decimals}
                usd={totalSupplyUsd}
                symbol={token.symbol}
                usdOnTop
              />
            }
          />
          <SyntheticsInfoRow
            label={<Trans>Wallet</Trans>}
            value={
              <GmTokensBalanceInfo
                token={token}
                daysConsidered={daysConsidered}
                earnedRecently={marketEarnings?.recent}
                earnedTotal={marketEarnings?.total}
                isGlv={isGlv}
                singleLine={true}
              />
            }
          />
          <SyntheticsInfoRow
            label={<FeeApyLabel />}
            value={<AprInfo apy={apy} incentiveApr={incentiveApr} lidoApr={lidoApr} marketAddress={token.address} />}
          />
          <SyntheticsInfoRow
            label={<PerformanceLabel />}
            value={performance ? formatPerformanceBps(performance) : "..."}
            valueClassName={performance ? "numbers" : undefined}
          />
        </div>

        <Button variant="secondary" className="mt-12" to={`/pools/details?market=${marketOrGlvTokenAddress}`}>
          <Trans>View Details</Trans>
        </Button>
      </div>
    );
  }

  return (
    <TableTr key={token.address}>
      <TableTd className="w-[22%] !py-10 pl-16">
        <div className="w-[220px]">
          <div className="flex items-center gap-8">
            {onFavoriteClick && (
              <Button variant="ghost" className="!p-8" onClick={handleFavoriteClick}>
                <FavoriteStar isFavorite={isFavorite} />
              </Button>
            )}

            <div className="mr-12 flex shrink-0 items-center">
              <TokenIcon
                symbol={tokenIconName}
                displaySize={40}
                importSize={40}
                badge={tokenIconBadge}
                className="min-h-40 min-w-40"
                badgeClassName={isGlv ? "left-[50%] -translate-x-1/2 right-[unset] bottom-0" : undefined}
              />
            </div>
            <div>
              <div className="flex items-center text-16">
                <span className="font-medium">
                  {isGlv
                    ? getGlvDisplayName(marketOrGlv)
                    : getMarketIndexName({ indexToken, isSpotOnly: Boolean(marketOrGlv?.isSpotOnly) })}
                </span>

                <div className="inline-block">
                  <GmAssetDropdown token={token} marketsInfoData={marketsInfoData} tokensData={tokensData} />
                </div>
              </div>
              <div className="text-12 tracking-normal text-typography-secondary">
                [{getMarketPoolName({ longToken, shortToken })}]
              </div>
            </div>
          </div>
          {showDebugValues && <span style={tokenAddressStyle}>{marketOrGlvTokenAddress}</span>}
        </div>
      </TableTd>
      <TableTd className="w-[13%]">
        <AmountWithUsdHuman
          multiline
          amount={totalSupply}
          decimals={token.decimals}
          usd={totalSupplyUsd}
          symbol={token.symbol}
          usdOnTop
        />
      </TableTd>
      <TableTd className="w-[11%]">
        <GmTokensBalanceInfo
          token={token}
          daysConsidered={daysConsidered}
          earnedRecently={marketEarnings?.recent}
          earnedTotal={marketEarnings?.total}
          isGlv={isGlv}
        />
      </TableTd>

      <TableTd className="w-[11%]">
        <AprInfo apy={apy} incentiveApr={incentiveApr} lidoApr={lidoApr} marketAddress={token.address} />
      </TableTd>

      <TableTd className="w-[18%]">
        {performance ? <div className="numbers">{formatPerformanceBps(performance)}</div> : "..."}
      </TableTd>

      <TableTd className="w-[14%]">
        <SnapshotGraph performanceSnapshots={performanceSnapshots ?? EMPTY_ARRAY} performance={performance ?? 0} />
      </TableTd>

      <TableTd className="w-[10%] pr-16">
        <Button
          className="flex flex-grow items-center gap-4"
          variant="ghost"
          to={`/pools/details?market=${marketOrGlvTokenAddress}`}
        >
          <Trans>Details</Trans>
          <HiDotsVertical className="size-16" />
        </Button>
      </TableTd>
    </TableTr>
  );
}

const MOBILE_SNAPSHOT_GRAPH_SIZE = {
  width: 80,
  height: 32,
};

const DESKTOP_SNAPSHOT_GRAPH_SIZE = {
  width: 160,
  height: 32,
};

const SnapshotGraph = ({
  performanceSnapshots,
  performance,
}: {
  performanceSnapshots: PerformanceSnapshot[];
  performance: number;
}) => {
  const isNegative = performance < 0;

  const isMobile = usePoolsIsMobilePage();
  const size = isMobile ? MOBILE_SNAPSHOT_GRAPH_SIZE : DESKTOP_SNAPSHOT_GRAPH_SIZE;

  return (
    <div style={isMobile ? MOBILE_SNAPSHOT_GRAPH_SIZE : DESKTOP_SNAPSHOT_GRAPH_SIZE}>
      <AreaChart width={size.width} height={size.height} data={performanceSnapshots}>
        <defs>
          <linearGradient id={`snapshot-graph-gradient-green`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="-45%" stopColor="var(--color-green-500)" stopOpacity={0.5}></stop>
            <stop offset="100%" stopColor="var(--color-green-500)" stopOpacity={0}></stop>
          </linearGradient>
          <linearGradient id={`snapshot-graph-gradient-red`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="-45%" stopColor="var(--color-red-500)" stopOpacity={0.5}></stop>
            <stop offset="100%" stopColor="var(--color-red-500)" stopOpacity={0}></stop>
          </linearGradient>
        </defs>
        <Area
          dataKey="performance"
          stroke={isNegative ? "var(--color-red-500)" : "var(--color-green-500)"}
          dot={false}
          fill={isNegative ? "url(#snapshot-graph-gradient-red)" : "url(#snapshot-graph-gradient-green)"}
          baseValue="dataMin"
        />
      </AreaChart>
    </div>
  );
};
