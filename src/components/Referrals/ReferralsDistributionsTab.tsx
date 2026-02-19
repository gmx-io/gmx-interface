import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { Fragment, PropsWithChildren, useCallback, useMemo, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { ContractsChainId, getExplorerUrl } from "config/chains";
import { RebateDistribution, RebateDistributionType, TotalReferralsStats } from "domain/referrals";
import { useChainId } from "lib/chains";
import { getDaysAgo } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { shortenAddress } from "lib/legacy";
import { formatBalanceAmount, formatBigUsd } from "lib/numbers";
import { getNativeToken, getToken, getTokenBySymbol } from "sdk/configs/tokens";

import { Amount } from "components/Amount/Amount";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Loader from "components/Loader/Loader";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import NewCheckedIcon from "img/ic_new_checked.svg?react";
import WarnIcon from "img/ic_warn.svg?react";

import { ClaimableRebatesCard } from "./ClaimableRebatesCard";
import EmptyMessage from "./EmptyMessage";
import { ReferralsDocsCard } from "./ReferralsDocsCard";
import usePagination from "./usePagination";

function DistributionTimestamp({ timestamp }: { timestamp: number }) {
  const { i18n } = useLingui();
  const locale = i18n.locale;

  const { dateTime, relativeTime } = useMemo(() => {
    const date = new Date(timestamp * 1000);
    const dateTime = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
    const daysAgo = getDaysAgo(timestamp);
    const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-daysAgo, "day");
    return { dateTime, relativeTime };
  }, [timestamp, locale]);

  return (
    <>
      <span className="text-typography-primary">{dateTime}</span>{" "}
      <span className="text-typography-secondary">({relativeTime})</span>
    </>
  );
}

// Dev: grid-based layout components

function GridRow({ children, className, onClick }: PropsWithChildren<{ className?: string; onClick?: () => void }>) {
  return (
    <div
      role="row"
      className={cx("group/row col-span-full grid grid-cols-subgrid", className, {
        "cursor-pointer": !!onClick,
      })}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function GridCell({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      role="cell"
      className={cx(
        "text-[13px] last-of-type:[&:not(:first-of-type)]:text-right",
        "bg-fill-surfaceElevated50 px-4 py-8 first-of-type:rounded-l-8 first-of-type:pl-20 last-of-type:rounded-r-8 last-of-type:pr-20",
        "group-hover/row:bg-fill-surfaceHover",
        className
      )}
    >
      {children}
    </div>
  );
}

function GridHeaderCell({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      role="columnheader"
      className={cx(
        "text-caption text-left last-of-type:text-right",
        "px-4 py-12 pb-8 first-of-type:pl-20 last-of-type:pr-20",
        className
      )}
    >
      {children}
    </div>
  );
}

type RebateDistributionRowProps = {
  rebate: RebateDistribution;
  chainId: number;
  isSelected: boolean;
  onClick: (id: string) => void;
};

function RebateDistributionRow({ rebate, chainId, isSelected, onClick }: RebateDistributionRowProps) {
  const { i18n } = useLingui();
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(rebate.timestamp * 1000)),
    [rebate.timestamp, i18n.locale]
  );
  const esGmxAddress = getTokenBySymbol(chainId, "esGMX").address;

  let rebateType = "-";

  if (rebate.typeId === RebateDistributionType.Rebate) {
    if (rebate.tokens[0] === esGmxAddress) {
      rebateType = t`V1 esGMX`;
    } else {
      rebateType = t`V1 airdrop`;
    }
  } else if (rebate.typeId === RebateDistributionType.Claim) {
    rebateType = t`V2 claim`;
  }

  const amountsByTokens = rebate.tokens.reduce(
    (acc, tokenAddress, i) => {
      let token;
      try {
        token = getToken(chainId, tokenAddress);
      } catch (error) {
        token = getNativeToken(chainId);
      }
      acc[token.address] = acc[token.address] ?? 0n;
      acc[token.address] = acc[token.address] + rebate.amounts[i];
      return acc;
    },
    {} as { [address: string]: bigint }
  );

  const tokensWithoutPrices: string[] = [];

  const totalUsd = rebate.amountsInUsd.reduce((acc, usdAmount, i) => {
    if (usdAmount == 0n && rebate.amounts[i] != 0n) {
      tokensWithoutPrices.push(rebate.tokens[i]);
    }

    return acc + usdAmount;
  }, 0n);

  const explorerURL = getExplorerUrl(chainId);

  return (
    <GridRow
      className="text-typography-primary"
      onClick={() => {
        onClick(rebate.id);
      }}
    >
      <GridCell>{formattedDate}</GridCell>
      <GridCell>{rebateType}</GridCell>
      <GridCell>
        <TooltipWithPortal
          className="whitespace-nowrap"
          handle={
            <div className="Rebate-amount-value numbers">
              {tokensWithoutPrices.length > 0 && (
                <>
                  <WarnIcon className="size-20 text-yellow-300" />
                  &nbsp;
                </>
              )}
              {formatBigUsd(totalUsd)}
            </div>
          }
          content={
            <>
              {tokensWithoutPrices.length > 0 && (
                <>
                  <Trans>
                    USD value may not be accurate because prices are missing for{" "}
                    {tokensWithoutPrices.map((address) => getToken(chainId, address).symbol).join(", ")}.
                  </Trans>
                  <br />
                  <br />
                </>
              )}
              {Object.keys(amountsByTokens).map((tokenAddress) => {
                const token = getToken(chainId, tokenAddress);

                return (
                  <StatsTooltipRow
                    key={tokenAddress}
                    showDollar={false}
                    label={token.symbol}
                    value={formatBalanceAmount(amountsByTokens[tokenAddress], token.decimals, undefined, {
                      isStable: token.isStable,
                    })}
                    valueClassName="numbers"
                  />
                );
              })}
            </>
          }
        />
      </GridCell>
      <GridCell className="text-right">
        <ExternalLink
          className="text-typography-secondary hover:text-typography-primary"
          variant="icon"
          href={explorerURL + `tx/${rebate.transactionHash}`}
        >
          {shortenAddress(rebate.transactionHash, 20)}
        </ExternalLink>
      </GridCell>
      <GridCell className="flex items-center justify-end">
        <ChevronDownIcon className={cx("size-16 text-typography-secondary", { "rotate-180": isSelected })} />
      </GridCell>
    </GridRow>
  );
}

