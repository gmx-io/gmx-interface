import { Trans } from "@lingui/macro";
import type { ReactNode } from "react";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { ProgressRow } from "components/ProgressRow/ProgressRow";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";

import { formatVaultAmount, VaultAmountRatio } from "./VaultAmountRatio";

export function ClosedVaultPanel({
  claimableAmount,
  convertedAmount,
  vestedAmount,
  actions,
}: {
  claimableAmount: bigint | undefined;
  convertedAmount: bigint | undefined;
  vestedAmount: bigint | undefined;
  actions: ReactNode;
}) {
  const remainingEsGmx =
    vestedAmount !== undefined && convertedAmount !== undefined
      ? vestedAmount > convertedAmount
        ? vestedAmount - convertedAmount
        : 0n
      : undefined;

  return (
    <div className="flex flex-col gap-20 px-20 pb-20" data-qa="vesting-closed-vault">
      <AlertInfoCard type="warning" hideClose>
        <span className="font-medium">
          <Trans>Deposits are closed.</Trans>
        </span>{" "}
        <Trans>
          This vault is being retired, so you can no longer add esGMX. Existing vests will remain active, and you can
          claim vested GMX at any time.
        </Trans>
      </AlertInfoCard>

      <div className="flex flex-col gap-16 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
        <ProgressRow
          label={<Trans>Vesting status</Trans>}
          value={<VaultAmountRatio current={convertedAmount} total={vestedAmount} />}
          currentValue={convertedAmount}
          totalValue={vestedAmount}
        />

        <p className="text-body-small leading-[1.4] text-typography-secondary">
          <Trans>
            Stopping vesting claims{" "}
            <span className="font-medium text-typography-primary numbers">
              {formatVaultAmount(claimableAmount)} GMX
            </span>{" "}
            and returns{" "}
            <span className="font-medium text-typography-primary numbers">
              {formatVaultAmount(remainingEsGmx)} esGMX
            </span>{" "}
            to your wallet.
          </Trans>
        </p>

        <SwitchToSettlementChainWarning topic="vesting" />
        <SwitchToSettlementChainButtons>{actions}</SwitchToSettlementChainButtons>
      </div>
    </div>
  );
}
