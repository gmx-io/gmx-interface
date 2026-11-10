import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { EarningsStat, UsdStatValue, UsdText } from "components/Earn/Portfolio/EarningsOverview/EarningsStat";
import { EarningValue } from "components/EarningValue/EarningValue";
import { UsdValue } from "components/NumericValue/UsdValue";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";

import { formatGtAmount } from "./SolanaEarningsBand";
import { GT_POINTS_BUYBACK_PATH, SolanaEarnGtData } from "./solanaEarnTypes";

function GtRowLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-4 text-typography-secondary hover:text-typography-primary">
      {children}
      <ArrowRightIcon className="size-14" />
    </Link>
  );
}

export function GtPanel({ gt, isLoading }: { gt: SolanaEarnGtData | undefined; isLoading: boolean }) {
  const isAvailable = Boolean(gt);

  return (
    <div className="flex h-full flex-col rounded-8 bg-slate-900">
      <div className="flex flex-col gap-12 p-20">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>GT</Trans>
        </h3>

        <div className="flex gap-28">
          <EarningsStat label={<Trans>Lifetime rewards</Trans>}>
            <UsdStatValue usd={gt?.lifetimeBuybackUsd} isLoading={isLoading} isAvailable={isLoading || isAvailable} />
          </EarningsStat>
          <EarningsStat label={<Trans>Last buyback</Trans>}>
            <UsdStatValue
              usd={gt?.lastBuybackUsd}
              isLoading={isLoading}
              isAvailable={isLoading || isAvailable}
              highlightPositive
            />
          </EarningsStat>
        </div>
      </div>

      <div className="border-t-1/2 border-slate-600" />

      <div className="flex flex-col gap-8 p-20">
        <SyntheticsInfoRow
          label={
            <GtRowLink to={GT_POINTS_BUYBACK_PATH}>
              <Trans>Current sellable GT</Trans>
            </GtRowLink>
          }
          value={
            <EarningValue value={gt?.sellableAmount} isLoading={isLoading} isAvailable={isLoading || isAvailable}>
              {(amount) => (
                <span className={cx("numbers", { "text-slate-500": amount === 0n })}>{formatGtAmount(amount)}</span>
              )}
            </EarningValue>
          }
        />
        <SyntheticsInfoRow
          label={
            <TooltipWithPortal
              variant="iconStroke"
              handle={<Trans>Max sellable value</Trans>}
              content={
                <Trans>
                  Maximum value of your currently sellable GT based on the current minting price, the maximum possible
                  buyback price. Actual buyback value may be lower.
                </Trans>
              }
            />
          }
          value={
            <EarningValue value={gt?.maxSellableUsd} isLoading={isLoading} isAvailable={isLoading || isAvailable}>
              {(usd) => <UsdText usd={usd} className={cx("numbers", { "text-slate-500": usd === 0n })} />}
            </EarningValue>
          }
        />
        <SyntheticsInfoRow
          label={
            <TooltipWithPortal
              variant="iconStroke"
              handle={<Trans>Potential GT value</Trans>}
              content={
                <Trans>
                  Estimated value of your total GT, including unclaimed GT, based on the current minting price. Actual
                  realizable value depends on future sellable quota and buyback prices.
                </Trans>
              }
            />
          }
          value={
            <EarningValue value={gt?.potentialValueUsd} isLoading={isLoading} isAvailable={isLoading || isAvailable}>
              {(usd) => (
                <span className="text-blue-100 numbers">
                  ~<UsdValue usd={usd} />
                </span>
              )}
            </EarningValue>
          }
        />
      </div>
    </div>
  );
}
