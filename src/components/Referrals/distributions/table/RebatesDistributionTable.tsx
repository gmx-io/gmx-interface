import { Trans } from "@lingui/macro";
import { Fragment } from "react";

import { RebateDistribution } from "domain/referrals";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { GridHeaderCell, GridRow } from "./Grid";
import { getAmountsByTokens, RebateDistributionRow } from "./RebateDistributionRow";
import { RebateDistributionRowDetail } from "./RebateDistributionRowDetail";

type RebatesDistributionTableProps = {
  currentRebateData: RebateDistribution[];
  chainId: number;
  currentRebatePage: number;
  rebatePageCount: number;
  setCurrentRebatePage: (page: number) => void;
  selectedRebateId: string | undefined;
  toggleSelectedRebateId: (rebateId: string) => void;
};

export function RebatesDistributionTable({
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

          {currentRebateData.map((rebate) => {
            const amountsByTokens = getAmountsByTokens(rebate, chainId);
            return (
              <Fragment key={rebate.id}>
                <RebateDistributionRow
                  rebate={rebate}
                  chainId={chainId}
                  amountsByTokens={amountsByTokens}
                  isSelected={selectedRebateId === rebate.id}
                  onClick={toggleSelectedRebateId}
                />

                {selectedRebateId === rebate.id && (
                  <RebateDistributionRowDetail rebate={rebate} chainId={chainId} amountsByTokens={amountsByTokens} />
                )}
              </Fragment>
            );
          })}
        </div>
      </TableScrollFadeContainer>
      <BottomTablePagination page={currentRebatePage} pageCount={rebatePageCount} onPageChange={setCurrentRebatePage} />
    </div>
  );
}
