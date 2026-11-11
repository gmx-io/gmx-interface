import { Trans } from "@lingui/macro";
import cx from "classnames";

import Button from "components/Button/Button";
import { EarningValue } from "components/EarningValue/EarningValue";

import { formatGt } from "../gtPointsFormat";
import { GT_POINTS_STAKE_PATH } from "../gtPointsTypes";

type Props = {
  unclaimedFromStaking: bigint | undefined;
  isConnected: boolean;
  isLoading: boolean;
};

export function UnclaimedGtCard({ unclaimedFromStaking, isConnected, isLoading }: Props) {
  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <h3 className="text-body-large p-20 pb-16 font-medium text-typography-primary">
        <Trans>Unclaimed GT</Trans>
      </h3>

      <div className="border-t-1/2 border-slate-600" />

      <div className="flex flex-wrap items-center justify-between gap-16 p-20">
        <div className="flex flex-col gap-4">
          <div className="text-body-large flex items-baseline gap-6">
            {isConnected ? (
              <EarningValue value={unclaimedFromStaking} isLoading={isLoading} skeletonWidth={90}>
                {(amount) => (
                  <span
                    className={cx("font-medium numbers", amount === 0n ? "text-slate-500" : "text-typography-primary")}
                  >
                    {formatGt(amount)}
                  </span>
                )}
              </EarningValue>
            ) : (
              <span className="font-medium text-slate-500">–</span>
            )}
            <span className="text-typography-secondary">
              <Trans>from staking</Trans>
            </span>
          </div>
          <span className="text-body-small text-typography-secondary">
            <Trans>GT earned from staking GLV / GM</Trans>
          </span>
        </div>

        <Button variant="secondary" to={GT_POINTS_STAKE_PATH}>
          <Trans>Manage stake</Trans>
        </Button>
      </div>
    </div>
  );
}
