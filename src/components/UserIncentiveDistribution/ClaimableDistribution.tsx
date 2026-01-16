import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useState } from "react";

import type { ClaimableAmountsData, DistributionConfiguration } from "domain/synthetics/claims/useUserClaimableAmounts";
import { formatBalanceAmount, formatUsd } from "lib/numbers";

import Checkbox from "components/Checkbox/Checkbox";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { getDistributionTitle } from "./utils";

export function ClaimableDistribution({
  distributionId,
  claimableAmountsData,
  distributionConfiguration,
  selected,
  onToggle,
}: {
  distributionId: string;
  claimableAmountsData: ClaimableAmountsData;
  distributionConfiguration?: DistributionConfiguration;
  selected: boolean;
  onToggle: (distributionId: string) => void;
}) {
  const { claimsDisabled } = distributionConfiguration ?? {};
  const [isExpanded, setIsExpanded] = useState(false);

  const onViewBreakdown = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, [setIsExpanded]);

  if (claimsDisabled || claimableAmountsData.amounts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-8 bg-fill-surfaceElevated50 lg:pl-12">
      <div className="flex items-center justify-between rounded-t-8 border-b-1/2 border-slate-600 p-12 lg:pl-0">
        <div className="flex items-center justify-between gap-4">
          <Checkbox isChecked={selected} setIsChecked={() => onToggle(distributionId)} className="mr-2" />
          <span className="text-body-medium font-medium text-typography-primary">
            {getDistributionTitle(distributionId)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-8 rounded-b-8 p-12 lg:pl-0">
        <div className="flex items-center justify-between">
          <div className="flex cursor-pointer items-center gap-4" onClick={onViewBreakdown}>
            <span className="text-body-small cursor-pointer select-none font-medium text-typography-secondary">
              {isExpanded ? <Trans>Hide breakdown</Trans> : <Trans>View breakdown</Trans>}
            </span>
            <ChevronDownIcon className={cx("size-14 text-typography-secondary", { "rotate-180": isExpanded })} />
          </div>

          <span className="text-body-small text-typography-secondary">{formatUsd(claimableAmountsData.totalUsd)}</span>
        </div>

        {isExpanded
          ? Object.entries(claimableAmountsData.amounts)
              .filter(([, data]) => data?.amount !== undefined && data?.amount !== 0n)
              .map(([token, data]) => (
                <div key={token}>
                  <div className="flex justify-between">
                    <div className="text-body-small font-medium text-typography-secondary">{data.title}</div>
                    <div className="flex gap-2 text-12">
                      <span>{formatBalanceAmount(data.amount, data.token.decimals)}</span>
                      <span className="text-body-small whitespace-nowrap text-typography-secondary">
                        ({formatUsd(data?.usd ?? 0n)})
                      </span>
                    </div>
                  </div>
                </div>
              ))
          : null}
      </div>
    </div>
  );
}
