import { Plural, t, Trans } from "@lingui/macro";
import { useState } from "react";

import { helperToast } from "lib/helperToast";
import { EMPTY_ARRAY } from "lib/objects";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { formatSol } from "../gtPointsFormat";
import type { GtRentAccount } from "../gtPointsTypes";

export function AccountRentCard({
  accounts,
  isConnected,
}: {
  accounts: GtRentAccount[] | undefined;
  isConnected: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isConnected) return null;

  const total = (accounts ?? []).reduce((sum, account) => sum + account.sol, 0n);
  const count = accounts?.length ?? 0;
  const totalSol = formatSol(total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-12 rounded-8 bg-slate-900 p-20">
      <div className="flex flex-col gap-4">
        <TooltipWithPortal
          variant="iconStroke"
          handle={
            <span className="text-body-medium font-medium text-typography-primary">
              <Trans>Account rent</Trans>
            </span>
          }
          content={
            <Trans>
              Each GT sale opens a small Solana account that holds SOL as rent. After the buyback, you can close these
              accounts and get the SOL back.
            </Trans>
          }
        />
        <span className="text-body-small text-typography-secondary numbers">
          {accounts === undefined ? (
            <Trans>Not available yet</Trans>
          ) : count === 0 ? (
            <Trans>No rent to claim</Trans>
          ) : (
            <Trans>
              {totalSol} to claim from <Plural value={count} one="# account" other="# accounts" />
            </Trans>
          )}
        </span>
      </div>

      <Button variant="secondary" disabled={count === 0} onClick={() => setIsOpen(true)}>
        <Trans>Claim rent</Trans>
      </Button>

      <ClaimRentModal isVisible={isOpen} setIsVisible={setIsOpen} accounts={accounts ?? EMPTY_ARRAY} total={total} />
    </div>
  );
}

function ClaimRentModal({
  isVisible,
  setIsVisible,
  accounts,
  total,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  accounts: GtRentAccount[];
  total: bigint;
}) {
  const claim = () => {
    helperToast.success(t`Claimed ${formatSol(total)} of account rent`);
    setIsVisible(false);
  };

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={<Trans>Claim account rent</Trans>}>
      <div className="flex w-[400px] max-w-full flex-col gap-16">
        <span className="text-body-small text-typography-secondary">
          <Trans>These accounts held your past GT sales. Closing them returns their rent to your wallet.</Trans>
        </span>

        <div className="flex flex-col gap-10">
          {accounts.map((account) => (
            <SyntheticsInfoRow
              key={account.id}
              label={account.label}
              value={<span className="numbers">{formatSol(account.sol)}</span>}
            />
          ))}
        </div>

        <div className="border-t-1/2 border-slate-600" />

        <SyntheticsInfoRow
          label={<Trans>Total</Trans>}
          value={<span className="font-medium text-typography-primary numbers">{formatSol(total)}</span>}
        />

        <Button variant="primary-action" className="w-full" onClick={claim}>
          <Trans>Claim {formatSol(total)}</Trans>
        </Button>
      </div>
    </Modal>
  );
}
