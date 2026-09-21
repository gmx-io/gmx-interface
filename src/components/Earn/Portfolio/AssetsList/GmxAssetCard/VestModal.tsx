import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";

import { getContract } from "config/contracts";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import useVestingData from "domain/vesting/useVestingData";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import { formatAmount } from "lib/numbers";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import { ProgressRow } from "components/ProgressRow/ProgressRow";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tabs from "components/Tabs/Tabs";

import EsGmxIcon from "img/tokens/ic_esgmx.svg?react";

type ActiveVestVault = "rewards" | "legacy";
type RetiredVestVault = "gmx" | "affiliate";

export type VestVault = ActiveVestVault | RetiredVestVault;

type VestModalProps = {
  isVisible: boolean;
  setIsVisible: (value: boolean) => void;
};

type RetiredVaultData = {
  claimableAmount: bigint | undefined;
  convertedAmount: bigint | undefined;
  vestedAmount: bigint | undefined;
};

const RETIRED_VAULT_CONTRACTS = {
  gmx: "GmxVester",
  affiliate: "AffiliateVester",
} as const;

const VAULT_GROUP_DIVIDER_CLASS =
  "relative before:left-0 before:top-9 before:absolute before:block before:h-22 before:w-[1.5px] before:bg-slate-600";

function isActiveVestVault(vault: VestVault): vault is ActiveVestVault {
  return vault === "rewards" || vault === "legacy";
}

function isRetiredVestVault(vault: VestVault): vault is RetiredVestVault {
  return vault === "gmx" || vault === "affiliate";
}

function getRemainingEsGmx(data: RetiredVaultData | undefined) {
  if (data?.vestedAmount === undefined || data.convertedAmount === undefined) {
    return undefined;
  }

  return data.vestedAmount > data.convertedAmount ? data.vestedAmount - data.convertedAmount : 0n;
}

function VaultAmountRatio({ current, total }: { current: bigint | undefined; total: bigint | undefined }) {
  return (
    <span className="whitespace-nowrap numbers">
      {formatVaultAmount(current)} / {formatVaultAmount(total)}
    </span>
  );
}

