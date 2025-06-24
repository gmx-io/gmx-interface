import { Trans } from "@lingui/macro";
import cx from "classnames";
import React from "react";
import { Line, LineChart } from "recharts";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId, selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
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
import ButtonLink from "components/Button/ButtonLink";
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
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const tokensData = useTokensData();
  const userEarnings = useUserEarnings(chainId);
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
      <div className="flex flex-col gap-4 rounded-8 bg-cold-blue-900 p-12">
        <div className="flex flex-wrap items-center pb-14">
          <div className="flex items-center">
            <div className="mr-12 flex shrink-0 items-center">
              <TokenIcon
                symbol={tokenIconName}
                displaySize={40}
                importSize={40}
                badge={tokenIconBadge}
                className="min-h-40 min-w-40"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex text-16">
                {isGlv
                  ? getGlvDisplayName(marketOrGlv)
                  : getMarketIndexName({ indexToken, isSpotOnly: marketOrGlv.isSpotOnly })}

                <div className="inline-block">
                  <GmAssetDropdown token={token} marketsInfoData={marketsInfoData} tokensData={tokensData} />
                </div>
              </div>
              <div className="text-12 tracking-normal text-slate-100">
                [{getMarketPoolName({ longToken, shortToken })}]
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-8">
            <div className="py-12">
              <SnapshotGraph
                performanceSnapshots={performanceSnapshots ?? EMPTY_ARRAY}
                performance={performance ?? 0}
              />
            </div>

            {onFavoriteClick && (
              <div
                className="cursor-pointer self-center rounded-4 bg-[#252B57] p-12 text-16"
                onClick={handleFavoriteClick}
              >
                <FavoriteStar isFavorite={isFavorite} activeClassName="!text-white" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-10 border-t border-stroke-primary pt-8">
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
          />
        </div>
        <ButtonLink
          className="mt-12 bg-[#252B57] p-8 text-center"
          to={`/pools/details?market=${marketOrGlvTokenAddress}`}
        >
          <Trans>View Details</Trans>
        </ButtonLink>
      </div>
    );
  }

  return (
    <TableTr key={token.address} bordered={false} hoverable={false}>
      <TableTd className="!pl-0">
        <div className="w-[220px]">
          <div className="flex items-start">
            {onFavoriteClick && (
              <div
                className="mr-4 cursor-pointer self-center rounded-4 p-8 text-16 hover:bg-cold-blue-700 active:bg-cold-blue-500"
                onClick={handleFavoriteClick}
              >
                <FavoriteStar isFavorite={isFavorite} />
              </div>
            )}

            <div className="mr-12 flex shrink-0 items-center">
              <TokenIcon
                symbol={tokenIconName}
                displaySize={40}
                importSize={40}
                badge={tokenIconBadge}
                className="min-h-40 min-w-40"
              />
            </div>
            <div>
              <div className="flex text-16">
                {isGlv
                  ? getGlvDisplayName(marketOrGlv)
                  : getMarketIndexName({ indexToken, isSpotOnly: Boolean(marketOrGlv?.isSpotOnly) })}

                <div className="inline-block">
                  <GmAssetDropdown token={token} marketsInfoData={marketsInfoData} tokensData={tokensData} />
                </div>
              </div>
              <div className="text-12 tracking-normal text-slate-100">
                [{getMarketPoolName({ longToken, shortToken })}]
              </div>
            </div>
          </div>
          {showDebugValues && <span style={tokenAddressStyle}>{marketOrGlvTokenAddress}</span>}
        </div>
      </TableTd>
      <TableTd>
        <AmountWithUsdHuman
          multiline
          amount={totalSupply}
          decimals={token.decimals}
          usd={totalSupplyUsd}
          symbol={token.symbol}
          usdOnTop
        />
      </TableTd>
      <TableTd>
        <GmTokensBalanceInfo
          token={token}
          daysConsidered={daysConsidered}
          earnedRecently={marketEarnings?.recent}
          earnedTotal={marketEarnings?.total}
          isGlv={isGlv}
        />
      </TableTd>

      <TableTd>
        <AprInfo apy={apy} incentiveApr={incentiveApr} lidoApr={lidoApr} marketAddress={token.address} />
      </TableTd>

      <TableTd>{performance ? <div>{formatPerformanceBps(performance)}</div> : "..."}</TableTd>

      <TableTd>
        <SnapshotGraph performanceSnapshots={performanceSnapshots ?? EMPTY_ARRAY} performance={performance ?? 0} />
      </TableTd>

      <TableTd className="!pr-0">
        <Button
          className="flex-grow !px-30 !py-12"
          variant="secondary"
          to={`/pools/details?market=${marketOrGlvTokenAddress}`}
        >
          <Trans>Details</Trans>
        </Button>
      </TableTd>
    </TableTr>
  );
}

const MOBILE_SNAPSHOT_GRAPH_SIZE = {
  width: 88,
  height: 22,
};

const DESKTOP_SNAPSHOT_GRAPH_SIZE = {
  width: 160,
  height: 30,
};

const MOBILE_GRAPH_SIZE_CLASSNAME = `h-[${MOBILE_SNAPSHOT_GRAPH_SIZE.height}px] w-[${MOBILE_SNAPSHOT_GRAPH_SIZE.width}px]`;
const DESKTOP_GRAPH_SIZE_CLASSNAME = `h-[${DESKTOP_SNAPSHOT_GRAPH_SIZE.height}px] w-[${DESKTOP_SNAPSHOT_GRAPH_SIZE.width}px]`;

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
    <div
      className={cx({
        [MOBILE_GRAPH_SIZE_CLASSNAME]: isMobile,
        [DESKTOP_GRAPH_SIZE_CLASSNAME]: !isMobile,
      })}
    >
      <LineChart width={size.width} height={size.height} data={performanceSnapshots}>
        <Line
          dataKey="performance"
          stroke={isNegative ? "var(--color-blue-300)" : "var(--color-green-500)"}
          dot={false}
        />
      </LineChart>
    </div>
  );
};
