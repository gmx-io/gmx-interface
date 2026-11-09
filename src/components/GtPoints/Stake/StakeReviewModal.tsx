import { plural, Plural, t, Trans } from "@lingui/macro";

import { helperToast } from "lib/helperToast";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

import { formatGt } from "../gtPointsFormat";
import type { StakeAction } from "./StakePositionsCard";
import { formatLpAmount, formatUsdValue, StakeTokenLabel } from "./StakeTokenLabel";

// Review before confirming: which positions, which amounts, how much GT.
export function StakeReviewModal({ action, onClose }: { action: StakeAction | undefined; onClose: () => void }) {
  const positions = action?.positions ?? [];
  const totalGt = positions.reduce((sum, position) => sum + position.unclaimedGt, 0n);
  const isClaim = action?.kind === "claim";
  const count = positions.length;

  const confirm = () => {
    helperToast.success(
      isClaim
        ? t`Claimed ${formatGt(totalGt)}`
        : t`Unstaked ${plural(count, { one: "# position", other: "# positions" })}`
    );
    onClose();
  };

  return (
    <Modal
      isVisible={action !== undefined}
      setIsVisible={(isVisible) => !isVisible && onClose()}
      label={isClaim ? <Trans>Claim GT</Trans> : <Trans>Unstake</Trans>}
    >
      <div className="flex w-[440px] max-w-full flex-col gap-16">
        <div className="flex flex-col gap-12">
          {positions.map((position) => (
            <div key={position.id} className="flex items-center justify-between gap-12">
              <StakeTokenLabel token={position.token} size={28} />
              <span className="flex flex-col items-end">
                {isClaim ? (
                  <span className="text-body-medium numbers">{formatGt(position.unclaimedGt)}</span>
                ) : (
                  <>
                    <span className="text-body-medium numbers">{formatLpAmount(position.amount, position.token)}</span>
                    <span className="text-body-small text-typography-secondary numbers">
                      {formatUsdValue(position.initialValueUsd)} · {formatGt(position.unclaimedGt)}
                    </span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t-1/2 border-slate-600" />

        <SyntheticsInfoRow
          label={isClaim ? <Trans>Total GT</Trans> : <Trans>Unclaimed GT, claimed with the unstake</Trans>}
          value={<span className="font-medium text-typography-primary numbers">{formatGt(totalGt)}</span>}
        />

        {!isClaim ? (
          <span className="text-body-small text-typography-secondary">
            <Trans>
              The tokens go back to your wallet. If you stake them again, the new position starts at 0% APR.
            </Trans>
          </span>
        ) : null}

        <Button variant="primary-action" className="w-full" onClick={confirm}>
          {isClaim ? (
            <Trans>Claim {formatGt(totalGt)}</Trans>
          ) : (
            <Plural value={count} one="Unstake # position" other="Unstake # positions" />
          )}
        </Button>
      </div>
    </Modal>
  );
}
