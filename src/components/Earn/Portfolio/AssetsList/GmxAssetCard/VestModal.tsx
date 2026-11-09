import { Trans, t } from "@lingui/macro";
import { type ReactNode, useMemo, useState } from "react";

import useVestingData from "domain/vesting/useVestingData";
import { useVestingVaultsData } from "domain/vesting/useVestingVaultsData";
import { getVisibleVestVaults, type VestVault } from "domain/vesting/vestingVaults";
import { useChainId } from "lib/chains";
import { StakingProcessedData } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";

import Modal from "components/Modal/Modal";
import Tabs from "components/Tabs/Tabs";

import { OldVaultPanel } from "./OldVaultPanel";
import { OrphanVaultPanel } from "./OrphanVaultPanel";

type VestModalProps = {
  isVisible: boolean;
  setIsVisible: (value: boolean) => void;
  processedData: StakingProcessedData | undefined;
  reservedAmount: bigint;
};

const VAULT_GROUP_DIVIDER_CLASS =
  "relative before:absolute before:left-0 before:top-9 before:block before:h-22 before:w-[1.5px] before:bg-slate-600";

export function VestModal({ isVisible, setIsVisible, processedData, reservedAmount }: VestModalProps) {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const vestingData = useVestingData(account);
  const vaultsData = useVestingVaultsData(chainId, account);

  const [pickedVault, setPickedVault] = useState<VestVault>();

  const visibleVaults = useMemo(
    () =>
      getVisibleVestVaults({
        orphan: vaultsData?.orphan,
        oldVaults: {
          gmx: { isClosed: vaultsData?.closedOldVaults.gmx, vestedAmount: vestingData?.gmxVesterVestedAmount },
          glp: { isClosed: vaultsData?.closedOldVaults.glp, vestedAmount: vestingData?.glpVesterVestedAmount },
          affiliate: {
            isClosed: vaultsData?.closedOldVaults.affiliate,
            vestedAmount: vestingData?.affiliateVesterVestedAmount,
          },
        },
      }),
    [vaultsData, vestingData]
  );

  const selectedVault =
    pickedVault !== undefined && visibleVaults.includes(pickedVault) ? pickedVault : visibleVaults[0];

  const vaultTabs = useMemo(() => {
    const labels: Record<VestVault, ReactNode> = {
      orphan: <Trans>Legacy vault</Trans>,
      gmx: <Trans>GMX vault</Trans>,
      glp: <Trans>GLP vault</Trans>,
      affiliate: <Trans>Affiliate vault</Trans>,
    };

    return visibleVaults.map((vault, index) => {
      const startsOldVaultsGroup = index > 0 && visibleVaults[index - 1] === "orphan";

      return {
        value: vault,
        label: labels[vault],
        className: startsOldVaultsGroup
          ? { active: VAULT_GROUP_DIVIDER_CLASS, regular: VAULT_GROUP_DIVIDER_CLASS }
          : undefined,
      };
    });
  }, [visibleVaults]);

  const handleSetIsVisible = (value: boolean) => {
    if (!value) {
      setPickedVault(undefined);
    }
    setIsVisible(value);
  };

  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={handleSetIsVisible}
      label={t`Vesting`}
      contentClassName="md:w-[484px] md:min-h-[484px] max-md:pb-20"
      contentPadding={false}
      withMobileBottomPosition={true}
    >
      <div className="flex flex-col gap-20">
        <Tabs
          options={vaultTabs}
          selectedValue={selectedVault}
          onChange={setPickedVault}
          className="!rounded-t-0 bg-fill-surfaceElevated50"
          tabsWrapperClassName="overflow-x-auto scrollbar-hide"
          regularOptionClassname="grow whitespace-nowrap"
          qa="vesting-vaults"
        />

        {selectedVault === "orphan" ? (
          vaultsData && (
            <OrphanVaultPanel
              data={vaultsData.orphan}
              walletEsGmxBalance={processedData?.esGmxBalance}
              stakedAmount={processedData?.bonusGmxInFeeGmx}
            />
          )
        ) : (
          <OldVaultPanel
            vault={selectedVault}
            isClosed={vaultsData?.closedOldVaults[selectedVault] ?? false}
            processedData={processedData}
            reservedAmount={reservedAmount}
            onTxSent={() => handleSetIsVisible(false)}
          />
        )}
      </div>
    </Modal>
  );
}
