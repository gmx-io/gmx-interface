import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useCallback, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { formatUnits } from "viem";

import { ES_GMX_DECIMALS, isIncentivesEnabled } from "domain/synthetics/incentives/v2/constants";
import {
  getIncentiveDistributionCsv,
  getIncentiveDistributionRows,
  INCENTIVE_DISTRIBUTION_COLUMNS,
} from "domain/synthetics/incentives/v2/incentiveDistributionCsv";
import type { IncentiveDistributionRow, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useIncentiveEpochAudit } from "domain/synthetics/incentives/v2/useIncentiveEpochAudit";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { formatEpochLabel } from "domain/synthetics/incentives/v2/utils";
import { useChainId } from "lib/chains";
import { downloadFile } from "lib/csv";
import { numberWithCommas, USD_DECIMALS } from "lib/numbers";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import Loader from "components/Loader/Loader";
import PageTitle from "components/PageTitle/PageTitle";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import CalendarIcon from "img/ic_calendar.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import DownloadIcon from "img/ic_download2.svg?react";
import InfoIcon from "img/ic_info_circle_stroke.svg?react";

import { IncentivesDistributionAmount, IncentivesDistributionWallet } from "./IncentivesDistributionValues";
import { SummaryCard } from "./SummaryCard";
import { getAuditEpochCount } from "./utils";

import "./IncentivesDistributionPage.scss";

const PAGE_SIZE = 20;

export function IncentivesDistributionPage() {
  const { chainId } = useChainId();
  const {
    data: config,
    error,
    loading,
    mutate,
  } = useIncentivesConfig(chainId, {
    enabled: isIncentivesEnabled(chainId),
  });

  return (
    <AppPageLayout title={t`Incentives Distribution Audit`} contentClassName="IncentivesDistribution !gap-24">
      <PageTitle
        title={t`Incentives Distribution Audit`}
        subtitle={t`Review epoch rewards and export wallet allocations.`}
        afterTitle={
          <Badge className="border border-slate-600 !bg-slate-900 px-8">
            <Trans>Dev only</Trans>
          </Badge>
        }
        isTop
      />
      <div className="flex min-w-0 flex-col gap-20">
        {!isIncentivesEnabled(chainId) ? (
          <div className="p-24 text-center text-typography-secondary">
            <Trans>No V2 incentives configuration is available for this chain.</Trans>
          </div>
        ) : loading && config === undefined ? (
          <Loader />
        ) : error ? (
          <div className="flex flex-col items-center gap-12 rounded-8 bg-slate-900 p-24" role="alert">
            <Trans>Unable to load the incentives configuration.</Trans>
            <Button variant="secondary" onClick={() => void mutate().catch(() => undefined)}>
              <Trans>Retry</Trans>
            </Button>
          </div>
        ) : config ? (
          <IncentivesDistributionTable chainId={chainId} config={config} />
        ) : (
          <div className="p-24 text-center text-typography-secondary">
            <Trans>No V2 incentives configuration is available for this chain.</Trans>
          </div>
        )}
      </div>
    </AppPageLayout>
  );
}