type RebateDistributionRowDetailProps = {
  rebate: RebateDistribution;
  chainId: number;
};

function RebateDistributionRowDetail({ rebate, chainId }: RebateDistributionRowDetailProps) {
  const [, copyToClipboard] = useCopyToClipboard();

  const handleCopyTxHash = useCallback(
    (hash: string) => {
      copyToClipboard(hash);
      helperToast.success(t`Transaction hash copied to clipboard`);
    },
    [copyToClipboard]
  );

  return (
    <div className="col-span-full grid grid-cols-subgrid rounded-b-8 text-[13px]">
      <div className="py-8 pl-20 text-typography-secondary">
        <Trans>Status</Trans>
      </div>
      <div className="col-span-4 py-8 pr-20">
        <span className="inline-flex items-center gap-2 rounded-full bg-green-900 py-2 pl-4 pr-6 text-green-500">
          <NewCheckedIcon className="size-16 text-green-500" />
          <Trans>Success</Trans>
        </span>
      </div>

      {rebate.tokens.map((tokenAddress, index) => {
        const token = getToken(chainId, tokenAddress);
        return (
          <Fragment key={tokenAddress}>
            <div className="py-8 pl-20 text-typography-secondary">
              <Trans>{token.symbol} Amount</Trans>
            </div>
            <div className="col-span-4 py-8 pr-20">
              <Amount
                amount={rebate.amounts[index]}
                decimals={token.decimals}
                isStable={token.isStable}
                symbol={token.symbol}
                symbolClassName="text-typography-secondary"
              />
            </div>
          </Fragment>
        );
      })}

      <div className="py-8 pl-20 text-typography-secondary">
        <Trans>Transaction hash</Trans>
      </div>
      <div className="col-span-4 flex items-center gap-8 py-8 pr-20">
        {rebate.transactionHash}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyTxHash(rebate.transactionHash);
          }}
          className="text-typography-secondary hover:text-typography-primary"
        >
          <CopyStrokeIcon className="size-16" />
        </button>
      </div>

      <div className="py-8 pl-20 text-typography-secondary">
        <Trans>Timestamp</Trans>
      </div>
      <div className="col-span-4 py-8 pr-20">
        <DistributionTimestamp timestamp={rebate.timestamp} />
      </div>
    </div>
  );
}

