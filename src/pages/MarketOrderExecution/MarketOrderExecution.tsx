import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { getAddress, isAddress } from "viem";

import { ARBITRUM, getExplorerUrl } from "config/chains";
import type { SortDirection } from "context/SorterContext/types";
import type { MarketsInfoData } from "domain/synthetics/markets/types";
import { useMarketsInfoRequest } from "domain/synthetics/markets/useMarketsInfoRequest";
import {
  MarketOrderExecutionRow,
  MarketOrderKind,
  MarketPerpOrderExecutionRow,
  MarketOrderPhase,
  MarketOrderSide,
  MarketSwapOrderExecutionRow,
} from "domain/synthetics/orders/marketOrderExecutions";
import {
  useMarketOrderExecutionRows,
  useMarketOrderExecutionStats,
} from "domain/synthetics/orders/useMarketOrderExecutions";
import { parseContractPrice, type TokenData, type TokensData } from "domain/synthetics/tokens";
import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { DateRange, normalizeDateRangeToUtcDays } from "lib/dates";
import { useDebounce } from "lib/debounce/useDebounce";
import { shortenAddress } from "lib/legacy";
import { formatTokenAmount, formatUsd, formatUsdPrice } from "lib/numbers";
import { getByKey } from "lib/objects";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";
import { getWrappedToken } from "sdk/configs/tokens";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Card from "components/Card/Card";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import { DateRangeSelect } from "components/DateRangeSelect/DateRangeSelect";
import Loader from "components/Loader/Loader";
import PageTitle from "components/PageTitle/PageTitle";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { MarketOrderExecutionSkeleton } from "components/Skeleton/Skeleton";
import { Sorter } from "components/Sorter/Sorter";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableOptionsFilter } from "components/TableOptionsFilter/TableOptionsFilter";
import type { Item } from "components/TableOptionsFilter/types";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

const SECONDS_IN_DAY = 24 * 60 * 60;
const MAX_QUERY_RANGE_SECONDS = 31 * SECONDS_IN_DAY;
const MAX_QUERY_RANGE_CALENDAR_DAYS = 30;
const TABLE_PAGE_SIZE = 10;
const DATE_RANGE_PRESET_PERIODS = ["days7", "days30"] as const;
const SUBSQUID_START_DATE = new Date(2025, 6, 28);
const WALLET_FILTER_ERROR_ID = "market-order-execution-wallet-error";
const CHART_MARGIN = { top: 16, right: 18, bottom: 28, left: 8 };
const BAR_CHART_MARGIN = { top: 28, right: 12, bottom: 8, left: 4 };
const CHART_TOOLTIP_WRAPPER_STYLE: React.CSSProperties = { zIndex: 10000 };
const DELAY_AXIS_DOMAIN: [number, "auto"] = [0, "auto"];
const PERCENTAGE_AXIS_DOMAIN: [number, number] = [0, 100];

const CHART_TICK_PROPS: React.SVGProps<SVGTextElement> = {
  fill: "var(--color-slate-100)",
  fontSize: 11,
  fontWeight: 500,
};

const CHART_GRID_PROPS = {
  vertical: false,
  strokeDasharray: "5 3",
  strokeWidth: 0.5,
  stroke: "var(--color-slate-600)",
};

const CHART_CURSOR_PROPS = {
  stroke: "var(--color-slate-500)",
  strokeWidth: 1,
  strokeDasharray: "2 2",
};

type ScatterPercentileRange = "all" | 0.9 | 0.95 | 0.99;

type ChartEligibleRow = MarketPerpOrderExecutionRow & {
  delaySeconds: number;
  fillDeltaBps: number;
};

type MarketOrderChartRow = ChartEligibleRow & {
  marketName: string;
};

type MetricChartRow = {
  label: string;
  value: number;
  count?: number;
  total?: number;
};

const TABLE_COLUMN_STYLES = {
  market: { width: "18%" },
  account: { width: "11%" },
  size: { width: "10%" },
  submitted: { width: "20%" },
  executed: { width: "20%" },
  delay: { width: "9%" },
  fillDelta: { width: "12%" },
};

