import { msg, t, Trans } from "@lingui/macro";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCopyToClipboard } from "react-use";

import type { TimeRangeInfo } from "domain/synthetics/markets/useTimeRange";
import { formatDate, formatDateTime, formatTimeAgo, SECONDS_IN_DAY } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { shortenAddress } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";

import Button from "components/Button/Button";
import { Faq } from "components/Faq/Faq";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import { ShareReferralCardModal } from "components/Referrals/shared/cards/ShareReferralCardModal";
import { TimeRangeFilter } from "components/Referrals/shared/TimeRangeFilter";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";
import Tooltip from "components/Tooltip/Tooltip";

import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import ShareIcon from "img/ic_share.svg?react";

import { SolanaAffiliatesPromoCard } from "./SolanaPromoCards";
import { SOLANA_AFFILIATE_POST_WIZARD_FAQS } from "./solanaReferralsFaq";
import {
  getSolanaReferralLink,
  GT_POINTS_BUYBACK_PATH,
  GT_POINTS_MY_PATH,
  SOLANA_GT_DECIMALS,
  SOLANA_TRADER_DISCOUNT_PERCENT,
  type SolanaAffiliateData,
  type SolanaReferee,
  type SolanaReferralActivity,
} from "./solanaReferralsTypes";

enum ActivityTab {
  RecentActivity = "recentActivity",
  Referees = "referees",
}

const ACTIVITY_TIME_RANGE_INFOS: TimeRangeInfo[] = [
  { slug: "7d", days: 7, title: msg`${7}d` },
  { slug: "30d", days: 30, title: msg`${30}d` },
  { slug: "90d", days: 90, title: msg`${90}d` },
];

function formatGt(amount: bigint, sign = "") {
  return `${sign}${formatAmount(amount, SOLANA_GT_DECIMALS, 4, true)} GT`;
}

export function SolanaAffiliateDashboard({
  account,
  affiliate,
  hasAppliedTraderCode,
}: {
  account: string | undefined;
  affiliate: SolanaAffiliateData;
  hasAppliedTraderCode: boolean;
}) {
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);

  return (
    <div className="flex gap-8 max-md:flex-col">
      <div className="flex min-w-0 grow flex-col gap-8">
        <InviteCard code={affiliate.code} onShare={() => setIsShareModalVisible(true)} />
        <SolanaAffiliatesPromoCard account={account} hasAppliedCode={hasAppliedTraderCode} />
        <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1">
          <TotalReferralsCard affiliate={affiliate} />
          <RewardRateCard rewardRatePercent={affiliate.rewardRatePercent} />
        </div>
        <ActivityCard affiliate={affiliate} />
      </div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
        <Faq items={SOLANA_AFFILIATE_POST_WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
      </div>
      <ShareReferralCardModal
        isVisible={isShareModalVisible}
        setIsVisible={setIsShareModalVisible}
        referralCode={affiliate.code}
        referralLink={getSolanaReferralLink(affiliate.code)}
        traderDiscountPercentage={SOLANA_TRADER_DISCOUNT_PERCENT}
        isSolana
      />
    </div>
  );
}

