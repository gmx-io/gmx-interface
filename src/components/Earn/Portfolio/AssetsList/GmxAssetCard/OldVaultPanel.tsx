import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useState } from "react";

import { getContract } from "config/contracts";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import useVestingData from "domain/vesting/useVestingData";
import type { OldVestVault } from "domain/vesting/vestingVaults";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import type { ContractName } from "sdk/configs/contracts";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { ProgressRow } from "components/ProgressRow/ProgressRow";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";

import { formatVaultAmount, VaultAmountRatio } from "./VaultAmountRatio";

const VESTER_BY_VAULT: Record<OldVestVault, ContractName> = {
  gmx: "GmxVester",
  glp: "GlpVester",
  affiliate: "AffiliateVester",
};

const VESTING_DATA_KEY_BY_VAULT = {
  gmx: "gmxVester",
  glp: "glpVester",
  affiliate: "affiliateVester",
} as const;

export function OldVaultPanel({ vault, onTxSent }: { vault: OldVestVault; onTxSent: () => void }) {
  const { chainId } = useChainId();
  const { signer, account, active } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const { openConnectModal } = useConnectModal();
  const vestingData = useVestingData(account);
  const hasOutdatedUi = useHasOutdatedUi();

  const [pendingAction, setPendingAction] = useState<"claim" | "withdraw">();
  const [withdrawAcknowledgedVault, setWithdrawAcknowledgedVault] = useState<OldVestVault>();

  const vesterData = vestingData?.[VESTING_DATA_KEY_BY_VAULT[vault]];
  const claimableAmount = vesterData?.claimable;
  const vestedAmount = vesterData?.vestedAmount;
  const convertedAmount = vesterData ? vesterData.claimedAmounts + vesterData.claimable : undefined;
  const remainingEsGmx =
    vestedAmount !== undefined && convertedAmount !== undefined
      ? vestedAmount > convertedAmount
        ? vestedAmount - convertedAmount
        : 0n
      : undefined;

  const canWithdraw = vestedAmount !== undefined && vestedAmount > 0n;
  const canClaim = claimableAmount !== undefined && claimableAmount > 0n;
  const isWithdrawAcknowledged = withdrawAcknowledgedVault === vault;
  const isActionDisabled = hasOutdatedUi || !signer || pendingAction !== undefined;

  const handleAction = (action: "claim" | "withdraw") => {
    if (!signer) {
      return;
    }

    const contract = new ethers.Contract(getContract(chainId, VESTER_BY_VAULT[vault]), abis.Vester, signer);

    setPendingAction(action);
    callContract(chainId, contract, action, [], {
      sentMsg: action === "claim" ? t`Claim submitted` : t`Withdraw submitted`,
      failMsg: action === "claim" ? t`Claim failed` : t`Withdraw failed`,
      successMsg: action === "claim" ? t`Claimed` : t`Withdrawn`,
      setPendingTxns,
    })
      .then(() => {
        onTxSent();
      })
      .catch(() => undefined)
      .finally(() => {
        setPendingAction(undefined);
      });
  };

  const actions = active ? (
    <div className="flex flex-col gap-12">
      {canWithdraw && (
        <Checkbox
          isChecked={isWithdrawAcknowledged}
          setIsChecked={(isChecked) => setWithdrawAcknowledgedVault(isChecked ? vault : undefined)}
          className="!items-start"
        >
          <span className="text-body-small text-typography-secondary">
            <Trans>I understand that esGMX withdrawn now can't be vested anywhere</Trans>
          </span>
        </Checkbox>
      )}
      <Button
        variant="primary"
        size="medium"
        className="w-full"
        onClick={() => handleAction("claim")}
        disabled={isActionDisabled || !canClaim}
      >
        {pendingAction === "claim" ? <Trans>Claiming...</Trans> : <Trans>Claim GMX</Trans>}
      </Button>
      <Button
        variant="secondary"
        size="medium"
        className="w-full"
        onClick={() => handleAction("withdraw")}
        disabled={isActionDisabled || !canWithdraw || !isWithdrawAcknowledged}
      >
        {hasOutdatedUi ? (
          getPageOutdatedError()
        ) : !canWithdraw ? (
          <Trans>No funds to withdraw</Trans>
        ) : pendingAction === "withdraw" ? (
          <Trans>Confirming...</Trans>
        ) : (
          <Trans>Stop vesting & withdraw</Trans>
        )}
      </Button>
    </div>
  ) : (
    <Button
      variant="primary-action"
      className="w-full"
      onClick={() => openConnectModal?.()}
      disabled={!openConnectModal}
    >
      <Trans>Connect wallet</Trans>
    </Button>
  );

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
