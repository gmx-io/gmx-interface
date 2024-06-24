import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import AddressView from "components/AddressView/AddressView";
import Pagination from "components/Pagination/Pagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { useDebounce } from "lib/useDebounce";
import { ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";

import SearchInput from "components/SearchInput/SearchInput";
import { TopPositionsSkeleton } from "components/Skeleton/Skeleton";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { TooltipPosition } from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { useLeaderboardIsCompetition } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import {
  selectPositionConstants,
  selectUserReferralInfo,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { LeaderboardPosition, RemoteData } from "domain/synthetics/leaderboard";
import { MIN_COLLATERAL_USD_IN_LEADERBOARD } from "domain/synthetics/leaderboard/constants";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { getLiquidationPrice } from "domain/synthetics/positions";
import { USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { useTokenInfo } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useMarketInfo } from "context/SyntheticsStateContext/hooks/marketHooks";
import { bigMath } from "lib/bigmath";

function getWinnerRankClassname(rank: number | null) {
  if (rank === null) return undefined;
  if (rank <= 3) return `LeaderboardRank-${rank}`;

  return undefined;
}

type LeaderboardPositionField = keyof LeaderboardPosition;

export function LeaderboardPositionsTable({ positions }: { positions: RemoteData<LeaderboardPosition> }) {
  const perPage = 20;
  const { isLoading, data } = positions;
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<LeaderboardPositionField>("qualifyingPnl");
  const [direction, setDirection] = useState<number>(1);
  const handleColumnClick = useCallback(
    (key: string) => {
      if (key === orderBy) {
        setDirection((d: number) => -1 * d);
      } else {
        setOrderBy(key as LeaderboardPositionField);
        setDirection(1);
      }
    },
    [orderBy]
  );

  const [search, setSearch] = useState("");
  const setValue = useCallback((e) => setSearch(e.target.value), []);
  const handleKeyDown = useCallback(() => null, []);
  const term = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [term]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const key = orderBy;

      if (typeof a[key] === "bigint" && typeof b[key] === "bigint") {
        return direction * ((a[key] as bigint) > (b[key] as bigint) ? -1 : 1);
      } else if (typeof a[key] === "number" && typeof b[key] === "number") {
        return direction * (a[key] > b[key] ? -1 : 1);
      } else {
        return 1;
      }
    });
  }, [data, direction, orderBy]);

  const filteredStats = useMemo(() => {
    const q = term.toLowerCase().trim();
    return sorted.filter((a) => a.account.toLowerCase().indexOf(q) >= 0);
  }, [sorted, term]);

  const indexFrom = (page - 1) * perPage;
  const rowsData = useMemo(
    () =>
      filteredStats.slice(indexFrom, indexFrom + perPage).map((position, i) => ({
        position,
        index: i,
        rank: position.rank,
      })),
    [filteredStats, indexFrom]
  );

  const pageCount = Math.ceil(filteredStats.length / perPage);

  const getSortableClass = useCallback(
    (key: LeaderboardPositionField) =>
      cx(orderBy === key ? (direction > 0 ? "sorted-asc" : "sorted-desc") : "sortable"),
    [direction, orderBy]
  );

  const content = isLoading ? (
    <TopPositionsSkeleton count={perPage} />
  ) : (
    <>
      {rowsData.length ? (
        rowsData.map(({ position: position, index, rank }) => {
          return <TableRow key={position.key} position={position} index={index} rank={rank} />;
        })
      ) : (
        <EmptyRow />
      )}
    </>
  );

  return (
    <div>
      <div className="TableBox__head">
        <SearchInput
          placeholder={t`Search Address`}
          className="LeaderboardSearch"
          value={search}
          setValue={setValue}
          onKeyDown={handleKeyDown}
          size="s"
        />
      </div>
      <div className="TableBox">
        <table className={cx("Exchange-list", "App-box", "Table")}>
          <tbody>
            <tr className="Exchange-list-header">
              <TableHeaderCell
                title={t`Rank`}
                width={6}
                tooltip={t`Only positions with over ${formatUsd(MIN_COLLATERAL_USD_IN_LEADERBOARD, {
                  displayDecimals: 0,
                })} in "Capital Used" are ranked.`}
                tooltipPosition="bottom-start"
                columnName="rank"
              />
              <TableHeaderCell title={t`Address`} width={16} tooltipPosition="bottom-end" columnName="account" />
              <TableHeaderCell
                title={t`PnL ($)`}
                width={12}
                tooltip={t`The total realized and unrealized profit and loss for the period, considering price impact and fees but excluding swap fees.`}
                tooltipPosition="bottom-end"
                onClick={handleColumnClick}
                columnName="qualifyingPnl"
                className={getSortableClass("qualifyingPnl")}
              />
              <TableHeaderCell title={t`Position`} width={10} tooltipPosition="bottom-end" columnName="key" />
              <TableHeaderCell
                title={t`Entry Price`}
                width={10}
                onClick={handleColumnClick}
                columnName="entryPrice"
                className={getSortableClass("entryPrice")}
              />
              <TableHeaderCell
                title={t`Size`}
                width={12}
                onClick={handleColumnClick}
                columnName="sizeInUsd"
                className={getSortableClass("sizeInUsd")}
              />
              <TableHeaderCell
                title={t`Lev.`}
                width={1}
                onClick={handleColumnClick}
                columnName="leverage"
                className={getSortableClass("leverage")}
              />
              <TableHeaderCell
                title={t`Liq. Price`}
                width={10}
                columnName="liquidationPrice"
                className={cx("text-right")}
              />
            </tr>
            {content}
          </tbody>
        </table>
      </div>
      <div className="TableBox__footer">
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}

