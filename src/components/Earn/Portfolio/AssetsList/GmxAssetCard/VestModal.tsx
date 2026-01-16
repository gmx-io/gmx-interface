import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";

import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import useVestingData from "domain/vesting/useVestingData";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import { defined } from "lib/guards";
import type { StakingProcessedData } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { mustNeverExist } from "lib/types";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import { bigMath } from "sdk/utils/bigmath";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import Modal from "components/Modal/Modal";
import { ProgressRow } from "components/ProgressRow/ProgressRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import Tabs from "components/Tabs/Tabs";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import EsGmxIcon from "img/tokens/ic_esgmx.svg?react";
import GmxIcon from "img/tokens/ic_gmx.svg?react";

export type VestVault = "gmx" | "affiliate";
export type VestAction = "deposit" | "withdraw" | "claim";

type VestModalProps = {
  isVisible: boolean;
  setIsVisible: (value: boolean) => void;
  processedData: StakingProcessedData | undefined;
  reservedAmount: bigint;
};

const INITIAL_VALUES = {
  gmx: "",
  affiliate: "",
};

export function VestModal({ isVisible, setIsVisible, processedData, reservedAmount }: VestModalProps) {
  const { chainId } = useChainId();
  const { signer, account, active } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const { openConnectModal } = useConnectModal();
  const vestingData = useVestingData(account);

  const [selectedVault, setSelectedVault] = useState<VestVault>("gmx");
  const [selectedActionByVault, setSelectedActionByVault] = useState<Record<VestVault, VestAction>>({
    gmx: "deposit",
    affiliate: "deposit",
  });
  const [depositValues, setDepositValues] = useState<Record<VestVault, string>>(INITIAL_VALUES);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const hasOutdatedUi = useHasOutdatedUi();

  const activeAction = selectedActionByVault[selectedVault];

  const gmxDepositAmount = parseValue(depositValues.gmx, 18);
  const affiliateDepositAmount = parseValue(depositValues.affiliate, 18);

  const totalRewardTokens = processedData?.bonusGmxInFeeGmx;

  useEffect(() => {
    setDepositValues(INITIAL_VALUES);
  }, [isVisible]);

  const gmxDepositConfig = useMemo(() => {
    const maxVestableAmount = vestingData?.gmxVesterMaxVestableAmount;
    const vestedAmount = vestingData?.gmxVesterVestedAmount;
    const balance = processedData?.esGmxBalance;

    let maxAmount: bigint | undefined;

    if (maxVestableAmount !== undefined && vestedAmount !== undefined) {
      const remainingVestableAmount = maxVestableAmount > vestedAmount ? maxVestableAmount - vestedAmount : 0n;
      maxAmount = remainingVestableAmount;
    }

    if (balance !== undefined) {
      maxAmount = maxAmount !== undefined ? (balance < maxAmount ? balance : maxAmount) : balance;
    }

    return {
      maxAmount,
      balance,
      vestedAmount,
      averageStakedAmount: vestingData?.gmxVesterAverageStakedAmount,
      maxVestableAmount,
      reserveAmount: reservedAmount,
      maxReserveAmount: totalRewardTokens,
    };
  }, [processedData?.esGmxBalance, reservedAmount, totalRewardTokens, vestingData]);

  const affiliateDepositConfig = useMemo(() => {
    const maxVestableAmount = vestingData?.affiliateVesterMaxVestableAmount;
    const vestedAmount = vestingData?.affiliateVesterVestedAmount;
    const balance = processedData?.esGmxBalance;

    let maxAmount: bigint | undefined;

    if (maxVestableAmount !== undefined && vestedAmount !== undefined) {
      const remainingVestableAmount = maxVestableAmount > vestedAmount ? maxVestableAmount - vestedAmount : 0n;
      maxAmount = remainingVestableAmount;
    }

    if (balance !== undefined) {
      maxAmount = maxAmount !== undefined ? (balance < maxAmount ? balance : maxAmount) : balance;
    }

    return {
      maxAmount,
      balance,
      vestedAmount,
      averageStakedAmount: vestingData?.affiliateVesterAverageStakedAmount,
      maxVestableAmount,
    };
  }, [processedData?.esGmxBalance, vestingData]);

  const gmxReservePreview = useMemo(() => {
    let nextReserveAmount = gmxDepositConfig.reserveAmount;
    let nextDepositAmount = gmxDepositConfig.vestedAmount;
    let additionalReserveAmount = 0n;

    if (gmxDepositAmount !== undefined && gmxDepositConfig.vestedAmount !== undefined) {
      nextDepositAmount = gmxDepositConfig.vestedAmount + gmxDepositAmount;
    }

    if (
      gmxDepositAmount !== undefined &&
      nextDepositAmount !== undefined &&
      gmxDepositConfig.averageStakedAmount !== undefined &&
      gmxDepositConfig.maxVestableAmount !== undefined &&
      gmxDepositConfig.maxVestableAmount > 0n &&
      nextReserveAmount !== undefined
    ) {
      nextReserveAmount = bigMath.mulDiv(
        nextDepositAmount,
        gmxDepositConfig.averageStakedAmount,
        gmxDepositConfig.maxVestableAmount
      );
      if (gmxDepositConfig.reserveAmount !== undefined && nextReserveAmount > gmxDepositConfig.reserveAmount) {
        additionalReserveAmount = nextReserveAmount - gmxDepositConfig.reserveAmount;
      }
    }

    return {
      nextReserveAmount,
      nextDepositAmount,
      additionalReserveAmount,
    };
  }, [gmxDepositAmount, gmxDepositConfig]);

  const affiliateNextDepositAmount = (affiliateDepositConfig.vestedAmount ?? 0n) + (affiliateDepositAmount ?? 0n);

  const depositConfig = selectedVault === "gmx" ? gmxDepositConfig : affiliateDepositConfig;
  const depositAmount = selectedVault === "gmx" ? gmxDepositAmount : affiliateDepositAmount;

  const depositError = useMemo(() => {
    if (activeAction !== "deposit") {
      return undefined;
    }

    if (depositAmount === undefined || depositAmount === 0n) {
      return <Trans>Enter an amount</Trans>;
    }

    if (depositConfig.maxAmount !== undefined && depositAmount > depositConfig.maxAmount) {
      return <Trans>Max amount exceeded</Trans>;
    }

    if (
      selectedVault === "gmx" &&
      gmxDepositConfig.maxReserveAmount !== undefined &&
      gmxReservePreview.nextReserveAmount !== undefined &&
      gmxReservePreview.nextReserveAmount > gmxDepositConfig.maxReserveAmount
    ) {
      return <Trans>Insufficient staked tokens</Trans>;
    }

    return undefined;
  }, [
    activeAction,
    depositAmount,
    depositConfig.maxAmount,
    gmxDepositConfig.maxReserveAmount,
    gmxReservePreview.nextReserveAmount,
    selectedVault,
  ]);

  const handleSelectVault = (vault: VestVault) => {
    setSelectedVault(vault);
  };

  const handleSelectAction = (action: VestAction) => {
    setSelectedActionByVault((prev) => ({ ...prev, [selectedVault]: action }));
  };

  const handleSetDepositValue = (value: string) => {
    setDepositValues((prev) => ({ ...prev, [selectedVault]: value }));
  };

  const resetDepositValue = (vault: VestVault) => {
    setDepositValues((prev) => ({ ...prev, [vault]: "" }));
  };

  const handleDeposit = () => {
    if (!chainId || !signer || depositAmount === undefined || depositAmount === 0n) {
      return;
    }

    const vesterAddress =
      selectedVault === "gmx" ? getContract(chainId, "GmxVester") : getContract(chainId, "AffiliateVester");
    const contract = new ethers.Contract(vesterAddress, abis.Vester, signer);

    setIsDepositing(true);
    callContract(chainId, contract, "deposit", [depositAmount], {
      sentMsg: t`Deposit submitted.`,
      failMsg: t`Deposit failed.`,
      successMsg: t`Deposited.`,
      setPendingTxns,
    })
      .then(() => {
        resetDepositValue(selectedVault);
        setIsVisible(false);
      })
      .finally(() => {
        setIsDepositing(false);
      });
  };

  const handleWithdraw = () => {
    if (!chainId || !signer) {
      return;
    }

    const vesterAddress =
      selectedVault === "gmx" ? getContract(chainId, "GmxVester") : getContract(chainId, "AffiliateVester");
    const contract = new ethers.Contract(vesterAddress, abis.Vester, signer);

    setIsWithdrawing(true);
    callContract(chainId, contract, "withdraw", [], {
      sentMsg: t`Withdraw submitted.`,
      failMsg: t`Withdraw failed.`,
      successMsg: t`Withdrawn.`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsWithdrawing(false);
      });
  };

  const handleClaim = () => {
    if (!chainId || !signer) {
      return;
    }

    const affiliateVesterAddress = getContract(chainId, "AffiliateVester");
    const contract = new ethers.Contract(affiliateVesterAddress, abis.Vester, signer);

    setIsClaiming(true);
    callContract(chainId, contract, "claim", [], {
      sentMsg: t`Claim submitted.`,
      failMsg: t`Claim failed.`,
      successMsg: t`Claim completed!`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsClaiming(false);
      });
  };

  const canClaimAffiliate = (vestingData?.affiliateVesterClaimable ?? 0n) > 0n;

  const vaultTabs = useMemo(
    () => [
      { value: "gmx", label: <Trans>GMX Vault</Trans> },
      { value: "affiliate", label: <Trans>Affiliate Vault</Trans> },
    ],
    []
  );

  const actionTabs = useMemo(() => {
    return [
      { value: "deposit", label: <Trans>Deposit</Trans> },
      { value: "withdraw", label: <Trans>Withdraw</Trans> },
      selectedVault === "affiliate" ? { value: "claim", label: <Trans>Claim</Trans> } : null,
    ].filter(defined);
  }, [selectedVault]);

  const onClickMax = () => {
    if (depositConfig.maxAmount === undefined || depositConfig.maxAmount === 0n) {
      return;
    }

    handleSetDepositValue(formatAmountFree(depositConfig.maxAmount, 18, 18));
  };

  const claimableAmount =
    selectedVault === "gmx" ? vestingData?.gmxVesterClaimable : vestingData?.affiliateVesterClaimable;
  const vestedAmount =
    selectedVault === "gmx" ? vestingData?.gmxVesterVestedAmount : vestingData?.affiliateVesterVestedAmount;
  const claimSum = selectedVault === "gmx" ? vestingData?.gmxVesterClaimSum : vestingData?.affiliateVesterClaimSum;
  const canWithdraw = vestedAmount !== undefined && vestedAmount > 0n;

  const actionPrimaryText = useMemo(() => {
    if (hasOutdatedUi) {
      return t`Page outdated, please refresh`;
    }

    if (activeAction === "deposit") {
      if (depositError) {
        return depositError;
      }
      return isDepositing ? <Trans>Depositing</Trans> : <Trans>Deposit</Trans>;
    }
    if (activeAction === "withdraw") {
      if (vestedAmount === undefined || vestedAmount === 0n) {
        return <Trans>No funds to withdraw</Trans>;
      }
      return isWithdrawing ? <Trans>Confirming...</Trans> : <Trans>Confirm Withdraw</Trans>;
    }

    if (claimableAmount === undefined || claimableAmount === 0n) {
      return <Trans>No funds to claim</Trans>;
    }

    return isClaiming ? <Trans>Claiming...</Trans> : <Trans>Claim</Trans>;
  }, [
    activeAction,
    depositError,
    hasOutdatedUi,
    isClaiming,
    isDepositing,
    isWithdrawing,
    vestedAmount,
    claimableAmount,
  ]);

  const isPrimaryDisabled = useMemo(() => {
    if (!active) {
      return false;
    }

    if (hasOutdatedUi) {
      return true;
    }

    if (chainId === undefined || !signer) {
      return true;
    }

    if (activeAction === "deposit") {
      return Boolean(depositError) || isDepositing;
    }

    if (activeAction === "withdraw") {
      return !canWithdraw || isWithdrawing;
    }

    return !canClaimAffiliate || isClaiming;
  }, [
    active,
    activeAction,
    canClaimAffiliate,
    canWithdraw,
    chainId,
    depositError,
    hasOutdatedUi,
    isClaiming,
    isDepositing,
    isWithdrawing,
    signer,
  ]);

  const handleClick = () => {
    switch (activeAction) {
      case "deposit":
        handleDeposit();
        break;
      case "withdraw":
        handleWithdraw();
        break;
      case "claim":
        handleClaim();
        break;
      default:
        mustNeverExist(activeAction);
    }
  };

  const primaryButton = active ? (
    <Button variant="primary-action" className="w-full" onClick={handleClick} disabled={isPrimaryDisabled}>
      {actionPrimaryText}
    </Button>
  ) : (
    <Button
      variant="primary-action"
      className="w-full"
      onClick={() => openConnectModal?.()}
      disabled={!openConnectModal}
    >
      <Trans>Connect Wallet</Trans>
    </Button>
  );

  const [isReadVestingDetailsBannerClosed, setIsReadVestingDetailsBannerClosed] = useLocalStorageSerializeKey(
    "is-read-vesting-details-banner-closed",
    false
  );

  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`Vesting`}
      contentClassName="md:w-[420px] md:min-h-[484px] max-md:pb-20"
      contentPadding={false}
      withMobileBottomPosition={true}
    >
      <div className="flex flex-col gap-20">
        <Tabs
          options={vaultTabs}
          selectedValue={selectedVault}
          onChange={(value) => handleSelectVault(value as VestVault)}
          className="mt-12 !rounded-t-0 border-t-1/2 border-t-slate-600 bg-fill-surfaceElevated50"
          regularOptionClassname="grow"
        />

        <div className="flex flex-col gap-8 px-20">
          {!isReadVestingDetailsBannerClosed && (
            <AlertInfoCard type="info" onClose={() => setIsReadVestingDetailsBannerClosed(true)}>
              <div>
                <Trans>
                  Convert esGMX tokens to GMX tokens. Please read the vesting details before using the vaults.
                </Trans>

                <ColorfulButtonLink to="https://docs.gmx.io/docs/tokenomics/rewards#vesting" newTab>
                  Read details
                </ColorfulButtonLink>
              </div>
            </AlertInfoCard>
          )}

          <Tabs
            options={actionTabs}
            selectedValue={activeAction}
            onChange={(value) => handleSelectAction(value as VestAction)}
            type="inline-primary"
          />

          {activeAction === "deposit" && (
            <>
              <BuyInputSection
                topLeftLabel={t`Deposit`}
                topRightLabel={t`Max`}
                topRightValue={formatGmxAmount(depositConfig.maxAmount)}
                onClickMax={
                  depositConfig.maxAmount !== undefined && depositConfig.maxAmount > 0n ? onClickMax : undefined
                }
                inputValue={depositValues[selectedVault]}
                onInputValueChange={(e) => handleSetDepositValue(e.target.value)}
              >
                <div className="flex items-center gap-4">
                  <EsGmxIcon />
                  esGMX
                </div>
              </BuyInputSection>
              <SwitchToSettlementChainWarning topic="vesting" />
              <div className="Exchange-swap-button-container">
                <SwitchToSettlementChainButtons>{primaryButton}</SwitchToSettlementChainButtons>
              </div>
            </>
          )}

          {activeAction === "withdraw" && (
            <>
              <BuyInputSection
                topLeftLabel={t`Withdraw`}
                inputValue={formatGmxAmount((vestedAmount ?? 0n) - (claimSum ?? 0n))}
                isDisabled
              >
                <div className="flex items-center gap-4">
                  <EsGmxIcon />
                  esGMX
                </div>
              </BuyInputSection>
              <SwitchToSettlementChainWarning topic="vesting" />
              <div className="Exchange-swap-button-container">
                <SwitchToSettlementChainButtons>{primaryButton}</SwitchToSettlementChainButtons>
              </div>
            </>
          )}

          {activeAction === "claim" && (
            <>
              <BuyInputSection topLeftLabel={t`Claim`} inputValue={formatGmxAmount(claimableAmount)} isDisabled>
                <div className="flex items-center gap-4">
                  <GmxIcon className="size-20" />
                  GMX
                </div>
              </BuyInputSection>
              <SwitchToSettlementChainWarning topic="staking" />
              <div className="Exchange-swap-button-container">
                <SwitchToSettlementChainButtons>{primaryButton}</SwitchToSettlementChainButtons>
              </div>
            </>
          )}

          <div className="mt-8 flex flex-col gap-12">
            <ProgressRow
              label={<Trans>Claimable</Trans>}
              value={`${formatGmxAmount(claimableAmount)} GMX`}
              currentValue={claimableAmount}
              totalValue={vestedAmount}
            />
            <ProgressRow
              label={<Trans>Vesting Status</Trans>}
              value={
                <TooltipWithPortal
                  handle={`${formatGmxAmount(claimSum)} / ${formatGmxAmount(vestedAmount)}`}
                  position="top-end"
                  handleClassName="whitespace-nowrap"
                  content={
                    <span>
                      {formatGmxAmount(claimSum)} tokens have been converted to GMX from the{" "}
                      {formatGmxAmount(vestedAmount)} esGMX deposited for vesting.
                    </span>
                  }
                />
              }
              currentValue={claimSum}
              totalValue={vestedAmount}
            />
            {selectedVault === "gmx" && gmxDepositConfig.reserveAmount !== undefined && (
              <ProgressRow
                label={<Trans>Staked tokens reserved for vesting</Trans>}
                value={
                  <TooltipWithPortal
                    handle={`${formatGmxAmount(gmxReservePreview.nextReserveAmount)} / ${formatGmxAmount(
                      gmxDepositConfig.maxReserveAmount
                    )}`}
                    position="top-end"
                    handleClassName="whitespace-nowrap"
                    content={
                      <div>
                        <StatsTooltipRow
                          label={<Trans>Current Reserved:</Trans>}
                          value={formatGmxAmount(gmxDepositConfig.reserveAmount)}
                          showDollar={false}
                        />
                        <StatsTooltipRow
                          label={<Trans>Additional reserve required:</Trans>}
                          value={formatGmxAmount(gmxReservePreview.additionalReserveAmount)}
                          showDollar={false}
                        />
                      </div>
                    }
                  />
                }
                currentValue={gmxReservePreview.nextReserveAmount}
                totalValue={gmxDepositConfig.maxReserveAmount}
              />
            )}
            <ProgressRow
              label={<Trans>Vault Capacity</Trans>}
              value={
                <TooltipWithPortal
                  handle={`${formatGmxAmount(
                    selectedVault === "gmx" ? gmxReservePreview.nextDepositAmount : affiliateNextDepositAmount
                  )} / ${formatGmxAmount(depositConfig.maxVestableAmount)}`}
                  position="top-end"
                  content={
                    <div>
                      <StatsTooltipRow
                        label={<Trans>Deposited:</Trans>}
                        value={formatGmxAmount(depositConfig.vestedAmount)}
                        showDollar={false}
                      />
                      <StatsTooltipRow
                        label={<Trans>Max Capacity:</Trans>}
                        value={formatGmxAmount(depositConfig.maxVestableAmount)}
                        showDollar={false}
                      />
                    </div>
                  }
                />
              }
              currentValue={selectedVault === "gmx" ? gmxReservePreview.nextDepositAmount : affiliateNextDepositAmount}
              totalValue={depositConfig.maxVestableAmount}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

const formatGmxAmount = (amount: bigint | undefined) => {
  return formatAmount(amount, 18, 4, true);
};
