import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import type { SortDirection } from "context/SorterContext/types";
import { useTokenInfo } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useLeaderboardIsCompetition } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { useMarketInfo } from "context/SyntheticsStateContext/hooks/marketHooks";
import {
  selectPositionConstants,
  selectUserReferralInfo,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { LeaderboardPosition, RemoteData } from "domain/synthetics/leaderboard";
import { MIN_COLLATERAL_USD_IN_LEADERBOARD } from "domain/synthetics/leaderboard/constants";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { getLiquidationPrice } from "domain/synthetics/positions";
import { bigMath } from "sdk/utils/bigmath";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatBalanceAmountWithUsd, formatUsd } from "lib/numbers";
import { useDebounce } from "lib/useDebounce";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

import AddressView from "components/AddressView/AddressView";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { TopPositionsSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { TooltipPosition } from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

function getWinnerRankClassname(rank: number | null) {
  if (rank === null) return undefined;
  if (rank <= 3) return `LeaderboardRank-${rank}`;

  return undefined;
}

type LeaderboardPositionField = keyof LeaderboardPosition;

const PER_PAGE = 20;

export function LeaderboardPositionsTable({ positions }: { positions: RemoteData<LeaderboardPosition> }) {
  const { isLoading, data } = positions;
  const [page, setPage] = useState(1);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<LeaderboardPositionField>(
    "leaderboard-positions-table",
    {
      orderBy: "qualifyingPnl",
      direction: "desc",
    }
  );
  const [search, setSearch] = useState("");
  const handleKeyDown = useCallback(() => null, []);
  const term = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [term]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let key = orderBy;
      if (key === "unspecified" || direction === "unspecified") {
        key = "qualifyingPnl";
      }

      const directionMultiplier = direction === "asc" ? -1 : 1;

      if (typeof a[key] === "bigint" && typeof b[key] === "bigint") {
        return directionMultiplier * ((a[key] as bigint) > (b[key] as bigint) ? -1 : 1);
      } else if (typeof a[key] === "number" && typeof b[key] === "number") {
        return directionMultiplier * (a[key] > b[key] ? -1 : 1);
      } else {
        return 1;
      }
    });
  }, [data, direction, orderBy]);

  const filteredStats = useMemo(() => {
    const q = term.toLowerCase().trim();
    return sorted.filter((a) => a.account.toLowerCase().indexOf(q) >= 0);
  }, [sorted, term]);

  const indexFrom = (page - 1) * PER_PAGE;
  const rowsData = useMemo(
    () =>
      filteredStats.slice(indexFrom, indexFrom + PER_PAGE).map((position, i) => ({
        position,
        index: i,
        rank: position.rank,
      })),
    [filteredStats, indexFrom]
  );

  const pageCount = Math.ceil(filteredStats.length / PER_PAGE);

  const content = isLoading ? (
    <TopPositionsSkeleton count={PER_PAGE} />
  ) : (
    <>
      {rowsData.length ? (
        rowsData.map(({ position: position, index, rank }) => {
          return <TableRow key={position.key} position={position} index={index} rank={rank} />;
        })
      ) : (
        <EmptyRow />
      )}
      {rowsData.length < PER_PAGE && <TopPositionsSkeleton invisible count={PER_PAGE - rowsData.length} />}
    </>
  );

  return (
    <div className="rounded-4 bg-slate-800">
      <div className="TableBox__head">
        <SearchInput
          placeholder={t`Search Address`}
          className="max-w-lg *:!text-14"
          value={search}
          setValue={setSearch}
          onKeyDown={handleKeyDown}
          size="s"
        />
      </div>
      <TableScrollFadeContainer>
        <table className="w-full min-w-[1100px] table-fixed">
          <thead>
            <TableTheadTr bordered className="text-body-medium">
              <TableHeaderCell
                title={t`Rank`}
                width={6}
                tooltip={t`Only positions with over ${formatUsd(MIN_COLLATERAL_USD_IN_LEADERBOARD, {
                  displayDecimals: 0,
                })} in "Capital Used" are ranked.`}
                tooltipPosition="bottom-start"
              />
              <TableHeaderCell title={t`Address`} width={16} tooltipPosition="bottom-end" />
              <TableHeaderCell
                {...getSorterProps("qualifyingPnl")}
                title={t`PnL ($)`}
                width={12}
                tooltip={t`The total realized and unrealized profit and loss for the period, considering price impact and fees but excluding swap fees.`}
                tooltipPosition="bottom-end"
              />
              <TableHeaderCell title={t`Position`} width={10} tooltipPosition="bottom-end" />
              <TableHeaderCell {...getSorterProps("entryPrice")} title={t`Entry Price`} width={10} />
              <TableHeaderCell {...getSorterProps("sizeInUsd")} title={t`Size`} width={12} />
              <TableHeaderCell {...getSorterProps("leverage")} title={t`Lev.`} width={4} />
              <TableHeaderCell title={t`Liq. Price`} width={10} />
            </TableTheadTr>
          </thead>
          <tbody>{content}</tbody>
        </table>
      </TableScrollFadeContainer>
      <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

const TableHeaderCell = memo(
  ({
    breakpoint,
    title,
    direction,
    onChange,
    tooltip,
    tooltipPosition,
    width,
  }: {
    title: string;
    tooltip?: ReactNode;
    tooltipPosition?: TooltipPosition;
    onChange?: (direction: SortDirection) => void;
    width?: number | ((breakpoint?: string) => number);
    breakpoint?: string;
    direction?: SortDirection;
  }) => {
    const style =
      width !== undefined
        ? {
            width: `${typeof width === "function" ? width(breakpoint) : width}%`,
          }
        : undefined;

    const stopPropagation = useCallback((e) => e.stopPropagation(), []);

    const isSortable = onChange !== undefined;

    if (isSortable) {
      return (
        <TableTh style={style}>
          <Sorter direction={direction!} onChange={onChange}>
            {tooltip ? (
              <TooltipWithPortal
                handle={<span className="whitespace-nowrap">{title}</span>}
                position={tooltipPosition || "bottom"}
                content={<div onClick={stopPropagation}>{tooltip}</div>}
              />
            ) : (
              <span className="whitespace-nowrap">{title}</span>
            )}
          </Sorter>
        </TableTh>
      );
    }

    return (
      <TableTh style={style}>
        {tooltip ? (
          <TooltipWithPortal
            handle={<span className="whitespace-nowrap">{title}</span>}
            position={tooltipPosition || "bottom"}
            content={<div onClick={stopPropagation}>{tooltip}</div>}
          />
        ) : (
          <span className="whitespace-nowrap">{title}</span>
        )}
      </TableTh>
    );
  }
);

const TableRow = memo(
  ({ position, rank, index }: { position: LeaderboardPosition; index: number; rank: number | null }) => {
    const renderPnlTooltipContent = useCallback(() => <LeaderboardPnlTooltipContent position={position} />, [position]);
    const { minCollateralUsd } = useSelector(selectPositionConstants);
    const userReferralInfo = useSelector(selectUserReferralInfo);

    const collateralToken = useTokenInfo(position.collateralToken);
    const marketInfo = useMarketInfo(position.market);
    const indexToken = marketInfo?.indexToken;

    const liquidationPrice = useMemo(() => {
      if (!collateralToken || !marketInfo || minCollateralUsd === undefined) return undefined;

      return getLiquidationPrice({
        marketInfo,
        collateralToken,
        sizeInUsd: position.sizeInUsd,
        sizeInTokens: position.sizeInTokens,
        collateralUsd: position.collateralUsd,
        collateralAmount: position.collateralAmount,
        minCollateralUsd,
        pendingBorrowingFeesUsd: position.unrealizedFees - position.closingFeeUsd,
        pendingFundingFeesUsd: 0n,
        isLong: position.isLong,
        userReferralInfo,
      });
    }, [
      collateralToken,
      marketInfo,
      minCollateralUsd,
      position.closingFeeUsd,
      position.collateralAmount,
      position.collateralUsd,
      position.isLong,
      position.sizeInTokens,
      position.sizeInUsd,
      position.unrealizedFees,
      userReferralInfo,
    ]);

    const marketDecimals = useSelector(makeSelectMarketPriceDecimals(marketInfo?.indexTokenAddress));

    const indexName = marketInfo ? getMarketIndexName(marketInfo) : "";
    const poolName = marketInfo ? getMarketPoolName(marketInfo) : "";

    const renderPositionTooltip = useCallback(() => {
      return (
        <>
          <div className="mr-5 inline-flex items-start leading-1">
            <span>{indexName}</span>
            <span className="subtext">[{poolName}]</span>
          </div>
          <span className={cx(position.isLong ? "positive" : "negative")}>{position.isLong ? t`Long` : t`Short`}</span>
        </>
      );
    }, [indexName, poolName, position.isLong]);

    const renderSizeTooltip = useCallback(() => {
      return (
        <>
          <StatsTooltipRow
            label={t`Collateral`}
            showDollar={false}
            value={
              collateralToken
                ? formatBalanceAmountWithUsd(
                    position.collateralAmount,
                    position.collateralUsd,
                    collateralToken.decimals,
                    collateralToken.symbol
                  )
                : "..."
            }
          />
        </>
      );
    }, [collateralToken, position.collateralAmount, position.collateralUsd]);

    const renderNaLiquidationTooltip = useCallback(
      () =>
        t`There is no liquidation price, as the position's collateral value will increase to cover any negative PnL.`,
      []
    );

    const renderLiquidationTooltip = useCallback(() => {
      const markPrice = indexToken?.prices.maxPrice;
      const shouldRenderPriceChangeToLiq = markPrice !== undefined && liquidationPrice !== undefined;
      return (
        <>
          <StatsTooltipRow
            label={t`Mark Price`}
            value={formatUsd(markPrice, {
              displayDecimals: indexToken?.priceDecimals,
              visualMultiplier: marketInfo?.indexToken.visualMultiplier,
            })}
            showDollar={false}
          />
          {shouldRenderPriceChangeToLiq && (
            <StatsTooltipRow
              label={t`Price change to Liq.`}
              value={formatUsd(liquidationPrice - markPrice, {
                maxThreshold: "1000000",
                displayDecimals: indexToken?.priceDecimals,
                visualMultiplier: marketInfo?.indexToken.visualMultiplier,
              })}
              showDollar={false}
            />
          )}
        </>
      );
    }, [
      indexToken?.priceDecimals,
      indexToken?.prices.maxPrice,
      liquidationPrice,
      marketInfo?.indexToken.visualMultiplier,
    ]);

    return (
      <TableTr key={position.key} bordered={false}>
        <TableCell className="relative">
          <span className={getWinnerRankClassname(rank)}>
            <RankInfo rank={rank} hasSomeCapital />
          </span>
        </TableCell>
        <TableCell>
          <AddressView size={20} address={position.account} breakpoint="XL" />
        </TableCell>
        <TableCell>
          <TooltipWithPortal
            handle={
              <span className={getSignedValueClassName(position.qualifyingPnl)}>
                {formatDelta(position.qualifyingPnl, { signed: true, prefix: "$" })}
              </span>
            }
            position={index > 9 ? "top" : "bottom"}
            className="nowrap"
            renderContent={renderPnlTooltipContent}
          />
        </TableCell>
        <TableCell>
          <TooltipWithPortal
            handle={
              <span>
                {indexToken ? (
                  <TokenIcon
                    className="PositionList-token-icon"
                    symbol={indexToken.symbol}
                    displaySize={20}
                    importSize={24}
                  />
                ) : null}
                <span>
                  {marketInfo?.indexToken && getTokenVisualMultiplier(marketInfo.indexToken)}
                  {marketInfo?.indexToken.symbol}
                </span>
                <span className={cx("TopPositionsDirection", position.isLong ? "positive" : "negative")}>
                  {position.isLong ? t`Long` : t`Short`}
                </span>
              </span>
            }
            position={index > 9 ? "top" : "bottom"}
            className="nowrap"
            renderContent={renderPositionTooltip}
          />
        </TableCell>
        <TableCell>
          {formatUsd(position.entryPrice, {
            displayDecimals: marketDecimals,
            visualMultiplier: marketInfo?.indexToken.visualMultiplier,
          })}
        </TableCell>
        <TableCell>
          <TooltipWithPortal
            handle={formatUsd(position.sizeInUsd)}
            position={index > 9 ? "top-end" : "bottom-end"}
            renderContent={renderSizeTooltip}
            tooltipClassName="Table-SizeTooltip"
          />
        </TableCell>
        <TableCell>{`${formatAmount(position.leverage, 4, 2)}x`}</TableCell>
        <TableCell className="text-right">
          {liquidationPrice ? (
            <TooltipWithPortal
              position={index > 9 ? "top-end" : "bottom-end"}
              renderContent={renderLiquidationTooltip}
              handle={formatUsd(liquidationPrice, {
                maxThreshold: "1000000",
                displayDecimals: marketDecimals,
                visualMultiplier: marketInfo?.indexToken.visualMultiplier,
              })}
            />
          ) : (
            <TooltipWithPortal
              position={index > 9 ? "top-end" : "bottom-end"}
              renderContent={renderNaLiquidationTooltip}
              handle={t`NA`}
            />
          )}
        </TableCell>
      </TableTr>
    );
  }
);

const TableCell = memo(({ children, className }: { children: ReactNode; className?: string }) => {
  return <TableTd className={className}>{children}</TableTd>;
});

const EmptyRow = memo(() => {
  return (
    <TableTr hoverable={false} bordered={false} className="h-47">
      <TableTd colSpan={7} className="align-top text-slate-100">
        <Trans>No results found</Trans>
      </TableTd>
    </TableTr>
  );
});

const RankInfo = memo(({ rank, hasSomeCapital }: { rank: number | null; hasSomeCapital: boolean }) => {
  const isCompetition = useLeaderboardIsCompetition();

  const message = useMemo(() => {
    if (rank !== null) return null;

    let msg = t`You have not traded during the selected period.`;
    if (hasSomeCapital)
      msg = t`You have yet to reach the minimum "Capital Used" of ${formatUsd(MIN_COLLATERAL_USD_IN_LEADERBOARD, {
        displayDecimals: 0,
      })} to qualify for the rankings.`;
    else if (isCompetition) msg = t`You do not have any eligible trade during the competition window.`;
    return msg;
  }, [hasSomeCapital, isCompetition, rank]);
  const tooltipContent = useCallback(() => message, [message]);

  if (rank === null)
    return <TooltipWithPortal handleClassName="text-red-500" handle={t`NA`} renderContent={tooltipContent} />;

  return <span>{rank}</span>;
});

const LeaderboardPnlTooltipContent = memo(({ position }: { position: LeaderboardPosition }) => {
  const [isPnlAfterFees] = useLocalStorageSerializeKey("leaderboardPnlAfterFees", true);
  const realizedFees = useMemo(() => position.realizedFees * -1n, [position.realizedFees]);
  const realizedPnl = useMemo(
    () => (isPnlAfterFees ? position.realizedPnl + realizedFees + position.realizedPriceImpact : position.realizedPnl),
    [position.realizedPnl, position.realizedPriceImpact, isPnlAfterFees, realizedFees]
  );

  const unrealizedFees = useMemo(() => position.unrealizedFees * -1n, [position.unrealizedFees]);
  const unrealizedPnl = useMemo(
    () => (isPnlAfterFees ? position.unrealizedPnl + unrealizedFees : position.unrealizedPnl),
    [position.unrealizedPnl, isPnlAfterFees, unrealizedFees]
  );

  return (
    <div>
      <StatsTooltipRow
        label={t`Realized PnL`}
        showDollar={false}
        value={
          <span className={getSignedValueClassName(realizedPnl)}>
            {formatDelta(realizedPnl, { signed: true, prefix: "$" })}
          </span>
        }
      />
      <StatsTooltipRow
        label={t`Unrealized PnL`}
        showDollar={false}
        value={
          <span className={getSignedValueClassName(unrealizedPnl)}>
            {formatDelta(unrealizedPnl, { signed: true, prefix: "$" })}
          </span>
        }
      />

      {!isPnlAfterFees && (
        <>
          <br />
          <StatsTooltipRow
            label={t`Realized Fees`}
            showDollar={false}
            value={
              <span className={getSignedValueClassName(realizedFees)}>
                {formatDelta(realizedFees, { signed: true, prefix: "$" })}
              </span>
            }
          />
          <StatsTooltipRow
            label={t`Unrealized Fees`}
            showDollar={false}
            value={
              <span className={getSignedValueClassName(unrealizedFees)}>
                {formatDelta(unrealizedFees, { signed: true, prefix: "$" })}
              </span>
            }
          />
          <br />
          <StatsTooltipRow
            label={t`Realized Price Impact`}
            showDollar={false}
            value={
              <span className={getSignedValueClassName(position.realizedPriceImpact)}>
                {formatDelta(position.realizedPriceImpact, { signed: true, prefix: "$" })}
              </span>
            }
          />
        </>
      )}
    </div>
  );
});

function formatDelta(
  delta: bigint,
  {
    decimals = USD_DECIMALS,
    displayDecimals = 2,
    useCommas = true,
    ...p
  }: {
    decimals?: number;
    displayDecimals?: number;
    useCommas?: boolean;
    prefixoid?: string;
    signed?: boolean;
    prefix?: string;
    postfix?: string;
  } = {}
) {
  return `${p.prefixoid ? `${p.prefixoid} ` : ""}${p.signed ? (delta === 0n ? "" : delta > 0 ? "+" : "-") : ""}${
    p.prefix || ""
  }${formatAmount(p.signed ? bigMath.abs(delta) : delta, decimals, displayDecimals, useCommas)}${p.postfix || ""}`;
}

function getSignedValueClassName(num: bigint) {
  return num === 0n ? "" : num < 0 ? "negative" : "positive";
}