function ActiveVaultPanel({ vault }: { vault: ActiveVestVault }) {
  return (
    <div className="flex flex-col gap-20 px-20 pb-20" data-qa={"vesting-" + vault + "-vault"}>
      <div className="flex flex-col gap-12">
        <BuyInputSection
          topLeftLabel={t`Deposit`}
          topRightLabel={t`Max`}
          topRightValue="—"
          inputValue=""
          isDisabled
          maxDecimals={18}
        >
          <div className="flex items-center gap-4">
            <EsGmxIcon />
            {t`esGMX`}
          </div>
        </BuyInputSection>

        <Button variant="primary-action" className="w-full" disabled>
          <Trans>Coming soon</Trans>
        </Button>
      </div>

      <div className="flex flex-col gap-12">
        <SyntheticsInfoRow
          label={<Trans>Staked tokens reserved for vesting</Trans>}
          value={<VaultAmountRatio current={undefined} total={undefined} />}
        />
        <div className="border-t-1/2 border-slate-600" />
        <SyntheticsInfoRow
          label={<Trans>Vault capacity</Trans>}
          value={<VaultAmountRatio current={undefined} total={undefined} />}
        />
      </div>

      <div className="flex flex-col gap-16 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
        <ProgressRow
          label={<Trans>Vesting status</Trans>}
          value={<VaultAmountRatio current={undefined} total={undefined} />}
        />

        <div className="grid grid-cols-2 gap-12 max-smallMobile:grid-cols-1">
          <Button variant="primary" size="medium" className="w-full" disabled>
            <Trans>Claim GMX</Trans>
          </Button>
          <Button variant="secondary" size="medium" className="w-full" disabled>
            <Trans>Stop vesting</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
}

function RetiredVaultPanel({ data, actions }: { data: RetiredVaultData | undefined; actions: React.ReactNode }) {
  const remainingEsGmx = getRemainingEsGmx(data);

  return (
    <div className="flex flex-col gap-20 px-20 pb-20" data-qa="vesting-retired-vault">
      <AlertInfoCard type="warning" hideClose>
        <div className="flex flex-col gap-12">
          <p>
            <span className="font-medium">
              <Trans>Deposits are closed.</Trans>
            </span>{" "}
            <Trans>
              This vault is being retired, so you can no longer add esGMX. Existing vests will remain active, and you
              can claim vested GMX at any time.
            </Trans>
          </p>
          <p>
            <Trans>
              <span className="font-medium">Note:</span> If you withdraw esGMX that is currently vesting, it will stop
              vesting and cannot be returned for vesting.
            </Trans>
          </p>
        </div>
      </AlertInfoCard>

      <div className="flex flex-col gap-16 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
        <ProgressRow
          label={<Trans>Vesting status</Trans>}
          value={<VaultAmountRatio current={data?.convertedAmount} total={data?.vestedAmount} />}
          currentValue={data?.convertedAmount}
          totalValue={data?.vestedAmount}
        />

        <p className="text-body-small leading-[1.4] text-typography-secondary">
          <Trans>
            Stopping vesting claims{" "}
            <span className="font-medium text-typography-primary numbers">
              {formatGmxAmount(data?.claimableAmount)} GMX
            </span>{" "}
            and returns{" "}
            <span className="font-medium text-typography-primary numbers">{formatGmxAmount(remainingEsGmx)} esGMX</span>{" "}
            to your wallet.
          </Trans>
        </p>

        <SwitchToSettlementChainWarning topic="vesting" />
        <SwitchToSettlementChainButtons>{actions}</SwitchToSettlementChainButtons>
      </div>
    </div>
  );
}

export function VestModal({ isVisible, setIsVisible }: VestModalProps) {
  const { chainId } = useChainId();
  const { signer, account, active, chainId: walletChainId } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const { openConnectModal } = useConnectModal();
  const vestingData = useVestingData(account);
  const hasOutdatedUi = useHasOutdatedUi();

  const [selectedVault, setSelectedVault] = useState<VestVault>("rewards");
  const [pendingAction, setPendingAction] = useState<"claim" | "withdraw">();

  useEffect(() => {
    if (isVisible) {
      setSelectedVault("rewards");
    }
  }, [isVisible]);

  const retiredVaultData: RetiredVaultData | undefined =
    selectedVault === "gmx"
      ? {
          claimableAmount: vestingData?.gmxVesterClaimable,
          convertedAmount: vestingData?.gmxVesterClaimSum,
          vestedAmount: vestingData?.gmxVesterVestedAmount,
        }
      : selectedVault === "affiliate"
        ? {
            claimableAmount: vestingData?.affiliateVesterClaimable,
            convertedAmount: vestingData?.affiliateVesterClaimSum,
            vestedAmount: vestingData?.affiliateVesterVestedAmount,
          }
        : undefined;

  const canWithdraw = retiredVaultData?.vestedAmount !== undefined && retiredVaultData.vestedAmount > 0n;
  const canClaim = (retiredVaultData?.claimableAmount ?? 0n) > 0n;
  const isActionDisabled = hasOutdatedUi || !active || !signer || walletChainId !== chainId || !!pendingAction;

  const handleAction = (action: "claim" | "withdraw") => {
    if (
      isActionDisabled ||
      !signer ||
      !isRetiredVestVault(selectedVault) ||
      (action === "claim" ? !canClaim : !canWithdraw)
    ) {
      return;
    }

    const vesterAddress = getContract(chainId, RETIRED_VAULT_CONTRACTS[selectedVault]);
    const contract = new ethers.Contract(vesterAddress, abis.Vester, signer);

    setPendingAction(action);
    callContract(chainId, contract, action, [], {
      sentMsg: action === "claim" ? t`Claim submitted` : t`Withdraw submitted`,
      failMsg: action === "claim" ? t`Claim failed` : t`Withdraw failed`,
      successMsg: action === "claim" ? t`Claimed` : t`Withdrawn`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .catch(() => undefined)
      .finally(() => {
        setPendingAction(undefined);
      });
  };

  const vaultTabs = useMemo(
    () => [
      { value: "rewards", label: <Trans>Rewards Vault</Trans> },
      { value: "legacy", label: <Trans>Legacy Vault</Trans> },
      {
        value: "gmx",
        label: <Trans>GMX Vault</Trans>,
        className: {
          active: VAULT_GROUP_DIVIDER_CLASS,
          regular: VAULT_GROUP_DIVIDER_CLASS,
        },
      },
      { value: "affiliate", label: <Trans>Affiliate Vault</Trans> },
    ],
    []
  );

  const withdrawPrimaryText = hasOutdatedUi ? (
    getPageOutdatedError()
  ) : !canWithdraw ? (
    <Trans>No funds to withdraw</Trans>
  ) : pendingAction === "withdraw" ? (
    <Trans>Confirming...</Trans>
  ) : (
    <Trans>Stop vesting & withdraw</Trans>
  );

  const vaultActions = active ? (
    <div className="flex flex-col gap-12">
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
        disabled={isActionDisabled || !canWithdraw}
      >
        {withdrawPrimaryText}
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
    <Modal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`Vesting`}
      contentClassName="md:w-[484px] md:min-h-[484px] max-md:pb-20"
      contentPadding={false}
      withMobileBottomPosition={true}
    >
      <div className="flex flex-col gap-20">
        <Tabs
          options={vaultTabs}
          selectedValue={selectedVault}
          onChange={(value) => setSelectedVault(value as VestVault)}
          className="!rounded-t-0 bg-fill-surfaceElevated50"
          tabsWrapperClassName="overflow-x-auto scrollbar-hide"
          regularOptionClassname="grow whitespace-nowrap max-md:grow-0"
          qa="vesting-vaults"
        />

        {isActiveVestVault(selectedVault) ? (
          <ActiveVaultPanel vault={selectedVault} />
        ) : (
          <RetiredVaultPanel data={retiredVaultData} actions={vaultActions} />
        )}
      </div>
    </Modal>
  );
}

const formatGmxAmount = (amount: bigint | undefined) => {
  return formatAmount(amount, 18, 4, true);
};

const formatVaultAmount = (amount: bigint | undefined) => {
  return amount === undefined ? "—" : formatGmxAmount(amount);
};
