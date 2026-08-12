import { Trans, t } from "@lingui/macro";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { getAddress, isAddress } from "viem";

import { ARBITRUM, getExplorerUrl } from "config/chains";
import type { SortDirection } from "context/SorterContext/types";
import type { MarketsData } from "domain/synthetics/markets/types";
import { useMarkets } from "domain/synthetics/markets/useMarkets";
import {
  MarketOrderExecutionRow,
  MarketOrderKind,
  MarketOrderPhase,
  MarketOrderSide,
  MarketSwapOrderExecutionRow,
} from "domain/synthetics/orders/marketOrderExecutions";
import {
  useMarketOrderExecutionRows,
  useMarketOrderExecutionStats,
} from "domain/synthetics/orders/useMarketOrderExecutions";
import { useChainId } from "lib/chains";
import { DateRange, normalizeDateRangeToUtcDays } from "lib/dates";
import { useDebounce } from "lib/debounce/useDebounce";
import { shortenAddress } from "lib/legacy";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";
import { getTokensMap, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { getOppositeCollateralFromConfig } from "sdk/utils/markets";
import type { Token } from "sdk/utils/tokens/types";

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

const SECONDS_IN_DAY = 24 * 60 * 60;
const MAX_QUERY_RANGE_SECONDS = 31 * SECONDS_IN_DAY;
const MAX_QUERY_RANGE_CALENDAR_DAYS = 30;
const TABLE_PAGE_SIZE = 10;
const DATE_RANGE_PRESET_PERIODS = ["days7", "days30"] as const;
const SUBSQUID_START_DATE = new Date(2025, 6, 28);
const WALLET_FILTER_ERROR_ID = "market-order-execution-wallet-error";
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

type MetricChartRow = {
  label: string;
  value: number;
  count?: number;
  total?: number;
};

const ARBITRUM_TOKENS = getTokensMap(ARBITRUM);

const TABLE_COLUMN_STYLES = {
  market: { width: "22%" },
  account: { width: "14%" },
  size: { width: "12%" },
  submitted: { width: "20%" },
  executed: { width: "20%" },
  delay: { width: "12%" },
};

export function MarketOrderExecution() {
  const { chainId } = useChainId();
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => [
    new Date(Date.now() - 7 * SECONDS_IN_DAY * 1000),
    new Date(),
  ]);
  const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);
  const [kind, setKind] = useState<MarketOrderKind>("perp");
  const [executionDelaySortDirection, setExecutionDelaySortDirection] = useState<SortDirection>("unspecified");
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
  const { marketsData } = useMarkets(chainId);
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
    executionDelaySortDirection,
  ].join(":");
  const { currentPage, pageCount, setCurrentPage } = usePagination(
    paginationKey,
    [],
    TABLE_PAGE_SIZE,
    stats?.totalCount ?? 0
  );
  const rowsSort =
    executionDelaySortDirection === "unspecified"
      ? undefined
      : {
          sortField: "executionTime" as const,
          sortDirection: executionDelaySortDirection,
        };
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
  const handleExecutionDelaySortChange = useCallback(
    (direction: SortDirection) => {
      setExecutionDelaySortDirection(direction);
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
      Object.values(isSupportedChain ? marketsData || {} : {})
        .filter((market) => kind === "swap" || !market.isSpotOnly)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((market) => ({
          data: market.marketTokenAddress,
          text: market.name,
        })),
    [isSupportedChain, kind, marketsData]
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
  const percentileStats = useMemo(() => stats?.percentiles ?? [], [stats?.percentiles]);
  const delayPercentileRows = useMemo(
    () =>
      percentileStats.flatMap((stat): MetricChartRow[] =>
        stat.delaySeconds === null ? [] : [{ label: formatPercentileLabel(stat.percentile), value: stat.delaySeconds }]
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
          subtitle={t`Research creation-to-execution delays for market orders`}
          qa="market-order-execution-page"
        />

        <div className="text-body-small rounded-8 border border-slate-700 bg-slate-900 px-16 py-12 text-typography-secondary">
          <Trans>Execution delay is measured from order creation to execution.</Trans>
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

              setKind(nextKind);
            }}
            placeholder={t`Search order categories`}
          />
          <TableOptionsFilter<string>
            asButton
            label={marketAddress ? t`Market: ${getMarketName(marketsData, marketAddress)}` : t`Market`}
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

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label={t`Executed market orders`}
            value={formatCount(stats?.totalCount)}
            detail={t`${formatCount(stats?.timingCount)} with timing data`}
          />
          <SummaryCard
            label={t`Orders with timing data`}
            value={formatCount(stats?.timingCount)}
            detail={t`Creation timestamp available`}
          />
          <SummaryCard
            label={t`Median execution delay`}
            value={formatDelay(stats?.medianDelaySeconds ?? null)}
            detail={t`Creation to execution`}
          />
          <SummaryCard
            label={t`P95 execution delay`}
            value={formatDelay(stats?.p95DelaySeconds ?? null)}
            detail={t`Creation to execution`}
          />
        </div>

        <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
          <MetricChartCard
            title={t`Execution delay percentiles`}
            subtitle={t`Full selected population with creation timestamps`}
            data={delayPercentileRows}
            valueFormatter={formatDelay}
            emptyText={t`No paired timing data`}
            isLoading={isLoading}
            hasError={statsError !== undefined}
          />
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
        </div>

        <Card
          title={
            <div className="flex w-full flex-wrap items-center justify-between gap-12">
              <span>
                <Trans>Market orders</Trans>
              </span>
              <span className="text-body-small text-typography-secondary">
                {executionDelaySortDirection === "desc" ? (
                  <Trans>Longest execution delay first · server-paginated</Trans>
                ) : executionDelaySortDirection === "asc" ? (
                  <Trans>Shortest execution delay first · server-paginated</Trans>
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
            marketsData={marketsData}
            isLoading={areRowsLoading}
            error={tableError}
            executionDelaySortDirection={executionDelaySortDirection}
            onExecutionDelaySortChange={handleExecutionDelaySortChange}
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

export function MarketOrderPairsTable({
  chainId,
  kind,
  rows,
  marketsData,
  isLoading,
  error,
  executionDelaySortDirection,
  onExecutionDelaySortChange,
}: {
  chainId: number;
  kind: MarketOrderKind;
  rows: MarketOrderExecutionRow[];
  marketsData: MarketsData | undefined;
  isLoading: boolean;
  error: unknown;
  executionDelaySortDirection: SortDirection;
  onExecutionDelaySortChange: (direction: SortDirection) => void;
}) {
  const explorerUrl = getExplorerUrl(chainId);

  return (
    <TableScrollFadeContainer>
      <Table className="w-[max(100%,1080px)] table-fixed">
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
              <Trans>Created</Trans>
            </TableTh>
            <TableTh padding="compact">
              <Trans>Executed</Trans>
            </TableTh>
            <TableTh
              padding="compact"
              className="text-right"
              aria-sort={
                executionDelaySortDirection === "unspecified"
                  ? "none"
                  : executionDelaySortDirection === "desc"
                    ? "descending"
                    : "ascending"
              }
            >
              <Sorter direction={executionDelaySortDirection} onChange={onExecutionDelaySortChange}>
                <Trans>Execution delay</Trans>
              </Sorter>
            </TableTh>
          </TableTheadTr>
        </thead>
        <tbody aria-busy={isLoading}>
          {isLoading && <MarketOrderExecutionSkeleton />}
          {!isLoading && error !== undefined && (
            <TableTr>
              <TableTd padding="compact" colSpan={6} className="h-80 text-center text-red-500">
                <Trans>Could not load market order executions</Trans>
              </TableTd>
            </TableTr>
          )}
          {!isLoading && error === undefined && rows.length === 0 && (
            <TableTr>
              <TableTd padding="compact" colSpan={6} className="h-80 text-center text-typography-secondary">
                <Trans>No matching executions</Trans>
              </TableTd>
            </TableTr>
          )}
          {!isLoading &&
            error === undefined &&
            rows.map((row) => {
              const size = getOrderSize(chainId, row, marketsData);

              return (
                <TableTr key={`${row.orderKey}:${row.executedTransactionHash}`} hoverable>
                  <TableTd padding="compact">
                    <div className="truncate font-medium">{getOrderMarketName(chainId, row, marketsData)}</div>
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
                    {size}
                  </TableTd>
                  <TableTd padding="compact">
                    <EventCell
                      timestamp={row.submittedTimestamp}
                      transactionHash={row.submittedTransactionHash}
                      explorerUrl={explorerUrl}
                      transactionLabel={t`order tx`}
                    />
                  </TableTd>
                  <TableTd padding="compact">
                    <EventCell
                      timestamp={row.executedTimestamp}
                      transactionHash={row.executedTransactionHash}
                      explorerUrl={explorerUrl}
                      transactionLabel={t`tx`}
                    />
                  </TableTd>
                  <TableTd padding="compact" className="text-right numbers">
                    {formatDelay(row.delaySeconds)}
                  </TableTd>
                </TableTr>
              );
            })}
        </tbody>
      </Table>
    </TableScrollFadeContainer>
  );
}

function EventCell({
  timestamp,
  transactionHash,
  explorerUrl,
  transactionLabel,
}: {
  timestamp: number | null;
  transactionHash: string | null;
  explorerUrl: string;
  transactionLabel: string;
}) {
  return (
    <div className="numbers">
      {timestamp === null ? "—" : formatEventTime(timestamp)}
      {transactionHash && (
        <>
          {" · "}
          <ExplorerTransactionLink
            explorerUrl={explorerUrl}
            transactionHash={transactionHash}
            label={transactionLabel}
          />
        </>
      )}
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

function getMarketName(marketsData: MarketsData | undefined, marketAddress: string) {
  return getByKey(marketsData, marketAddress)?.name ?? shortenAddress(marketAddress, 18) ?? marketAddress;
}

function getOrderMarketName(chainId: number, row: MarketOrderExecutionRow, marketsData: MarketsData | undefined) {
  if (row.kind === "perp") {
    return getMarketName(marketsData, row.marketAddress);
  }

  const { inputToken, outputToken } = getSwapTokens(chainId, row, marketsData);
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

function getOrderSize(chainId: number, row: MarketOrderExecutionRow, marketsData: MarketsData | undefined) {
  if (row.kind === "perp") {
    return formatOrderSize(row.sizeDeltaUsd);
  }

  const { inputToken } = getSwapTokens(chainId, row, marketsData);

  return formatSwapAmount(row.initialCollateralDeltaAmount, inputToken);
}

function getSwapTokens(chainId: number, row: MarketSwapOrderExecutionRow, marketsData: MarketsData | undefined) {
  if (chainId !== ARBITRUM) {
    return { inputToken: undefined, outputToken: undefined };
  }

  const inputToken = getByKey(ARBITRUM_TOKENS, row.initialCollateralTokenAddress);
  const outputTokenAddress = getSwapOutputTokenAddress(chainId, row, marketsData);

  return {
    inputToken,
    outputToken: getByKey(ARBITRUM_TOKENS, outputTokenAddress),
  };
}

function getSwapOutputTokenAddress(
  chainId: number,
  row: MarketSwapOrderExecutionRow,
  marketsData: MarketsData | undefined
) {
  const wrappedTokenAddress = getWrappedToken(chainId).address;

  if (row.swapPath.length === 0) {
    return row.shouldUnwrapNativeToken && row.initialCollateralTokenAddress === wrappedTokenAddress
      ? NATIVE_TOKEN_ADDRESS
      : row.initialCollateralTokenAddress;
  }

  let tokenAddress =
    row.initialCollateralTokenAddress === NATIVE_TOKEN_ADDRESS
      ? wrappedTokenAddress
      : row.initialCollateralTokenAddress;

  for (const marketAddress of row.swapPath) {
    const market = getByKey(marketsData, marketAddress);

    if (!market || (tokenAddress !== market.longTokenAddress && tokenAddress !== market.shortTokenAddress)) {
      return undefined;
    }

    tokenAddress = getOppositeCollateralFromConfig(market, tokenAddress);
  }

  return row.shouldUnwrapNativeToken && tokenAddress === wrappedTokenAddress ? NATIVE_TOKEN_ADDRESS : tokenAddress;
}

function formatSwapAmount(amount: string | null, token: Token | undefined) {
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

function formatDelay(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  if (value < 60) {
    return `${formatNumber(value, 1)}s`;
  }

  return `${formatNumber(value / 60, 1)}m`;
}

function formatPercentage(value: number) {
  return `${formatNumber(value, 1)}%`;
}

function formatNumber(value: number, maximumFractionDigits: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}