export function MarketOrderExecution() {
  const { chainId, srcChainId } = useChainId();
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => [
    new Date(Date.now() - 7 * SECONDS_IN_DAY * 1000),
    new Date(),
  ]);
  const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);
  const [kind, setKind] = useState<MarketOrderKind>("perp");
  const [executionTimeSortDirection, setExecutionTimeSortDirection] = useState<SortDirection>("unspecified");
  const [priceImprovementSortDirection, setPriceImprovementSortDirection] = useState<SortDirection>("unspecified");
  const [scatterPercentileRange, setScatterPercentileRange] = useState<ScatterPercentileRange>("all");
  const [marketAddress, setMarketAddress] = useState<string>();
  const [phase, setPhase] = useState<MarketOrderPhase>();
  const [side, setSide] = useState<MarketOrderSide>();
  const [walletAddressInput, setWalletAddressInput] = useState("");
  const debouncedWalletAddress = useDebounce(walletAddressInput.trim(), 300);
  const isWalletAddressValid =
    debouncedWalletAddress.length === 0 || isAddress(debouncedWalletAddress, { strict: true });
  const account = isWalletAddressValid && debouncedWalletAddress ? getAddress(debouncedWalletAddress) : undefined;
  const [startDate, endDate] = dateRange;
  const [fromTimestamp, toTimestamp] = normalizeDateRangeToUtcDays(startDate, endDate);
  const isSupportedChain = chainId === ARBITRUM;
  const isQueryEnabled = isSupportedChain && isWalletAddressValid;
  const queryParams = {
    chainId,
    fromTimestamp,
    toTimestamp,
    marketAddress,
    account,
    kind,
    phase: kind === "perp" ? phase : undefined,
    side: kind === "perp" ? side : undefined,
  };

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const statsRequest = useMarketOrderExecutionStats(queryParams, isQueryEnabled);
  const stats = isQueryEnabled ? statsRequest.data : undefined;
  const statsError = isQueryEnabled ? statsRequest.error : undefined;
  const paginationKey = [
    chainId,
    kind,
    fromTimestamp,
    toTimestamp,
    marketAddress,
    phase,
    side,
    account,
    executionTimeSortDirection,
    priceImprovementSortDirection,
  ].join(":");
  const { currentPage, pageCount, setCurrentPage } = usePagination(
    paginationKey,
    [],
    TABLE_PAGE_SIZE,
    stats?.totalCount ?? 0
  );
  const rowsSort =
    kind === "perp" && priceImprovementSortDirection !== "unspecified"
      ? {
          sortField: "priceImprovement" as const,
          sortDirection: priceImprovementSortDirection,
        }
      : executionTimeSortDirection !== "unspecified"
        ? {
            sortField: "executionTime" as const,
            sortDirection: executionTimeSortDirection,
          }
        : undefined;
  const rowsRequest = useMarketOrderExecutionRows(
    {
      ...queryParams,
      offset: (currentPage - 1) * TABLE_PAGE_SIZE,
      limit: TABLE_PAGE_SIZE,
      sortField: rowsSort?.sortField,
      sortDirection: rowsSort?.sortDirection,
    },
    isQueryEnabled
  );
  const rows = isQueryEnabled ? rowsRequest.data : undefined;
  const rowsError = isQueryEnabled ? rowsRequest.error : undefined;
  const areRowsLoading = isQueryEnabled && statsError === undefined && (stats === undefined || rowsRequest.isLoading);
  const handleExecutionTimeSortChange = useCallback(
    (direction: SortDirection) => {
      setExecutionTimeSortDirection(direction);
      setPriceImprovementSortDirection("unspecified");
      setCurrentPage(1);
    },
    [setCurrentPage]
  );
  const handlePriceImprovementSortChange = useCallback(
    (direction: SortDirection) => {
      setPriceImprovementSortDirection(direction);
      setExecutionTimeSortDirection("unspecified");
      setCurrentPage(1);
    },
    [setCurrentPage]
  );
  const handleDateRangeChange = useCallback((nextDateRange: DateRange) => {
    const [nextStartDate, nextEndDate] = nextDateRange;

    if (!nextStartDate || !nextEndDate) {
      setIsDateRangeInvalid(true);
      return;
    }

    const [nextFromTimestamp, nextToTimestamp] = normalizeDateRangeToUtcDays(nextStartDate, nextEndDate);

    if (nextToTimestamp - nextFromTimestamp > MAX_QUERY_RANGE_SECONDS) {
      setIsDateRangeInvalid(true);
      return;
    }

    setIsDateRangeInvalid(false);
    setDateRange([nextStartDate, nextEndDate]);
  }, []);

  const marketOptions = useMemo<Item<string>[]>(
    () =>
      Object.values(marketsInfoData || {})
        .filter((market) => kind === "swap" || !market.isSpotOnly)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((market) => ({
          data: market.marketTokenAddress,
          text: market.name,
        })),
    [kind, marketsInfoData]
  );
  const kindOptions = useMemo<Item<MarketOrderKind>[]>(
    () => [
      { data: "perp", text: t`Perp` },
      { data: "swap", text: t`Swap` },
    ],
    []
  );
  const phaseOptions = useMemo<Item<MarketOrderPhase>[]>(
    () => [
      { data: "increase", text: t`Increase` },
      { data: "decrease", text: t`Decrease` },
    ],
    []
  );
  const sideOptions = useMemo<Item<MarketOrderSide>[]>(
    () => [
      { data: "long", text: t`Long` },
      { data: "short", text: t`Short` },
    ],
    []
  );
  const scatterPercentileOptions = useMemo(
    () => [
      { value: "all" as const, label: t`All` },
      { value: 0.99 as const, label: "P99" },
      { value: 0.95 as const, label: "P95" },
      { value: 0.9 as const, label: "P90" },
    ],
    []
  );
  const delayAxisLabel = useMemo(
    () => ({
      value: t`Creation → execution (seconds)`,
      position: "insideBottom" as const,
      offset: -16,
      fill: "var(--color-slate-100)",
    }),
    []
  );
  const percentileStats = useMemo(() => stats?.percentiles ?? [], [stats?.percentiles]);
  const delayPercentileRows = useMemo(
    () =>
      percentileStats.flatMap((stat): MetricChartRow[] =>
        stat.delaySeconds === null ? [] : [{ label: formatPercentileLabel(stat.percentile), value: stat.delaySeconds }]
      ),
    [percentileStats]
  );
  const fillDeltaPercentileRows = useMemo(
    () =>
      percentileStats.flatMap((stat): MetricChartRow[] =>
        stat.absoluteFillDeltaBps === null
          ? []
          : [{ label: formatPercentileLabel(stat.percentile), value: stat.absoluteFillDeltaBps }]
      ),
    [percentileStats]
  );
  const delayThresholdRows = useMemo(
    () =>
      (stats?.delayThresholds ?? []).map(
        (stat): MetricChartRow => ({
          label: `${formatNumber(stat.threshold, 0)}s`,
          value: stat.percentage,
          count: stat.count,
          total: stat.total,
        })
      ),
    [stats?.delayThresholds]
  );
  const fillDeltaThresholdRows = useMemo(
    () =>
      (stats?.priceThresholds ?? []).map(
        (stat): MetricChartRow => ({
          label: stat.threshold < 1 ? t`Any` : formatNumber(stat.threshold, 0),
          value: stat.percentage,
          count: stat.count,
          total: stat.total,
        })
      ),
    [stats?.priceThresholds]
  );
  const sampleRows = useMemo(() => stats?.sample ?? [], [stats?.sample]);
  const chartEligibleRows = useMemo(
    () => sampleRows.filter((row): row is ChartEligibleRow => row.delaySeconds !== null && row.fillDeltaBps !== null),
    [sampleRows]
  );
  const scatterRangeRows = useMemo(() => {
    if (scatterPercentileRange === "all") {
      return chartEligibleRows;
    }

    const bounds = percentileStats.find((stat) => stat.percentile === scatterPercentileRange);

    if (!bounds || bounds.delaySeconds === null || bounds.absoluteFillDeltaBps === null) {
      return [];
    }

    const maxDelaySeconds = bounds.delaySeconds;
    const maxFillDeltaBps = bounds.absoluteFillDeltaBps;

    return chartEligibleRows.filter(
      (row) => row.delaySeconds <= maxDelaySeconds && Math.abs(row.fillDeltaBps) <= maxFillDeltaBps
    );
  }, [chartEligibleRows, percentileStats, scatterPercentileRange]);
  const chartRows = useMemo(
    () =>
      scatterRangeRows.map(
        (row): MarketOrderChartRow => ({
          ...row,
          marketName: getOrderMarketName(chainId, row, marketsInfoData, tokensData),
        })
      ),
    [chainId, marketsInfoData, scatterRangeRows, tokensData]
  );
  const increaseChartRows = useMemo(
    () => chartRows.filter((row) => row.kind === "perp" && row.phase === "increase"),
    [chartRows]
  );
  const decreaseChartRows = useMemo(
    () => chartRows.filter((row) => row.kind === "perp" && row.phase === "decrease"),
    [chartRows]
  );
  const isLoading = isQueryEnabled && !stats && !statsError;
  const tableRows = useMemo(
    () => (stats === undefined || statsError !== undefined ? [] : rows ?? []),
    [rows, stats, statsError]
  );
  const tableError = statsError ?? rowsError;
  const totalCount = stats?.totalCount ?? 0;
  const pageFrom = totalCount ? (currentPage - 1) * TABLE_PAGE_SIZE + 1 : 0;
  const pageTo = Math.min(totalCount, currentPage * TABLE_PAGE_SIZE);

  return (
    <AppPageLayout title={t`Market order execution`} header={<ChainContentHeader />}>
      <div className="default-container page-layout flex flex-col gap-16">
        <PageTitle
          title={t`Market order execution`}
          subtitle={t`Compare the latest preceding oracle observations and order timestamps with actual fills`}
          qa="market-order-execution-page"
        />

        <div className="text-body-small rounded-8 border border-slate-700 bg-slate-900 px-16 py-12 text-typography-secondary">
          {kind === "perp" ? (
            <Trans>
              Reference price uses the latest indexed Chainlink Data Streams OraclePriceUpdate observation at or before
              order creation, regardless of its age. The displayed oracle age shows how stale that observation was and
              it may not represent the market price at creation. A positive comparison means the execution was favorable
              to the trader.
            </Trans>
          ) : (
            <Trans>
              Swap analytics include creation-to-execution timing only. Minimum output is a protection boundary, not a
              creation-time market price, so it is not used to measure price quality.
            </Trans>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-8 rounded-8 bg-slate-900 p-12">
          <TableOptionsFilter<MarketOrderKind>
            asButton
            forceIsActive
            label={kind === "perp" ? t`Type: Perp` : t`Type: Swap`}
            options={kindOptions}
            value={kind}
            onChange={(value) => {
              const nextKind = value ?? "perp";

              if (nextKind !== kind) {
                setMarketAddress(undefined);
              }

              if (nextKind === "swap") {
                setPriceImprovementSortDirection("unspecified");
              }

              setKind(nextKind);
            }}
            placeholder={t`Search order categories`}
          />
          <TableOptionsFilter<string>
            asButton
            label={marketAddress ? t`Market: ${getMarketName(marketsInfoData, marketAddress)}` : t`Market`}
            options={marketOptions}
            value={marketAddress}
            onChange={setMarketAddress}
            placeholder={t`Search markets`}
          />
          {kind === "perp" && (
            <>
              <TableOptionsFilter<MarketOrderPhase>
                asButton
                label={phase ? t`Order: ${getPhaseLabel(phase)}` : t`Order`}
                options={phaseOptions}
                value={phase}
                onChange={setPhase}
                placeholder={t`Search order types`}
              />
              <TableOptionsFilter<MarketOrderSide>
                asButton
                label={side ? t`Side: ${getSideLabel(side)}` : t`Side`}
                options={sideOptions}
                value={side}
                onChange={setSide}
                placeholder={t`Search sides`}
              />
            </>
          )}
          <DateRangeSelect
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateRangeChange}
            buttonVariant="secondary"
            popupPlacement="bottom-end"
            presetPeriods={DATE_RANGE_PRESET_PERIODS}
            minDate={SUBSQUID_START_DATE}
          />
          <SearchInput
            className="min-w-[220px] max-w-[300px] grow"
            value={walletAddressInput}
            setValue={setWalletAddressInput}
            placeholder={t`Filter wallet address`}
            autoFocus={false}
            qa="market-order-execution-wallet-filter"
            ariaLabel={t`Filter wallet address`}
            ariaInvalid={!isWalletAddressValid}
            ariaDescribedBy={!isWalletAddressValid ? WALLET_FILTER_ERROR_ID : undefined}
          />
        </div>

        {!isSupportedChain && (
          <div className="text-body-small rounded-8 border border-yellow-500 bg-yellow-500/10 px-16 py-12 text-yellow-300">
            <Trans>Market order execution analytics are currently available on Arbitrum only.</Trans>
          </div>
        )}
        {!isWalletAddressValid && (
          <div
            id={WALLET_FILTER_ERROR_ID}
            role="alert"
            className="text-body-small rounded-8 border border-red-500 bg-red-500/10 px-16 py-12 text-red-500"
          >
            <Trans>Enter a valid wallet address.</Trans>
          </div>
        )}
        {isDateRangeInvalid && (
          <div className="text-body-small rounded-8 border border-red-500 bg-red-500/10 px-16 py-12 text-red-500">
            <Trans>Choose a date range of {MAX_QUERY_RANGE_CALENDAR_DAYS} days or less.</Trans>
          </div>
        )}
        {statsError && (
          <div className="text-body-small rounded-8 border border-red-500 bg-red-500/10 px-16 py-12 text-red-500">
            <Trans>Could not load market order execution analytics.</Trans>
          </div>
        )}

        <div
          className={cx(
            "grid grid-cols-1 gap-12 sm:grid-cols-2",
            kind === "perp" ? "xl:grid-cols-5" : "xl:grid-cols-4"
          )}
        >
          <SummaryCard
            label={t`Executed market orders`}
            value={formatCount(stats?.totalCount)}
            detail={t`${formatCount(stats?.timingCount)} with timing data`}
          />
          <SummaryCard
            label={t`Median execution time`}
            value={formatDuration(stats?.medianDelaySeconds ?? null)}
            detail={t`Creation to execution`}
          />
          <SummaryCard
            label={t`P95 execution time`}
            value={formatDuration(stats?.p95DelaySeconds ?? null)}
            detail={t`Creation to execution`}
          />
          {kind === "perp" ? (
            <>
              <SummaryCard
                label={t`Median oracle age`}
                value={formatOracleAge(stats?.medianReferenceAgeSeconds ?? null)}
                detail={t`P95 oracle age: ${formatOracleAge(stats?.p95ReferenceAgeSeconds ?? null)}`}
              />
              <SummaryCard
                label={t`Median price improvement`}
                value={formatBps(stats?.medianSignedFillDeltaBps ?? null)}
                detail={t`${formatCount(stats?.pricedCount)} of ${formatCount(stats?.totalCount)} orders with a preceding oracle observation`}
              />
            </>
          ) : (
            <SummaryCard
              label={t`Orders with timing data`}
              value={formatCount(stats?.timingCount)}
              detail={t`Creation timestamp available`}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
          <MetricChartCard
            title={t`Execution delay percentiles`}
            subtitle={t`Full selected population with creation timestamps`}
            data={delayPercentileRows}
            valueFormatter={formatDuration}
            emptyText={t`No paired timing data`}
            isLoading={isLoading}
            hasError={statsError !== undefined}
          />
          {kind === "perp" && (
            <MetricChartCard
              title={t`Absolute oracle-to-fill difference`}
              subtitle={t`Magnitude of fill price versus the latest preceding oracle observation`}
              data={fillDeltaPercentileRows}
              valueFormatter={formatBps}
              emptyText={t`No orders with a preceding oracle observation`}
              isLoading={isLoading}
              hasError={statsError !== undefined}
            />
          )}
          <MetricChartCard
            title={t`Orders at or above execution delay`}
            subtitle={t`Cumulative share of all orders with timing data`}
            data={delayThresholdRows}
            valueFormatter={formatPercentage}
            domain={PERCENTAGE_AXIS_DOMAIN}
            emptyText={t`No paired timing data`}
            isLoading={isLoading}
            hasError={statsError !== undefined}
          />
          {kind === "perp" && (
            <MetricChartCard
              title={t`Orders at or above absolute oracle-to-fill difference`}
              subtitle={t`Cumulative share of orders with a preceding oracle observation`}
              data={fillDeltaThresholdRows}
              valueFormatter={formatPercentage}
              domain={PERCENTAGE_AXIS_DOMAIN}
              emptyText={t`No orders with a preceding oracle observation`}
              isLoading={isLoading}
              hasError={statsError !== undefined}
            />
          )}
        </div>

        {kind === "perp" && (
          <Card
            title={
              <div className="flex w-full flex-wrap items-start justify-between gap-12">
                <div>
                  <div className="text-body-large font-medium">
                    <Trans>Execution time vs price improvement</Trans>
                  </div>
                  <div className="text-body-small mt-2 text-typography-secondary">
                    <Trans>
                      {chartEligibleRows.length} time-stratified samples from {formatCount(stats?.pricedCount)} orders
                      with a preceding oracle observation
                    </Trans>
                    {scatterPercentileRange !== "all" && (
                      <span>
                        {" · "}
                        <Trans>
                          {scatterRangeRows.length} samples within {formatPercentileLabel(scatterPercentileRange)}{" "}
                          bounds
                        </Trans>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-8 sm:items-end">
                  <div className="flex flex-wrap items-center gap-8">
                    <span className="text-body-small text-typography-secondary">
                      <Trans>Percentile range</Trans>
                    </span>
                    <Tabs<ScatterPercentileRange>
                      type="inline"
                      selectedValue={scatterPercentileRange}
                      onChange={setScatterPercentileRange}
                      options={scatterPercentileOptions}
                      tabsWrapperClassName="w-auto"
                      qa="market-order-execution-percentile-range"
                    />
                  </div>
                  <div className="text-body-small flex items-center gap-16 text-typography-secondary">
                    <>
                      <Legend colorClassName="bg-blue-300" label={t`Increase`} />
                      <Legend colorClassName="bg-red-500" label={t`Decrease`} />
                    </>
                  </div>
                </div>
              </div>
            }
            bodyPadding
          >
            <div className="h-[360px]">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader />
                </div>
              ) : statsError ? (
                <div className="flex h-full items-center justify-center text-red-500">
                  <Trans>Could not load market order executions</Trans>
                </div>
              ) : chartRows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-typography-secondary">
                  <Trans>No executions with a preceding oracle observation for the selected filters</Trans>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" debounce={100}>
                  <ScatterChart margin={CHART_MARGIN}>
                    <CartesianGrid {...CHART_GRID_PROPS} />
                    <XAxis
                      type="number"
                      dataKey="delaySeconds"
                      domain={DELAY_AXIS_DOMAIN}
                      tick={CHART_TICK_PROPS}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatAxisSeconds}
                      name={t`Execution time`}
                      unit="s"
                      label={delayAxisLabel}
                    />
                    <YAxis
                      type="number"
                      dataKey="fillDeltaBps"
                      tick={CHART_TICK_PROPS}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatAxisBps}
                      width={54}
                      name={t`Execution price improvement`}
                      unit=" bps"
                    />
                    <ReferenceLine y={0} stroke="var(--color-slate-500)" strokeWidth={0.5} />
                    <RechartsTooltip
                      cursor={CHART_CURSOR_PROPS}
                      isAnimationActive={false}
                      content={
                        <MarketOrderChartTooltip
                          chainId={chainId}
                          marketsInfoData={marketsInfoData}
                          tokensData={tokensData}
                        />
                      }
                      wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                    />
                    <Scatter data={increaseChartRows} fill="var(--color-blue-300)" isAnimationActive={false} />
                    <Scatter data={decreaseChartRows} fill="var(--color-red-500)" isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        )}

        <Card
          title={
            <div className="flex w-full flex-wrap items-center justify-between gap-12">
              <span>
                <Trans>Market orders</Trans>
              </span>
              <span className="text-body-small text-typography-secondary">
                {kind === "perp" && priceImprovementSortDirection === "desc" ? (
                  <Trans>Best price improvement first · server-paginated</Trans>
                ) : kind === "perp" && priceImprovementSortDirection === "asc" ? (
                  <Trans>Worst price improvement first · server-paginated</Trans>
                ) : executionTimeSortDirection === "desc" ? (
                  <Trans>Longest execution time first · server-paginated</Trans>
                ) : executionTimeSortDirection === "asc" ? (
                  <Trans>Shortest execution time first · server-paginated</Trans>
                ) : (
                  <Trans>Newest first · server-paginated</Trans>
                )}
              </span>
            </div>
          }
          bodyPadding={false}
        >
          <MarketOrderPairsTable
            chainId={chainId}
            kind={kind}
            rows={tableRows}
            marketsInfoData={marketsInfoData}
            tokensData={tokensData}
            isLoading={areRowsLoading}
            error={tableError}
            executionTimeSortDirection={executionTimeSortDirection}
            priceImprovementSortDirection={priceImprovementSortDirection}
            onExecutionTimeSortChange={handleExecutionTimeSortChange}
            onPriceImprovementSortChange={handlePriceImprovementSortChange}
          />
          {stats !== undefined && statsError === undefined && (
            <div className="flex flex-wrap items-center justify-between gap-12 border-t border-stroke-primary px-12 py-8">
              <span className="text-body-small text-typography-secondary numbers">
                <Trans>
                  {pageFrom}-{pageTo} of {totalCount}
                </Trans>
              </span>
              <BottomTablePagination
                className="!p-0"
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>
      </div>
    </AppPageLayout>
  );
}

function MetricChartCard({
  title,
  subtitle,
  data,
  valueFormatter,
  domain = DELAY_AXIS_DOMAIN,
  emptyText,
  isLoading,
  hasError,
}: {
  title: string;
  subtitle: string;
  data: MetricChartRow[];
  valueFormatter: (value: number) => string;
  domain?: [number, number | "auto"];
  emptyText: string;
  isLoading: boolean;
  hasError: boolean;
}) {
  const hasData = data.length > 0 && data.some((row) => row.total === undefined || row.total > 0);

  return (
    <Card
      title={
        <div>
          <div className="text-body-large font-medium">{title}</div>
          <div className="text-body-small mt-2 text-typography-secondary">{subtitle}</div>
        </div>
      }
      bodyPadding
    >
      <div className="h-[260px]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader />
          </div>
        ) : hasError ? (
          <div className="flex h-full items-center justify-center text-red-500">
            <Trans>Could not load market order execution analytics.</Trans>
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center text-typography-secondary">{emptyText}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <BarChart data={data} margin={BAR_CHART_MARGIN}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis
                dataKey="label"
                tick={CHART_TICK_PROPS}
                tickLine={false}
                axisLine={false}
                interval={0}
                tickMargin={8}
              />
              <YAxis
                type="number"
                dataKey="value"
                domain={domain}
                tick={CHART_TICK_PROPS}
                tickLine={false}
                axisLine={false}
                tickFormatter={valueFormatter}
                width={62}
              />
              <RechartsTooltip
                cursor={false}
                isAnimationActive={false}
                content={<MetricChartTooltip valueFormatter={valueFormatter} />}
                wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
              />
              <Bar dataKey="value" fill="var(--color-blue-300)" maxBarSize={44} isAnimationActive={false}>
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={valueFormatter}
                  fill="var(--color-slate-100)"
                  fontSize={11}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function MetricChartTooltip({
  active,
  payload,
  valueFormatter,
}: TooltipProps<number, string> & {
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0].payload as MetricChartRow;

  return (
    <div className="min-w-[180px] rounded-8 border border-slate-600 bg-slate-900 p-12 shadow-2xl">
      <div className="font-medium">{row.label}</div>
      <div className="text-body-small mt-6 numbers">{valueFormatter(row.value)}</div>
      {row.count !== undefined && row.total !== undefined && (
        <div className="text-body-small mt-2 text-typography-secondary">
          <Trans>
            {row.count} of {row.total} eligible orders
          </Trans>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-8 bg-slate-900 p-16">
      <div className="text-caption text-typography-secondary">{label}</div>
      <div className="mt-8 text-24 font-medium text-typography-primary numbers">{value}</div>
      <div className="text-body-small mt-4 text-typography-secondary">{detail}</div>
    </div>
  );
}

function Legend({ colorClassName, label }: { colorClassName: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-6">
      <span className={cx("size-8 rounded-full", colorClassName)} />
      {label}
    </span>
  );
}

export function MarketOrderChartTooltip({
  active,
  payload,
  chainId,
  marketsInfoData,
  tokensData,
}: TooltipProps<number, string> & {
  chainId: number;
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0].payload as MarketOrderChartRow;

  if (row.kind !== "perp") {
    return null;
  }

  const values = getOrderDisplayValues(chainId, row, marketsInfoData, tokensData);
  const explorerUrl = getExplorerUrl(chainId);

  return (
    <div className="min-w-[240px] max-w-[380px] rounded-8 border border-slate-600 bg-slate-900 p-12 shadow-2xl">
      <div className="font-medium">{row.marketName}</div>
      <div className="text-body-small mt-2 capitalize text-typography-secondary">
        {getPhaseLabel(row.phase)} · {getSideLabel(row.side)}
      </div>
      <div className="text-body-small mt-10 flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          <TooltipRow label={t`Pre-creation oracle price`} value={values.submitted} />
          <TooltipRow label={t`Oracle age at creation`} value={formatOracleObservationAge(row.referenceAgeSeconds)} />
          <TooltipRow label={t`Oracle source`} value={t`Chainlink Data Streams`} />
          <TooltipRow
            label={t`Observed`}
            value={row.creationReferenceTimestamp === null ? "—" : formatEventTime(row.creationReferenceTimestamp)}
          />
          <TooltipRow label={t`Provider`} value={row.creationReferenceProvider ?? "—"} />
          <TooltipRow label={t`Observation ID`} value={row.creationReferenceObservationId ?? "—"} />
          <TooltipRow
            label={t`oracle tx`}
            value={
              row.creationReferenceTxnHash === null ? (
                "—"
              ) : (
                <ExplorerTransactionLink
                  explorerUrl={explorerUrl}
                  transactionHash={row.creationReferenceTxnHash}
                  label={t`View`}
                />
              )
            }
          />
        </div>
        <div className="mt-4 flex flex-col gap-6 border-t border-slate-700 pt-8">
          <TooltipRow label={t`Execution oracle price`} value={values.executionReference} />
          <TooltipRow
            label={t`Oracle age at execution`}
            value={formatExecutionOracleObservationAge(row.executionReferenceAgeSeconds)}
          />
          <TooltipRow
            label={t`Oracle source`}
            value={row.executionReferencePrice === null ? "—" : t`Chainlink Data Streams`}
          />
          <TooltipRow
            label={t`Observed`}
            value={row.executionReferenceTimestamp === null ? "—" : formatEventTime(row.executionReferenceTimestamp)}
          />
          <TooltipRow label={t`Provider`} value={row.executionReferenceProvider ?? "—"} />
          <TooltipRow label={t`Observation ID`} value={row.executionReferenceObservationId ?? "—"} />
          <TooltipRow
            label={t`oracle tx`}
            value={
              row.executionReferenceTxnHash === null ? (
                "—"
              ) : (
                <ExplorerTransactionLink
                  explorerUrl={explorerUrl}
                  transactionHash={row.executionReferenceTxnHash}
                  label={t`View`}
                />
              )
            }
          />
        </div>
        <TooltipRow label={t`Fill price`} value={values.executed} />
        <TooltipRow label={t`Execution time`} value={formatDuration(row.delaySeconds)} />
        <TooltipRow label={t`Execution price improvement`} value={formatBps(row.fillDeltaBps)} />
        <TooltipRow label={t`Oracle move`} value={formatBps(row.oracleMoveBps)} />
        <TooltipRow label={t`Execution impact`} value={formatBps(row.executionImpactBps)} />
        <TooltipRow label={t`Size`} value={values.size} />
      </div>
    </div>
  );
}

function TooltipRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-16">
      <span className="text-typography-secondary">{label}</span>
      <span className="min-w-0 break-all text-right numbers">{value}</span>
    </div>
  );
}

export function MarketOrderPairsTable({
  chainId,
  kind,
  rows,
  marketsInfoData,
  tokensData,
  isLoading,
  error,
  executionTimeSortDirection,
  priceImprovementSortDirection,
  onExecutionTimeSortChange,
  onPriceImprovementSortChange,
}: {
  chainId: number;
  kind: MarketOrderKind;
  rows: MarketOrderExecutionRow[];
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
  isLoading: boolean;
  error: unknown;
  executionTimeSortDirection: SortDirection;
  priceImprovementSortDirection: SortDirection;
  onExecutionTimeSortChange: (direction: SortDirection) => void;
  onPriceImprovementSortChange: (direction: SortDirection) => void;
}) {
  const explorerUrl = getExplorerUrl(chainId);

  return (
    <TableScrollFadeContainer>
      <Table className="w-[max(100%,1320px)] table-fixed">
        <colgroup>
          {Object.entries(TABLE_COLUMN_STYLES).map(([key, style]) => (
            <col key={key} style={style} />
          ))}
        </colgroup>
        <thead>
          <TableTheadTr>
            <TableTh padding="compact">
              <Trans>Market / order</Trans>
            </TableTh>
            <TableTh padding="compact">
              <Trans>Account</Trans>
            </TableTh>
            <TableTh padding="compact" className="text-right">
              {kind === "perp" ? <Trans>Size</Trans> : <Trans>Input</Trans>}
            </TableTh>
            <TableTh padding="compact">
              {kind === "perp" ? <Trans>Created / oracle observation</Trans> : <Trans>Created / min output</Trans>}
            </TableTh>
            <TableTh padding="compact">
              {kind === "perp" ? <Trans>Executed / fill</Trans> : <Trans>Executed / actual output</Trans>}
            </TableTh>
            <TableTh
              padding="compact"
              className="text-right"
              aria-sort={
                executionTimeSortDirection === "unspecified"
                  ? "none"
                  : executionTimeSortDirection === "desc"
                    ? "descending"
                    : "ascending"
              }
            >
              <Sorter direction={executionTimeSortDirection} onChange={onExecutionTimeSortChange}>
                <Trans>Execution time</Trans>
              </Sorter>
            </TableTh>
            <TableTh
              padding="compact"
              className="text-right"
              aria-sort={
                kind === "perp"
                  ? priceImprovementSortDirection === "unspecified"
                    ? "none"
                    : priceImprovementSortDirection === "desc"
                      ? "descending"
                      : "ascending"
                  : undefined
              }
            >
              {kind === "perp" ? (
                <Sorter direction={priceImprovementSortDirection} onChange={onPriceImprovementSortChange}>
                  <TooltipWithPortal
                    as="span"
                    variant="underline"
                    disableClickToggle
                    shouldPreventDefault={false}
                    content={t`Signed difference between the execution price and the latest preceding oracle observation. Positive values are favorable to the trader. Check the displayed oracle age because older observations may be stale.`}
                  >
                    <Trans>Execution price</Trans>
                  </TooltipWithPortal>
                </Sorter>
              ) : (
                <Trans>Price quality</Trans>
              )}
            </TableTh>
          </TableTheadTr>
        </thead>
        <tbody aria-busy={isLoading}>
          {isLoading && <MarketOrderExecutionSkeleton />}
          {!isLoading && error !== undefined && (
            <TableTr>
              <TableTd padding="compact" colSpan={7} className="h-80 text-center text-red-500">
                <Trans>Could not load market order executions</Trans>
              </TableTd>
            </TableTr>
          )}
          {!isLoading && error === undefined && rows.length === 0 && (
            <TableTr>
              <TableTd padding="compact" colSpan={7} className="h-80 text-center text-typography-secondary">
                <Trans>No matching executions</Trans>
              </TableTd>
            </TableTr>
          )}
          {!isLoading &&
            error === undefined &&
            rows.map((row) => {
              const values = getOrderDisplayValues(chainId, row, marketsInfoData, tokensData);

              return (
                <TableTr key={`${row.orderKey}:${row.executedTransactionHash}`} hoverable>
                  <TableTd padding="compact">
                    <div className="truncate font-medium">
                      {getOrderMarketName(chainId, row, marketsInfoData, tokensData)}
                    </div>
                    <div className="text-body-small mt-2 capitalize text-typography-secondary">
                      {row.kind === "perp" ? `${getPhaseLabel(row.phase)} · ${getSideLabel(row.side)}` : t`Swap`}
                    </div>
                  </TableTd>
                  <TableTd padding="compact">
                    <Link
                      to={buildAccountDashboardUrl(row.account, chainId, 2)}
                      className="hover:text-blue-200 text-blue-300"
                    >
                      {shortenAddress(row.account, 13)}
                    </Link>
                  </TableTd>
                  <TableTd padding="compact" className="text-right numbers">
                    {values.size}
                  </TableTd>
                  <TableTd padding="compact">
                    {row.kind === "perp" ? (
                      <CreationEventCell row={row} price={values.submitted} explorerUrl={explorerUrl} />
                    ) : (
                      <EventCell
                        timestamp={row.submittedTimestamp}
                        price={values.submitted}
                        transactionHash={row.submittedTransactionHash}
                        explorerUrl={explorerUrl}
                      />
                    )}
                  </TableTd>
                  <TableTd padding="compact">
                    <EventCell
                      timestamp={row.executedTimestamp}
                      price={values.executed}
                      transactionHash={row.executedTransactionHash}
                      explorerUrl={explorerUrl}
                    />
                  </TableTd>
                  <TableTd padding="compact" className="text-right numbers">
                    {formatDuration(row.delaySeconds)}
                  </TableTd>
                  <TableTd
                    padding="compact"
                    className={cx("text-right numbers", {
                      "text-green-500": row.fillDeltaBps !== null && row.fillDeltaBps >= 0,
                      "text-red-500": row.fillDeltaBps !== null && row.fillDeltaBps < 0,
                    })}
                  >
                    {row.kind === "perp" && row.fillDeltaBps === null ? (
                      <TooltipWithPortal
                        as="span"
                        variant="underline"
                        content={
                          row.creationReferencePrice === null
                            ? t`No preceding Chainlink Data Streams observation available`
                            : t`Execution price comparison unavailable`
                        }
                      >
                        —
                      </TooltipWithPortal>
                    ) : (
                      formatBps(row.fillDeltaBps)
                    )}
                  </TableTd>
                </TableTr>
              );
            })}
        </tbody>
      </Table>
    </TableScrollFadeContainer>
  );
}

function CreationEventCell({
  row,
  price,
  explorerUrl,
}: {
  row: MarketPerpOrderExecutionRow;
  price: string;
  explorerUrl: string;
}) {
  const hasObservation = row.creationReferencePrice !== null && row.referenceAgeSeconds !== null;
  const provenance = (
    <div className="flex max-w-[340px] flex-col gap-4 break-all">
      <div className="font-medium">
        <Trans>Chainlink Data Streams</Trans>
      </div>
      {row.creationReferenceTimestamp !== null && (
        <div>
          <span className="text-typography-secondary">
            <Trans>Observed</Trans>:
          </span>{" "}
          <span className="numbers">{formatEventTime(row.creationReferenceTimestamp)}</span>
        </div>
      )}
      {row.creationReferenceProvider !== null && (
        <div>
          <span className="text-typography-secondary">
            <Trans>Provider</Trans>:
          </span>{" "}
          <span className="numbers">{row.creationReferenceProvider}</span>
        </div>
      )}
      {row.creationReferenceObservationId !== null && (
        <div>
          <span className="text-typography-secondary">
            <Trans>Observation ID</Trans>:
          </span>{" "}
          <span className="numbers">{row.creationReferenceObservationId}</span>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="numbers">
        {row.submittedTimestamp === null ? "—" : formatEventTime(row.submittedTimestamp)}
        {row.submittedTransactionHash && (
          <>
            {" · "}
            <ExplorerTransactionLink
              explorerUrl={explorerUrl}
              transactionHash={row.submittedTransactionHash}
              label={t`order tx`}
            />
          </>
        )}
      </div>
      {hasObservation ? (
        <>
          <div className="text-body-small mt-2 text-typography-secondary numbers">{price}</div>
          <div className="text-body-small mt-2 text-typography-secondary">
            <span className="numbers">{formatOracleObservationAge(row.referenceAgeSeconds)}</span>
            {" · "}
            <TooltipWithPortal
              as="span"
              variant="underline"
              disableClickToggle
              content={provenance}
              shouldPreventDefault={false}
            >
              <Trans>Chainlink Data Streams</Trans>
            </TooltipWithPortal>
            {row.creationReferenceTxnHash && (
              <>
                {" · "}
                <ExplorerTransactionLink
                  explorerUrl={explorerUrl}
                  transactionHash={row.creationReferenceTxnHash}
                  label={t`oracle tx`}
                />
              </>
            )}
          </div>
        </>
      ) : (
        <div className="text-body-small mt-2 text-typography-secondary">
          <Trans>No preceding Chainlink Data Streams observation available</Trans>
        </div>
      )}
    </div>
  );
}

function EventCell({
  timestamp,
  price,
  transactionHash,
  explorerUrl,
}: {
  timestamp: number | null;
  price: string;
  transactionHash: string | null;
  explorerUrl: string;
}) {
  return (
    <div>
      <div className="numbers">{timestamp === null ? "—" : formatEventTime(timestamp)}</div>
      <div className="text-body-small mt-2 text-typography-secondary numbers">
        {price}
        {transactionHash && (
          <>
            {" · "}
            <ExplorerTransactionLink explorerUrl={explorerUrl} transactionHash={transactionHash} label={t`tx`} />
          </>
        )}
      </div>
    </div>
  );
}

function ExplorerTransactionLink({
  explorerUrl,
  transactionHash,
  label,
}: {
  explorerUrl: string;
  transactionHash: string;
  label: string;
}) {
  return (
    <a
      href={`${explorerUrl}tx/${transactionHash}`}
      target="_blank"
      rel="noreferrer"
      className="hover:text-blue-200 text-blue-300"
    >
      {label}
    </a>
  );
}

function getMarketName(marketsInfoData: MarketsInfoData | undefined, marketAddress: string) {
  return getByKey(marketsInfoData, marketAddress)?.name ?? shortenAddress(marketAddress, 18) ?? marketAddress;
}

function getOrderMarketName(
  chainId: number,
  row: MarketOrderExecutionRow,
  marketsInfoData: MarketsInfoData | undefined,
  tokensData: TokensData | undefined
) {
  if (row.kind === "perp") {
    return getMarketName(marketsInfoData, row.marketAddress);
  }

  const { inputToken, outputToken } = getSwapTokens(chainId, row, marketsInfoData, tokensData);
  const inputName = inputToken?.symbol ?? shortenAddress(row.initialCollateralTokenAddress, 12);
  const outputName = outputToken?.symbol ?? t`Unknown`;

  return `${inputName} → ${outputName}`;
}

function getPhaseLabel(phase: MarketOrderPhase) {
  return phase === "increase" ? t`Increase` : t`Decrease`;
}

function getSideLabel(side: MarketOrderSide) {
  return side === "long" ? t`Long` : t`Short`;
}

function getOrderDisplayValues(
  chainId: number,
  row: MarketOrderExecutionRow,
  marketsInfoData: MarketsInfoData | undefined,
  tokensData: TokensData | undefined
) {
  if (row.kind === "perp") {
    const market = getByKey(marketsInfoData, row.marketAddress);
    const visualMultiplier = market?.indexToken.visualMultiplier;
    const indexTokenDecimals = market?.indexToken.decimals;

    return {
      size: formatOrderSize(row.sizeDeltaUsd),
      submitted: formatOrderPrice(row.creationReferencePrice, indexTokenDecimals, visualMultiplier),
      executionReference: formatOrderPrice(row.executionReferencePrice, indexTokenDecimals, visualMultiplier),
      executed: formatOrderPrice(row.executionPrice, indexTokenDecimals, visualMultiplier),
    };
  }

  const { inputToken, outputToken } = getSwapTokens(chainId, row, marketsInfoData, tokensData);

  return {
    size: formatSwapAmount(row.initialCollateralDeltaAmount, inputToken),
    submitted: formatSwapAmount(row.minOutputAmount, outputToken),
    executionReference: "—",
    executed: formatSwapAmount(row.executionAmountOut, outputToken),
  };
}

function getSwapTokens(
  chainId: number,
  row: MarketSwapOrderExecutionRow,
  marketsInfoData: MarketsInfoData | undefined,
  tokensData: TokensData | undefined
) {
  const inputToken = getByKey(tokensData, row.initialCollateralTokenAddress);

  if (!marketsInfoData) {
    return { inputToken, outputToken: undefined };
  }

  const wrappedToken = getWrappedToken(chainId);
  const { outTokenAddress } = getSwapPathOutputAddresses({
    marketsInfoData,
    initialCollateralAddress: row.initialCollateralTokenAddress,
    swapPath: row.swapPath,
    wrappedNativeTokenAddress: wrappedToken.address,
    shouldUnwrapNativeToken: row.shouldUnwrapNativeToken,
    isIncrease: false,
  });

  return {
    inputToken,
    outputToken: getByKey(tokensData, outTokenAddress),
  };
}

function formatSwapAmount(amount: string | null, token: TokenData | undefined) {
  if (!amount) {
    return "—";
  }

  try {
    return (
      formatTokenAmount(BigInt(amount), token?.decimals, token?.symbol, {
        isStable: token?.isStable,
        minThreshold: token?.decimals !== undefined && token.decimals >= 9 ? "0.000000001" : "0",
        useCommas: true,
      }) ?? "—"
    );
  } catch {
    return "—";
  }
}

function formatOrderPrice(
  price: string | null,
  tokenDecimals: number | undefined,
  visualMultiplier: number | undefined
) {
  if (!price || tokenDecimals === undefined) {
    return "—";
  }

  try {
    return formatUsdPrice(parseContractPrice(BigInt(price), tokenDecimals), { visualMultiplier }) ?? "—";
  } catch {
    return "—";
  }
}

function formatOrderSize(sizeDeltaUsd: string) {
  try {
    return (
      formatUsd(BigInt(sizeDeltaUsd), {
        displayDecimals: 0,
        maxThreshold: "1000000000",
      }) ?? "—"
    );
  } catch {
    return "—";
  }
}

function formatEventTime(timestamp: number) {
  return format(new Date(timestamp * 1000), "MMM d, HH:mm:ss");
}

function formatCount(value: number | undefined) {
  return value === undefined ? "—" : value.toLocaleString();
}

function formatPercentileLabel(percentile: number) {
  return `P${formatNumber(percentile * 100, 0)}`;
}

function formatDuration(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  if (value < 60) {
    return `${formatNumber(value, 1)}s`;
  }

  return `${formatNumber(value / 60, 1)}m`;
}

function formatOracleObservationAge(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value === 0 ? t`Same-second observation` : t`${formatOracleAgeDuration(value)} before creation`;
}

function formatExecutionOracleObservationAge(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value === 0 ? t`Same-second observation` : t`${formatNumber(value, 0)}s before execution`;
}

function formatOracleAge(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : formatOracleAgeDuration(value);
}

export function formatOracleAgeDuration(value: number) {
  if (value < 60) {
    return `${formatNumber(value, 0)}s`;
  }

  if (value < 60 * 60) {
    return `${formatNumber(value / 60, 1)}m`;
  }

  if (value < 24 * 60 * 60) {
    return `${formatNumber(value / (60 * 60), 1)}h`;
  }

  return `${formatNumber(value / (24 * 60 * 60), 1)}d`;
}

function formatBps(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : `${formatNumber(value, 2)} bps`;
}

function formatPercentage(value: number) {
  return `${formatNumber(value, 1)}%`;
}

function formatAxisSeconds(value: number) {
  return value < 60 ? `${formatNumber(value, 0)}s` : `${formatNumber(value / 60, 1)}m`;
}

function formatAxisBps(value: number) {
  return formatNumber(value, 1);
}

function formatNumber(value: number, maximumFractionDigits: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}
