import { Trans, t } from "@lingui/macro";
import { Link } from "react-router-dom";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";

import { formatGt, shortenSolanaAddress } from "./solanaReferralsFormat";
import { GT_POINTS_GLOBAL_PATH, type SolanaGtHolder } from "./solanaReferralsTypes";

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
            <Trans>No GT holders to show yet</Trans>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-slate-900">
                <TableTheadTr>
                  <TableTh padding="compact" className="w-0">
                    #
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>HOLDER</Trans>
                  </TableTh>
                  <TableTh padding="compact" className="max-md:hidden">
                    <Trans>GT</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>REFERRAL CODE</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {holders.map((holder) => (
                  <TableTr key={holder.address}>
                    <TableTd padding="compact" className="text-typography-secondary numbers">
                      {holder.rank}
                    </TableTd>
                    <TableTd padding="compact">
                      <div className="font-mono text-typography-primary">{shortenSolanaAddress(holder.address)}</div>
                      <div className="text-body-small text-typography-secondary numbers md:hidden">
                        {formatGt(holder.gtBalance)}
                      </div>
                    </TableTd>
                    <TableTd padding="compact" className="whitespace-nowrap numbers max-md:hidden">
                      {formatGt(holder.gtBalance)}
                    </TableTd>
                    <TableTd padding="compact">
                      {holder.referralCode ? (
                        <div className="flex items-center justify-end gap-8">
                          <span className="font-mono text-typography-primary">{holder.referralCode}</span>
                          <Button variant="secondary" size="small" onClick={() => onUseCode(holder.referralCode!)}>
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