function InviteCard({ code, onShare }: { code: string; onShare: () => void }) {
  const [, copyToClipboard] = useCopyToClipboard();
  const referralLink = getSolanaReferralLink(code);

  const copyLink = () => {
    copyToClipboard(referralLink);
    helperToast.success(t`Referral link copied to clipboard`);
  };

  return (
    <div className="flex flex-col gap-16 rounded-8 bg-slate-900 p-adaptive">
      <div className="flex items-start justify-between gap-16 max-md:flex-col">
        <div className="flex flex-col gap-4">
          <div className="text-body-large font-medium text-typography-primary">
            <Trans>Invite and earn rewards</Trans>
          </div>
          <div className="text-body-small text-typography-secondary">
            <Trans>Earn GT rewards and increase sellable GT quota as your referrals trade.</Trans>
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 flex-col items-end gap-2 max-md:items-start">
          <div className="text-body-small font-medium text-typography-secondary">
            <Trans>Your referral code</Trans>
          </div>
          <button
            type="button"
            className="flex max-w-full items-center gap-4 text-typography-primary"
            onClick={() => {
              copyToClipboard(code);
              helperToast.success(t`Referral code copied to clipboard`);
            }}
          >
            <span className="truncate text-24 font-medium">{code}</span>
            <CopyStrokeIcon className="size-20 shrink-0 text-typography-secondary" />
          </button>
        </div>
      </div>
      <div className="flex gap-8 max-md:flex-col">
        <div className="text-body-medium flex min-w-0 grow items-center rounded-8 border-1/2 border-stroke-primary bg-slate-950/50 px-12 py-10">
          <span className="truncate text-typography-secondary">{referralLink}</span>
        </div>
        <div className="flex shrink-0 gap-8">
          <Button variant="secondary" className="gap-4 max-md:grow" onClick={copyLink}>
            <Trans>Copy link</Trans>
            <CopyStrokeIcon className="size-16" />
          </Button>
          <Button variant="secondary" className="gap-4 max-md:grow" onClick={onShare}>
            <Trans>Share</Trans>
            <ShareIcon className="size-16" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TotalReferralsCard({ affiliate }: { affiliate: SolanaAffiliateData }) {
  const inactiveReferrals = Math.max(0, affiliate.totalReferrals - affiliate.activeReferrals);

  return (
    <div className="flex flex-col gap-8 rounded-8 bg-slate-900 p-adaptive">
      <div className="text-body-small font-medium text-typography-secondary">
        <Tooltip
          handle={<Trans>Total referrals</Trans>}
          variant="iconStroke"
          position="bottom-start"
          content={<Trans>Active referees traded in the last 7 days.</Trans>}
        />
      </div>
      <div className="flex flex-wrap items-center gap-8">
        <span className="text-24 font-medium text-typography-primary numbers">
          {affiliate.totalReferrals.toLocaleString()}
        </span>
        {affiliate.totalReferrals > 0 && (
          <>
            <span className="flex items-center gap-4 rounded-full bg-green-900 px-6 py-2 text-12 font-medium text-green-500">
              <span className="size-6 rounded-full bg-green-500" />
              <Trans>{affiliate.activeReferrals.toLocaleString()} active</Trans>
            </span>
            <span className="flex items-center gap-4 rounded-full bg-slate-700 px-6 py-2 text-12 font-medium text-typography-secondary">
              <span className="size-6 rounded-full bg-slate-500" />
              <Trans>{inactiveReferrals.toLocaleString()} inactive</Trans>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function RewardRateCard({ rewardRatePercent }: { rewardRatePercent: number }) {
  return (
    <div className="flex flex-col gap-8 rounded-8 bg-slate-900 p-adaptive">
      <div className="text-body-small font-medium text-typography-secondary">
        <Tooltip
          handle={<Trans>Referral reward rate</Trans>}
          variant="iconStroke"
          position="bottom-start"
          content={
            <Trans>
              The share of the GT your referees earn from trading that you receive: 50% to 100%, set by your VIP tier.{" "}
              <Link to={GT_POINTS_MY_PATH} className="text-blue-300">
                View tiers in GT Points
              </Link>
              .
            </Trans>
          }
        />
      </div>
      <span className="text-24 font-medium text-typography-primary numbers">{rewardRatePercent}%</span>
    </div>
  );
}

function SellableQuotaHeader({ label }: { label: React.ReactNode }) {
  return (
    <Tooltip
      handle={label}
      position="bottom-end"
      content={
        <Trans>
          Sellable quota lets you sell GT in buybacks. Use it in{" "}
          <Link to={GT_POINTS_BUYBACK_PATH} className="text-blue-300">
            GT Points › Buyback
          </Link>
          .
        </Trans>
      }
    />
  );
}

function ActivityCard({ affiliate }: { affiliate: SolanaAffiliateData }) {
  const [activeTab, setActiveTab] = useState(ActivityTab.RecentActivity);
  const [timeRange, setTimeRange] = useLocalStorageSerializeKey<string>("solana-referrals-activity-range", "7d");
  const days = ACTIVITY_TIME_RANGE_INFOS.find((info) => info.slug === timeRange)?.days ?? 7;

  const activity = useMemo(() => {
    const from = Math.floor(Date.now() / 1000) - days * SECONDS_IN_DAY;
    return affiliate.activity.filter((record) => record.timestamp >= from);
  }, [affiliate.activity, days]);

  const tabOptions = useMemo(
    () => [
      { value: ActivityTab.RecentActivity, label: <Trans>Recent activity</Trans> },
      { value: ActivityTab.Referees, label: <Trans>Referees</Trans> },
    ],
    []
  );

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-8 border-b-1/2 border-slate-600 pr-adaptive">
        <Tabs type="block" options={tabOptions} selectedValue={activeTab} onChange={setActiveTab} />
        {activeTab === ActivityTab.RecentActivity && (
          <div className="max-md:px-adaptive max-md:pb-8">
            <TimeRangeFilter
              timeRange={timeRange ?? "7d"}
              setTimeRange={setTimeRange}
              timeRangeInfos={ACTIVITY_TIME_RANGE_INFOS}
            />
          </div>
        )}
      </div>
      {activeTab === ActivityTab.RecentActivity ? (
        <RecentActivityTable activity={activity} />
      ) : (
        <RefereesTable referees={affiliate.referees} />
      )}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-body-medium flex flex-col items-center gap-4 px-adaptive py-40 text-center text-typography-secondary">
      {children}
    </div>
  );
}

function RecentActivityTable({ activity }: { activity: SolanaReferralActivity[] }) {
  const { isMobile } = useBreakpoints();
  const { currentPage, setCurrentPage, pageCount, currentData } = usePagination("SolanaReferralsActivity", activity);

  if (activity.length === 0) {
    return (
      <EmptyRow>
        <Trans>No referral rewards in this period</Trans>
        <span className="text-body-small">
          <Trans>Rewards show here when your referees trade.</Trans>
        </span>
      </EmptyRow>
    );
  }

  return (
    <div className="flex flex-col pb-4">
      {isMobile ? (
        <div className="flex flex-col">
          {currentData.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between gap-12 border-b-1/2 border-slate-600 px-adaptive py-10 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col gap-2">
                <span className="font-mono text-typography-primary">{shortenAddress(record.referee, 13)}</span>
                <span className="text-body-small text-typography-secondary">{formatDateTime(record.timestamp)}</span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 numbers">
                <span className="text-typography-primary">{formatGt(record.gtReward, "+")}</span>
                <span className="text-body-small text-typography-secondary">
                  <Trans>Quota {formatGt(record.sellableQuota, "+")}</Trans>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <TableScrollFadeContainer>
          <table className="w-full min-w-full">
            <thead>
              <TableTheadTr>
                <TableTh>
                  <Trans>TIME</Trans>
                </TableTh>
                <TableTh>
                  <Trans>REFEREE</Trans>
                </TableTh>
                <TableTh className="text-right">
                  <Trans>GT REWARD</Trans>
                </TableTh>
                <TableTh>
                  <SellableQuotaHeader label={<Trans>SELLABLE QUOTA</Trans>} />
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {currentData.map((record) => (
                <TableTr key={record.id}>
                  <TableTd className="whitespace-nowrap">{formatDateTime(record.timestamp)}</TableTd>
                  <TableTd className="font-mono">{shortenAddress(record.referee, 13)}</TableTd>
                  <TableTd className="whitespace-nowrap text-right numbers">{formatGt(record.gtReward, "+")}</TableTd>
                  <TableTd className="whitespace-nowrap numbers">{formatGt(record.sellableQuota, "+")}</TableTd>
                </TableTr>
              ))}
            </tbody>
          </table>
        </TableScrollFadeContainer>
      )}
      <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
    </div>
  );
}

function LastTrade({ timestamp }: { timestamp: number | undefined }) {
  if (timestamp === undefined) {
    return (
      <span className="text-typography-secondary">
        <Trans>No trades yet</Trans>
      </span>
    );
  }

  return <span title={formatDateTime(timestamp)}>{formatTimeAgo(timestamp * 1000)}</span>;
}

function RefereesTable({ referees }: { referees: SolanaReferee[] }) {
  const { isMobile } = useBreakpoints();
  const { currentPage, setCurrentPage, pageCount, currentData } = usePagination("SolanaReferralsReferees", referees);

  if (referees.length === 0) {
    return (
      <EmptyRow>
        <Trans>No referees yet</Trans>
        <span className="text-body-small">
          <Trans>Share your referral link to start earning.</Trans>
        </span>
      </EmptyRow>
    );
  }

  return (
    <div className="flex flex-col pb-4">
      {isMobile ? (
        <div className="flex flex-col">
          {currentData.map((referee) => (
            <div
              key={referee.address}
              className="flex items-center justify-between gap-12 border-b-1/2 border-slate-600 px-adaptive py-10 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col gap-2">
                <span className="font-mono text-typography-primary">{shortenAddress(referee.address, 13)}</span>
                <span className="text-body-small text-typography-secondary">
                  <Trans>Joined {formatDate(referee.joinedAt)}</Trans>
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 numbers">
                <span className="text-typography-primary">{formatGt(referee.gtEarned)}</span>
                <span className="text-body-small text-typography-secondary">
                  <LastTrade timestamp={referee.lastTradeAt} />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <TableScrollFadeContainer>
          <table className="w-full min-w-full">
            <thead>
              <TableTheadTr>
                <TableTh>
                  <Trans>REFEREE</Trans>
                </TableTh>
                <TableTh>
                  <Trans>JOINED</Trans>
                </TableTh>
                <TableTh className="text-right">
                  <Trans>GT EARNED</Trans>
                </TableTh>
                <TableTh className="text-right">
                  <SellableQuotaHeader label={<Trans>SELLABLE QUOTA EARNED</Trans>} />
                </TableTh>
                <TableTh>
                  <Trans>LAST TRADE</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {currentData.map((referee) => (
                <TableTr key={referee.address}>
                  <TableTd className="font-mono">{shortenAddress(referee.address, 13)}</TableTd>
                  <TableTd className="whitespace-nowrap">{formatDate(referee.joinedAt)}</TableTd>
                  <TableTd className="whitespace-nowrap text-right numbers">{formatGt(referee.gtEarned)}</TableTd>
                  <TableTd className="whitespace-nowrap text-right numbers">
                    {formatGt(referee.sellableQuotaEarned)}
                  </TableTd>
                  <TableTd className="whitespace-nowrap">
                    <LastTrade timestamp={referee.lastTradeAt} />
                  </TableTd>
                </TableTr>
              ))}
            </tbody>
          </table>
        </TableScrollFadeContainer>
      )}
      <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
    </div>
  );
}
