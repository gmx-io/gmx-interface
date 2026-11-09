import { t, Trans } from "@lingui/macro";
import { useCopyToClipboard } from "react-use";

import { helperToast } from "lib/helperToast";

import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CopyIcon from "img/ic_copy.svg?react";

import { formatGt, getGtReferralLink, shortenSolanaAddress } from "../gtPointsFormat";
import type { GtHolder } from "../gtPointsTypes";

const PAGE_SIZE = 20;

export function TopHolders({
  holders,
  account,
  isLoading,
}: {
  holders: GtHolder[] | undefined;
  account: string | undefined;
  isLoading: boolean;
}) {
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

      <TableScrollFadeContainer>
        <table className="w-full min-w-[560px]">
          <thead>
            <TableTheadTr>
              <TableTh className="w-[72px]">
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
          {!isLoading && holders?.length ? (
            <tbody>
              {currentData.map((holder) => {
                const isYou = account !== undefined && holder.address === account;
                return (
                  <TableTr key={holder.rank} className={isYou ? "!bg-blue-300/10" : undefined}>
                    <TableTd className="text-body-medium font-medium text-typography-secondary numbers">
                      {holder.rank}
                    </TableTd>
                    <TableTd className="text-body-medium font-medium">
                      <span className="inline-flex items-center gap-8">
                        {holder.name ?? shortenSolanaAddress(holder.address)}
                        {isYou && (
                          <span className="text-body-small rounded-full bg-blue-300/20 px-6 py-2 text-blue-300">
                            <Trans>You</Trans>
                          </span>
                        )}
                      </span>
                    </TableTd>
                    <TableTd className="text-body-medium numbers">{formatGt(holder.balance)}</TableTd>
                    <TableTd className="text-body-medium">
                      {holder.referralCode ? (
                        <span className="inline-flex items-center gap-6">
                          {holder.referralCode}
                          <TooltipWithPortal
                            variant="none"
                            handle={
                              <button
                                type="button"
                                className="flex text-typography-secondary hover:text-typography-primary"
                                onClick={() => copyLink(holder.referralCode!)}
                                aria-label={t`Copy referral link`}
                              >
                                <CopyIcon className="size-16" />
                              </button>
                            }
                            content={<Trans>Copy referral link</Trans>}
                          />
                        </span>
                      ) : (
                        <span className="text-typography-secondary">–</span>
                      )}
                    </TableTd>
                  </TableTr>
                );
              })}
            </tbody>
          ) : null}
        </table>
      </TableScrollFadeContainer>

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