function IncentivesDistributionTable({ chainId, config }: { chainId: number; config: IncentivesConfig }) {
  const { i18n } = useLingui();
  const history = useHistory();
  const { search } = useLocation();
  const [detailed, setDetailed] = useState(false);
  const [page, setPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const epochs = useMemo(
    () =>
      Array.from({ length: getAuditEpochCount(config) }, (_, index) => ({
        timestamp: config.epochTimestamp - index * config.epochDuration,
        label: formatEpochLabel(
          config.epochTimestamp - index * config.epochDuration,
          config.epochDuration,
          i18n.locale
        ),
      })),
    [config, i18n.locale]
  );
  const epochParam = Number(new URLSearchParams(search).get("epoch"));
  const selectedEpoch = epochs.find((epoch) => epoch.timestamp === epochParam)?.timestamp ?? epochs[0]?.timestamp;
  const { data, error, isValidating, mutate } = useIncentiveEpochAudit(chainId, selectedEpoch);
  const rows = useMemo(() => (data ? getIncentiveDistributionRows(data.entries, config) : undefined), [config, data]);
  const columns = detailed ? INCENTIVE_DISTRIBUTION_COLUMNS : INCENTIVE_DISTRIBUTION_COLUMNS.slice(0, 2);
  const pageCount = Math.max(1, Math.ceil((rows?.length ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstRow = numberWithCommas((currentPage - 1) * PAGE_SIZE + 1);
  const lastRow = numberWithCommas(Math.min(currentPage * PAGE_SIZE, rows?.length ?? 0));
  const totalRows = numberWithCommas(rows?.length ?? 0);
  const totalEsGmx = useMemo(() => data?.entries.reduce((sum, entry) => sum + entry.esGmxRewards, 0n) ?? 0n, [data]);
  const columnLabels: Record<keyof IncentiveDistributionRow, string> = {
    wallet: t`Wallet`,
    esGMX: "esGMX",
    GT: "GT",
    volume_usd: t`Volume (USD)`,
    volume_multiplier: t`Volume multiplier`,
    staking_gmx: t`Staking (GMX, average)`,
    staking_multiplier: t`Staking multiplier`,
    total_multiplier: t`Total multiplier (average)`,
    eligible_referral_volume_usd: t`Eligible referral volume (USD)`,
    eligible_fees_usd: t`Eligible fees (USD)`,
  };

  const handleEpochChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(search);
      params.set("epoch", event.target.value);
      history.replace({ search: `?${params.toString()}` });
      setPage(1);
    },
    [history, search]
  );
  const handleDownload = useCallback(() => {
    if (!rows || error || isValidating || selectedEpoch === undefined) return;

    downloadFile(
      `incentives-${chainId}-${selectedEpoch}${detailed ? "-detailed" : ""}.csv`,
      getIncentiveDistributionCsv(rows, detailed),
      "text/csv;charset=utf-8"
    );
  }, [chainId, detailed, error, isValidating, rows, selectedEpoch]);
  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    tableContainerRef.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-16">
        <div className="flex flex-wrap items-center gap-x-16 gap-y-8 max-md:w-full">
          <label className="flex items-center gap-12 text-14 max-md:w-full">
            <span className="text-typography-secondary">
              <Trans>Epoch</Trans>
            </span>
            <span className="IncentivesDistribution-epoch max-md:grow">
              <CalendarIcon className="left-12 size-16" aria-hidden="true" />
              <select className="max-md:w-full" value={selectedEpoch ?? ""} onChange={handleEpochChange}>
                {epochs.map((epoch) => (
                  <option key={epoch.timestamp} value={epoch.timestamp}>
                    {epoch.label}
                    {epoch.timestamp === config.epochTimestamp ? ` · ${t`current`}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="right-12 size-16" aria-hidden="true" />
            </span>
          </label>
          <span className="font-mono text-12 text-typography-secondary">{selectedEpoch} · UTC</span>
        </div>
        <div className="flex items-center gap-8 max-md:w-full">
          <Button
            variant="secondary"
            size="medium"
            className="max-md:flex-1"
            disabled={isValidating}
            onClick={() => void mutate().catch(() => undefined)}
          >
            <Trans>Refresh</Trans>
          </Button>
          <Button
            variant="primary"
            size="medium"
            className="!px-16 max-md:flex-1"
            disabled={!rows || Boolean(error) || isValidating}
            onClick={handleDownload}
          >
            <DownloadIcon className="size-16" aria-hidden="true" />
            <Trans>Download CSV</Trans>
          </Button>
        </div>
      </div>

      {selectedEpoch === config.epochTimestamp ? (
        <div className="flex items-start gap-8 rounded-8 border border-slate-600 bg-slate-900 px-16 py-12 text-13 text-typography-secondary">
          <InfoIcon className="mt-2 size-16 shrink-0" aria-hidden="true" />
          <span>
            <Trans>The current epoch is ongoing. Rewards and fees can still change.</Trans>
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-12 border border-red-500/30 bg-slate-900 p-24 text-center text-red-500" role="alert">
          <Trans>Unable to load the complete epoch. Refresh to try again.</Trans>
        </div>
      ) : !rows || isValidating ? (
        <div
          className="flex min-h-[320px] flex-col items-center justify-center gap-16 rounded-12 border border-slate-600 bg-slate-900 text-14 text-typography-secondary"
          role="status"
        >
          <Loader />
          <Trans>Loading all accounts for this epoch…</Trans>
        </div>
      ) : (
        <>
          <div className="IncentivesDistribution-stats grid grid-cols-3 gap-12 max-md:grid-cols-2 max-md:[&>div:last-child]:col-span-2">
            <SummaryCard
              label={t`Accounts`}
              value={<span className="text-24 tabular-nums max-md:text-20">{totalRows}</span>}
            />
            <SummaryCard
              label={t`Total esGMX`}
              value={
                <IncentivesDistributionAmount
                  column="esGMX"
                  value={formatUnits(totalEsGmx, ES_GMX_DECIMALS)}
                  className="text-24 max-md:text-20"
                />
              }
            />
            <SummaryCard
              label={t`Total eligible fees (USD)`}
              value={
                <IncentivesDistributionAmount
                  column="eligible_fees_usd"
                  value={formatUnits(data!.totalFees, USD_DECIMALS)}
                  className="text-24 max-md:text-20"
                />
              }
            />
          </div>
          <div className="IncentivesDistribution-table-card" ref={tableContainerRef}>
            <div className="flex flex-wrap items-center justify-between gap-16 border-b border-slate-600 p-20 max-md:p-16">
              <h3 className="text-16 font-medium">
                <Trans>Wallet allocations</Trans>
              </h3>
              <Checkbox isChecked={detailed} setIsChecked={setDetailed}>
                <Trans>Show detailed data</Trans>
              </Checkbox>
            </div>
            {detailed && rows.some((row) => row.staking_gmx === "") ? (
              <div className="flex items-start gap-8 border-b border-slate-600 px-20 py-12 text-12 text-typography-secondary max-md:px-16">
                <InfoIcon className="size-16 shrink-0" aria-hidden="true" />
                <span>
                  <Trans>
                    Average GMX staking is not available for every wallet yet. Missing values are blank in CSV.
                  </Trans>
                </span>
              </div>
            ) : null}
            {rows.length === 0 ? (
              <div className="p-40 text-center text-14 text-typography-secondary">
                <Trans>No audit entries found for this epoch.</Trans>
              </div>
            ) : (
              <>
                <TableScrollFadeContainer
                  key={detailed ? "detailed" : "basic"}
                  className="IncentivesDistribution-scroll"
                  ariaLabel={t`Wallet allocations`}
                >
                  <Table
                    className={cx("IncentivesDistribution-table", {
                      "IncentivesDistribution-table--detailed": detailed,
                    })}
                  >
                    <thead>
                      <TableTheadTr>
                        {columns.map((column) => (
                          <TableTh key={column} scope="col">
                            {columnLabels[column]}
                          </TableTh>
                        ))}
                      </TableTheadTr>
                    </thead>
                    <tbody>
                      {rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((row) => (
                        <TableTr key={row.wallet}>
                          {columns.map((column) => (
                            <TableTd key={column}>
                              {column === "wallet" ? (
                                <IncentivesDistributionWallet address={row.wallet} />
                              ) : (
                                <IncentivesDistributionAmount column={column} value={row[column]} />
                              )}
                            </TableTd>
                          ))}
                        </TableTr>
                      ))}
                    </tbody>
                  </Table>
                </TableScrollFadeContainer>
                <div className="flex flex-wrap items-center justify-between gap-x-16 gap-y-8 border-t border-slate-600 px-20 py-12 max-md:px-16">
                  <span className="text-12 text-typography-secondary">
                    <Trans>
                      {firstRow}–{lastRow} of {totalRows} wallets
                    </Trans>
                  </span>
                  <BottomTablePagination
                    className="!p-0"
                    page={currentPage}
                    pageCount={pageCount}
                    onPageChange={handlePageChange}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex items-start gap-8 text-12 text-typography-secondary">
            <InfoIcon className="size-16 shrink-0" aria-hidden="true" />
            <span>
              <Trans>Hover over amounts for exact values. CSV exports all wallets at full precision.</Trans>
            </span>
          </div>
        </>
      )}
    </>
  );
}
