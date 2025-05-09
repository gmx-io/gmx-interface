import { Trans } from "@lingui/macro";
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
import { PerformanceSnapshot } from "domain/synthetics/markets/performance";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { PerformanceSnapshotsData } from "domain/synthetics/markets/useGmGlvPerformance";
import { PerformanceData } from "domain/synthetics/markets/useGmGlvPerformance";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { TokenData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { getByKey } from "lib/objects";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { AmountWithUsdHuman } from "components/AmountWithUsd/AmountWithUsd";
import { AprInfo } from "components/AprInfo/AprInfo";
import Button from "components/Button/Button";
import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import { TableTd, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";

import { GmTokensBalanceInfo } from "./GmTokensTotalBalanceInfo";
import GmAssetDropdown from "../GmAssetDropdown/GmAssetDropdown";

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

  if (!token || !indexToken || !longToken || !shortToken) {
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

  return (
    <TableTr key={token.address} hoverable={false} bordered={false}>
      <TableTd className="!pl-0">
        <div className="w-[220px]">
          <div className="flex items-start">
            {onFavoriteClick && (
              <div
                className="-ml-8 mr-4 cursor-pointer self-center rounded-4 p-8 text-16 hover:bg-cold-blue-700 active:bg-cold-blue-500"
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

      <TableTd>{performance ? <div>{`${Math.round(performance * 10000) / 100}%`}</div> : null}</TableTd>

      <TableTd>
        {performanceSnapshots && performance ? (
          <SnapshotGraph performanceSnapshots={performanceSnapshots} performance={performance} />
        ) : null}
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

const SnapshotGraph = ({
  performanceSnapshots,
  performance,
}: {
  performanceSnapshots: PerformanceSnapshot[];
  performance: number;
}) => {
  const isNegative = performance < 0;

  return (
    <div>
      <LineChart width={160} height={30} data={performanceSnapshots}>
        <Line
          dataKey="performance"
          stroke={isNegative ? "var(--color-red-500)" : "var(--color-green-500)"}
          dot={false}
        />
      </LineChart>
    </div>
  );
};