type RebatesDistributionTableProps = {
  currentRebateData: RebateDistribution[];
  chainId: number;
  currentRebatePage: number;
  rebatePageCount: number;
  setCurrentRebatePage: (page: number) => void;
  selectedRebateId: string | undefined;
  toggleSelectedRebateId: (rebateId: string) => void;
};

function RebatesDistributionTable({
  currentRebateData,
  chainId,
  currentRebatePage,
  rebatePageCount,
  setCurrentRebatePage,
  selectedRebateId,
  toggleSelectedRebateId,
}: RebatesDistributionTableProps) {
  return (
    <div className="flex w-full grow flex-col gap-8 rounded-8 bg-slate-900 px-8 pb-8">
      <TableScrollFadeContainer>
        <div role="table" className="grid min-w-max grid-cols-[1fr_1fr_1fr_1fr_auto] gap-y-4">
          {/* Header */}
          <GridRow>
            <GridHeaderCell>
              <Trans>Date</Trans>
            </GridHeaderCell>
            <GridHeaderCell>
              <Trans>Type</Trans>
            </GridHeaderCell>
            <GridHeaderCell>
              <Trans>Amount</Trans>
            </GridHeaderCell>
            <GridHeaderCell className="text-right">
              <Trans>Transaction</Trans>
            </GridHeaderCell>
            <GridHeaderCell />
          </GridRow>

          {/* Body */}
          {currentRebateData.map((rebate) => {
            return (
              <Fragment key={rebate.id}>
                <RebateDistributionRow
                  rebate={rebate}
                  chainId={chainId}
                  isSelected={selectedRebateId === rebate.id}
                  onClick={toggleSelectedRebateId}
                />

                {selectedRebateId === rebate.id && <RebateDistributionRowDetail rebate={rebate} chainId={chainId} />}
              </Fragment>
            );
          })}
        </div>
      </TableScrollFadeContainer>
      <BottomTablePagination page={currentRebatePage} pageCount={rebatePageCount} onPageChange={setCurrentRebatePage} />
    </div>
  );
}

type ReferralsDistributionsTabProps = {
  loading: boolean;
  account: string | undefined;
  referralsData: TotalReferralsStats | undefined;
};

export function ReferralsDistributionsTab({ loading, account, referralsData }: ReferralsDistributionsTabProps) {
  const { chainId } = useChainId();
  const chains = referralsData?.chains || {};
  const currentReferralsData = chains[chainId as ContractsChainId];
  const affiliateDistributions = currentReferralsData?.affiliateDistributions;

  const {
    currentPage: currentRebatePage,
    getCurrentData: getCurrentRebateData,
    setCurrentPage: setCurrentRebatePage,
    pageCount: rebatePageCount,
  } = usePagination("Rebates", affiliateDistributions);
  const [selectedRebateId, setSelectedRebateId] = useState<string | undefined>(undefined);

  const toggleSelectedRebateId = useCallback((rebateId: string) => {
    setSelectedRebateId((prev) => (prev === rebateId ? undefined : rebateId));
  }, []);

  const currentRebateData = getCurrentRebateData();

  if (loading) return <Loader />;

  if (!account) {
    return (
      <EmptyMessage
        tooltipText={t`Connect your wallet to view your rebates distribution history.`}
        message={t`Connect wallet to view distributions`}
      />
    );
  }

  return (
    <div className="flex grow gap-8 max-md:flex-col">
      <div className="flex grow flex-col gap-8">
        {currentRebateData.length > 0 ? (
          <RebatesDistributionTable
            currentRebateData={currentRebateData}
            chainId={chainId}
            currentRebatePage={currentRebatePage}
            rebatePageCount={rebatePageCount}
            setCurrentRebatePage={setCurrentRebatePage}
            selectedRebateId={selectedRebateId}
            toggleSelectedRebateId={toggleSelectedRebateId}
          />
        ) : (
          <EmptyMessage
            tooltipText={t`Distribution history for claimed rebates and airdrops`}
            message={t`No rebates distribution history yet`}
          />
        )}
      </div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
        <ClaimableRebatesCard />
        <ReferralsDocsCard />
      </div>
    </div>
  );
}
