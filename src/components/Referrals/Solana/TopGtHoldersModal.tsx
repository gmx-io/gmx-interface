import { Trans, t } from "@lingui/macro";
import { Link } from "react-router-dom";

import { Avatar } from "components/Avatar/Avatar";
import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import rank1Icon from "img/rank1.svg";
import rank2Icon from "img/rank2.svg";
import rank3Icon from "img/rank3.svg";
import gmxIcon from "img/tokens/ic_gmx.svg";

import { formatGt, shortenSolanaAddress } from "./solanaReferralsFormat";
import { GT_POINTS_GLOBAL_PATH, type SolanaGtHolder } from "./solanaReferralsTypes";

const MEDALS: Record<number, string> = { 1: rank1Icon, 2: rank2Icon, 3: rank3Icon };

// The rows look like the Top GT holders list on GT Points (rank medals, avatars, the GMX GT Vault), plus "Use code".
export function TopGtHoldersModal({
  isVisible,
  setIsVisible,
  holders,
  onUseCode,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  holders: SolanaGtHolder[];
  onUseCode: (code: string) => void;
}) {
  return (
    <ModalWithPortal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Top GT holders`} contentPadding={false}>
      <div className="flex w-[560px] max-w-full flex-col">
        <p className="text-body-small px-adaptive pb-8 pt-12 text-typography-secondary">
          <Trans>Use a code from a top GT holder. Every code gives you the same 10% discount.</Trans>
        </p>
        {holders.length === 0 ? (
          <div className="text-body-medium px-20 py-40 text-center text-typography-secondary">
            <Trans>Top holders are not available yet</Trans>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-slate-900">
                <TableTheadTr>
                  <TableTh padding="compact" className="w-0">
                    <Trans>RANK</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>ADDRESS</Trans>
                  </TableTh>
                  <TableTh padding="compact" className="max-md:hidden">
                    <Trans>GT HOLDINGS</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>REFERRAL CODE</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {holders.map((holder) => (
                  <TableTr key={holder.address}>
                    <TableTd padding="compact" className="whitespace-nowrap">
                      <RankCell rank={holder.rank} />
                    </TableTd>
                    <TableTd padding="compact">
                      <span className="flex min-w-0 items-center gap-10">
                        <HolderAvatar holder={holder} />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-body-medium truncate font-medium text-typography-primary">
                            {holder.name ?? (
                              // Shorter on phones (as on GT Points), so "Use code" stays on one line next to the avatar
                              <>
                                <span className="md:hidden">{shortenSolanaAddress(holder.address, 4)}</span>
                                <span className="max-md:hidden">{shortenSolanaAddress(holder.address)}</span>
                              </>
                            )}
                          </span>
                          <span className="text-body-small text-typography-secondary numbers md:hidden">
                            {formatGt(holder.gtBalance)}
                          </span>
                        </span>
                      </span>
                    </TableTd>
                    <TableTd
                      padding="compact"
                      className="text-body-medium whitespace-nowrap font-medium numbers max-md:hidden"
                    >
                      {formatGt(holder.gtBalance)}
                    </TableTd>
                    <TableTd padding="compact">
                      {holder.referralCode ? (
                        <div className="flex items-center justify-end gap-8">
                          {/* Codes can have up to 12 characters: on phones a long one ends with "…", so "Use code" stays on screen */}
                          <span
                            className="text-body-medium min-w-0 text-typography-primary max-md:max-w-[72px] max-md:truncate"
                            title={holder.referralCode}
                          >
                            {holder.referralCode}
                          </span>
                          <Button
                            variant="secondary"
                            size="small"
                            className="shrink-0 whitespace-nowrap"
                            aria-label={t`Use code ${holder.referralCode}`}
                            onClick={() => onUseCode(holder.referralCode!)}
                          >
                            <Trans>Use code</Trans>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex min-h-32 items-center justify-end text-typography-secondary">—</div>
                      )}
                    </TableTd>
                  </TableTr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-center border-t-1/2 border-slate-600 p-12">
          <Link
            to={GT_POINTS_GLOBAL_PATH}
            className="text-body-medium flex items-center gap-4 font-medium text-blue-300 hover:text-typography-primary"
          >
            <Trans>View all on GT Points</Trans>
            <ArrowRightIcon className="size-16" />
          </Link>
        </div>
      </div>
    </ModalWithPortal>
  );
}

// Rank number with the Leaderboard's medals for the top three, as on GT Points
function RankCell({ rank }: { rank: number }) {
  return (
    <span className="inline-flex items-center gap-6">
      <span className="text-body-medium font-medium text-typography-secondary numbers">{rank}</span>
      {MEDALS[rank] ? <img src={MEDALS[rank]} alt="" className="size-20" /> : null}
    </span>
  );
}

// Wallets get their identicon; named protocol accounts, like the GMX GT Vault, get the GMX logo (as on GT Points)
function HolderAvatar({ holder }: { holder: SolanaGtHolder }) {
  if (holder.name) {
    return (
      <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-slate-700">
        <img src={gmxIcon} alt="" className="size-[62%]" />
      </span>
    );
  }

  return (
    <span className="flex size-24 shrink-0 overflow-hidden rounded-full">
      <Avatar size={24} address={holder.address} />
    </span>
  );
}
