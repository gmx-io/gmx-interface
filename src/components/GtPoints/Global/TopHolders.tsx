import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useCopyToClipboard } from "react-use";

import { helperToast } from "lib/helperToast";
import { useBreakpoints } from "lib/useBreakpoints";

import { Avatar } from "components/Avatar/Avatar";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CopyIcon from "img/ic_copy.svg?react";
import rank1Icon from "img/rank1.svg";
import rank2Icon from "img/rank2.svg";
import rank3Icon from "img/rank3.svg";
import gmxIcon from "img/tokens/ic_gmx.svg";

import { formatGt, getGtReferralLink, shortenSolanaAddress } from "../gtPointsFormat";
import type { GtHolder } from "../gtPointsTypes";

const PAGE_SIZE = 20;
const MEDALS: Record<number, string> = { 1: rank1Icon, 2: rank2Icon, 3: rank3Icon };

export function TopHolders({
  holders,
  account,
  isLoading,
}: {
  holders: GtHolder[] | undefined;
  account: string | undefined;
  isLoading: boolean;
}) {
  const { isMobile } = useBreakpoints();
  const [, copyToClipboard] = useCopyToClipboard();
  const { currentPage, setCurrentPage, pageCount, currentData } = usePagination(
    "gt-top-holders",
    holders ?? [],
    PAGE_SIZE
  );

  const copyLink = (code: string) => {
    copyToClipboard(getGtReferralLink(code));
    helperToast.success(t`Referral link copied to clipboard`);
  };

  const hasRows = !isLoading && Boolean(holders?.length);

  return (
    <div className="flex flex-col overflow-hidden rounded-8 bg-slate-900">
      <div className="flex items-baseline justify-between gap-8 p-20 pb-12">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>Top GT holders</Trans>
        </h3>
        <span className="text-body-small text-typography-secondary">
          <Trans>Top 1,000</Trans>
        </span>
      </div>

      {isMobile ? (
        // Phones: one row per holder, nothing scrolls sideways.
        hasRows ? (
          <div className="flex flex-col">
            {currentData.map((holder) => {
              const isYou = account !== undefined && holder.address === account;
              return (
                <div
                  key={holder.address}
                  className={cx("flex items-center gap-12 px-16 py-12 odd:bg-fill-surfaceElevated50", {
                    "!bg-blue-300/10": isYou,
                  })}
                >
                  <RankCell rank={holder.rank} className="w-40 shrink-0" />
                  <HolderAvatar holder={holder} size={28} />
                  <div className="flex min-w-0 grow flex-col gap-2">
                    <HolderName holder={holder} isYou={isYou} short />
                    <ReferralCode code={holder.referralCode} onCopy={copyLink} small />
                  </div>
                  <span className="text-body-medium shrink-0 font-medium numbers">{formatGt(holder.balance)}</span>
                </div>
              );
            })}
          </div>
        ) : null
      ) : (
        <TableScrollFadeContainer>
          <table className="w-full min-w-[560px]">
            <thead>
              <TableTheadTr>
                <TableTh className="w-[88px]">
                  <Trans>Rank</Trans>
                </TableTh>
                <TableTh>
                  <Trans>Address</Trans>
                </TableTh>
                <TableTh>
                  <Trans>GT holdings</Trans>
                </TableTh>
                <TableTh>
                  <Trans>Referral code</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            {hasRows ? (
              <tbody>
                {currentData.map((holder) => {
                  const isYou = account !== undefined && holder.address === account;
                  return (
                    <TableTr key={holder.address} hoverable className={isYou ? "!bg-blue-300/10" : undefined}>
                      <TableTd className="!py-14">
                        <RankCell rank={holder.rank} />
                      </TableTd>
                      <TableTd className="!py-14">
                        <span className="inline-flex items-center gap-10">
                          <HolderAvatar holder={holder} />
                          <HolderName holder={holder} isYou={isYou} />
                        </span>
                      </TableTd>
                      <TableTd className="text-body-medium !py-14 font-medium numbers">
                        {formatGt(holder.balance)}
                      </TableTd>
                      <TableTd className="!py-14">
                        <ReferralCode code={holder.referralCode} onCopy={copyLink} />
                      </TableTd>
                    </TableTr>
                  );
                })}
              </tbody>
            ) : null}
          </table>
        </TableScrollFadeContainer>
      )}

      <EmptyTableContent
        isLoading={isLoading}
        isEmpty={!holders?.length}
        emptyText={<Trans>Top holders are not available yet</Trans>}
      />

      {!isLoading && (
        <BottomTablePagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setCurrentPage}
          className="border-t-1/2 border-slate-600"
        />
      )}
    </div>
  );
}

// Rank number with the Leaderboard's medals for the top three.
function RankCell({ rank, className }: { rank: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-6", className)}>
      <span className="text-body-medium font-medium text-typography-secondary numbers">{rank}</span>
      {MEDALS[rank] ? <img src={MEDALS[rank]} alt="" className="size-20" /> : null}
    </span>
  );
}

// Identicon for wallets (the same avatar as the wallet menu). Named protocol accounts, like the GMX GT Vault,
// get the GMX logo on a dark circle, so they stand out from traders' wallets.
function HolderAvatar({ holder, size = 24 }: { holder: GtHolder; size?: 24 | 28 }) {
  const sizeClass = size === 28 ? "size-28" : "size-24";

  if (holder.name) {
    return (
      <span className={cx("flex shrink-0 items-center justify-center rounded-full bg-slate-700", sizeClass)}>
        <img src={gmxIcon} alt="" className="size-[62%]" />
      </span>
    );
  }

  return (
    <span className={cx("flex shrink-0 overflow-hidden rounded-full", sizeClass)}>
      <Avatar size={size} address={holder.address} />
    </span>
  );
}

function HolderName({ holder, isYou, short }: { holder: GtHolder; isYou: boolean; short?: boolean }) {
  return (
    <span className="text-body-medium inline-flex min-w-0 items-center gap-8 font-medium text-typography-primary">
      <span className="truncate">{holder.name ?? shortenSolanaAddress(holder.address, short ? 4 : 6)}</span>
      {isYou && (
        <span className="text-body-small shrink-0 rounded-full bg-blue-300/20 px-6 py-2 text-blue-300">
          <Trans>You</Trans>
        </span>
      )}
    </span>
  );
}

function ReferralCode({
  code,
  onCopy,
  small,
}: {
  code: string | undefined;
  onCopy: (code: string) => void;
  small?: boolean;
}) {
  if (!code) {
    return <span className={cx("text-typography-secondary", small ? "text-body-small" : "text-body-medium")}>–</span>;
  }

  return (
    <span
      className={cx(
        "inline-flex items-center gap-6",
        small ? "text-body-small text-typography-secondary" : "text-body-medium text-typography-primary"
      )}
    >
      {code}
      <TooltipWithPortal
        variant="none"
        handle={
          <button
            type="button"
            className="-m-4 flex p-4 text-typography-secondary hover:text-typography-primary"
            onClick={() => onCopy(code)}
            aria-label={t`Copy referral link`}
          >
            <CopyIcon className={small ? "size-14" : "size-16"} />
          </button>
        }
        content={<Trans>Copy referral link</Trans>}
      />
    </span>
  );
}
