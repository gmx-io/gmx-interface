import { Trans, t } from "@lingui/macro";
import { type ReactNode, useMemo, useState } from "react";

import { useOrphanVestingData } from "domain/vesting/useOrphanVestingData";
import useVestingData from "domain/vesting/useVestingData";
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
};

const VAULT_GROUP_DIVIDER_CLASS =
  "relative before:absolute before:left-0 before:top-9 before:block before:h-22 before:w-[1.5px] before:bg-slate-600";

export function VestModal({ isVisible, setIsVisible, processedData }: VestModalProps) {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const vestingData = useVestingData(account);
  const orphanVestingData = useOrphanVestingData(chainId, account);

  const [pickedVault, setPickedVault] = useState<VestVault>();

  const visibleVaults = useMemo(
    () =>
      getVisibleVestVaults({
        orphan: orphanVestingData,
        oldVaultVestedAmounts: {
          gmx: vestingData?.gmxVesterVestedAmount,
          glp: vestingData?.glpVesterVestedAmount,
          affiliate: vestingData?.affiliateVesterVestedAmount,
        },
      }),
    [orphanVestingData, vestingData]
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
          orphanVestingData && (
            <OrphanVaultPanel
              data={orphanVestingData}
              walletEsGmxBalance={processedData?.esGmxBalance}
              stakedAmount={processedData?.bonusGmxInFeeGmx}
            />
          )
        ) : (
          <OldVaultPanel vault={selectedVault} onTxSent={() => handleSetIsVisible(false)} />
        )}
      </div>
    </Modal>
  );
}