const TableHeaderCell = memo(
  ({
    breakpoint,
    columnName,
    title,
    className,
    onClick,
    tooltip,
    tooltipPosition,
    width,
  }: {
    title: string;
    className?: string;
    tooltip?: ReactNode;
    tooltipPosition?: TooltipPosition;
    onClick?: (columnName: LeaderboardPositionField | "liquidationPrice") => void;
    columnName: LeaderboardPositionField | "liquidationPrice";
    width?: number | ((breakpoint?: string) => number);
    breakpoint?: string;
  }) => {
    const style =
      width !== undefined
        ? {
            width: `${typeof width === "function" ? width(breakpoint) : width}%`,
          }
        : undefined;

    const handleClick = useCallback(() => onClick?.(columnName), [columnName, onClick]);
    const stopPropagation = useCallback((e) => e.stopPropagation(), []);
    const renderContent = useCallback(() => <div onClick={stopPropagation}>{tooltip}</div>, [stopPropagation, tooltip]);

    return (
      <th onClick={handleClick} className={cx("TableHeader", className)} style={style}>
        {tooltip ? (
          <TooltipWithPortal
            handle={<span className="TableHeaderTitle">{title}</span>}
            position={tooltipPosition || "bottom"}
            className="TableHeaderTooltip"
            renderContent={renderContent}
          />
        ) : (
          <span className="TableHeaderTitle">{title}</span>
        )}
      </th>
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
            value={formatTokenAmountWithUsd(
              BigInt(position.collateralAmount),
              BigInt(position.collateralUsd),
              collateralToken?.symbol,
              collateralToken?.decimals
            )}
          />
        </>
      );
    }, [collateralToken?.decimals, collateralToken?.symbol, position.collateralAmount, position.collateralUsd]);

    const renderNaLiquidationTooltip = useCallback(
      () =>
        t`There is no liquidation price, as the position's collateral value will increase to cover any negative PnL.`,
      []
    );

    const renderLiquidationTooltip = useCallback(() => {
      const markPrice = marketInfo?.indexToken.prices.maxPrice;
      const shouldRenderPriceChangeToLiq = markPrice !== undefined && liquidationPrice !== undefined;
      return (
        <>
          <StatsTooltipRow label={t`Mark Price`} value={formatUsd(markPrice)} showDollar={false} />
          {shouldRenderPriceChangeToLiq && (
            <StatsTooltipRow
              label={t`Price change to Liq.`}
              value={formatUsd(liquidationPrice - markPrice, { maxThreshold: "1000000" })}
              showDollar={false}
            />
          )}
        </>
      );
    }, [liquidationPrice, marketInfo?.indexToken.prices.maxPrice]);

    return (
      <tr className="Table_tr" key={position.key}>
        <TableCell>
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
              <span className="">
                {indexToken ? (
                  <TokenIcon
                    className="PositionList-token-icon"
                    symbol={indexToken.symbol}
                    displaySize={20}
                    importSize={24}
                  />
                ) : null}
                <span className="">{marketInfo?.indexToken.symbol}</span>
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
        <TableCell>{formatUsd(position.entryPrice)}</TableCell>
        <TableCell>
          <TooltipWithPortal
            handle={formatUsd(position.sizeInUsd)}
            position={index > 9 ? "top-end" : "bottom-end"}
            renderContent={renderSizeTooltip}
            portalClassName="Table-SizeTooltip"
          />
        </TableCell>
        <TableCell>{`${formatAmount(position.leverage, 4, 2)}x`}</TableCell>
        <TableCell className="text-right">
          {liquidationPrice ? (
            <TooltipWithPortal
              position={index > 9 ? "top-end" : "bottom-end"}
              renderContent={renderLiquidationTooltip}
              handle={formatUsd(liquidationPrice, { maxThreshold: "1000000" })}
            />
          ) : (
            <TooltipWithPortal
              position={index > 9 ? "top-end" : "bottom-end"}
              renderContent={renderNaLiquidationTooltip}
              handle={t`NA`}
            />
          )}
        </TableCell>
      </tr>
    );
  }
);

const TableCell = memo(({ children, className }: { children: ReactNode; className?: string }) => {
  return <td className={className}>{children}</td>;
});

const EmptyRow = memo(() => {
  return (
    <tr className="Table_tr">
      <td colSpan={7} className="Table_no-results-row">
        <Trans>No results found</Trans>
      </td>
    </tr>
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
