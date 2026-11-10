import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useMemo, useState } from "react";

import { getContract } from "config/contracts";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import useVestingData from "domain/vesting/useVestingData";
import type { OldVestVault } from "domain/vesting/vestingVaults";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import { defined } from "lib/guards";
import { StakingProcessedData } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { mustNeverExist } from "lib/types";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import type { ContractName } from "sdk/configs/contracts";
import { bigMath } from "sdk/utils/bigmath";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import { ProgressRow } from "components/ProgressRow/ProgressRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tabs from "components/Tabs/Tabs";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import EsGmxIcon from "img/tokens/ic_esgmx.svg?react";
import GmxIcon from "img/tokens/ic_gmx.svg?react";

import { ClosedVaultPanel } from "./ClosedVaultPanel";

export type VestAction = "deposit" | "withdraw" | "claim";

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

type OldVaultPanelProps = {
  vault: OldVestVault;
  isClosed: boolean;
  processedData: StakingProcessedData | undefined;
  reservedAmount: bigint;
  onTxSent: () => void;
};

export function OldVaultPanel({ vault, isClosed, processedData, reservedAmount, onTxSent }: OldVaultPanelProps) {
  const { chainId } = useChainId();
  const { signer, account, active } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const { openConnectModal } = useConnectModal();
  const vestingData = useVestingData(account);

  const [selectedActionByVault, setSelectedActionByVault] = useState<Record<OldVestVault, VestAction>>({
    gmx: "deposit",
    glp: "withdraw",
    affiliate: "deposit",
  });
  const [depositValues, setDepositValues] = useState<Record<OldVestVault, string>>({
    gmx: "",
    glp: "",
    affiliate: "",
  });
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [withdrawAcknowledgedVault, setWithdrawAcknowledgedVault] = useState<OldVestVault>();
  const hasOutdatedUi = useHasOutdatedUi();

  const activeAction = selectedActionByVault[vault];
  const isWithdrawAcknowledged = withdrawAcknowledgedVault === vault;

  const gmxDepositAmount = parseValue(depositValues.gmx, 18);
  const affiliateDepositAmount = parseValue(depositValues.affiliate, 18);

  const totalRewardTokens = processedData?.bonusGmxInFeeGmx;

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

  const depositConfig = vault === "gmx" ? gmxDepositConfig : affiliateDepositConfig;
  const depositAmount = vault === "gmx" ? gmxDepositAmount : affiliateDepositAmount;

  const vesterData = vestingData?.[VESTING_DATA_KEY_BY_VAULT[vault]];
  const claimableAmount = vesterData?.claimable;
  const vestedAmount = vesterData?.vestedAmount;
  const claimSum = vesterData ? vesterData.claimedAmounts + vesterData.claimable : undefined;
  const canWithdraw = vestedAmount !== undefined && vestedAmount > 0n;
  const canClaim = claimableAmount !== undefined && claimableAmount > 0n;

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
      vault === "gmx" &&
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
    vault,
  ]);

  const handleSelectAction = (action: VestAction) => {
    setSelectedActionByVault((prev) => ({ ...prev, [vault]: action }));
  };

  const handleSetDepositValue = (value: string) => {
    setDepositValues((prev) => ({ ...prev, [vault]: value }));
  };

  const getVesterContract = () => {
    if (!signer) {
      return undefined;
    }

    return new ethers.Contract(getContract(chainId, VESTER_BY_VAULT[vault]), abis.Vester, signer);
  };

  const handleDeposit = () => {
    const contract = getVesterContract();

    if (!contract || depositAmount === undefined || depositAmount === 0n) {
      return;
    }

    setIsDepositing(true);
    callContract(chainId, contract, "deposit", [depositAmount], {
      sentMsg: t`Deposit submitted`,
      failMsg: t`Deposit failed`,
      successMsg: t`Deposited`,
      setPendingTxns,
    })
      .then(() => {
        setDepositValues((prev) => ({ ...prev, [vault]: "" }));
        onTxSent();
      })
      .catch(() => undefined)
      .finally(() => {
        setIsDepositing(false);
      });
  };

  const handleWithdraw = () => {
    const contract = getVesterContract();

    if (!contract) {
      return;
    }

    setIsWithdrawing(true);
    callContract(chainId, contract, "withdraw", [], {
      sentMsg: t`Withdraw submitted`,
      failMsg: t`Withdraw failed`,
      successMsg: t`Withdrawn`,
      setPendingTxns,
    })
      .then(() => {
        onTxSent();
      })
      .catch(() => undefined)
      .finally(() => {
        setIsWithdrawing(false);
      });
  };

  const handleClaim = () => {
    const contract = getVesterContract();

    if (!contract) {
      return;
    }

    setIsClaiming(true);
    callContract(chainId, contract, "claim", [], {
      sentMsg: t`Claim submitted`,
      failMsg: t`Claim failed`,
      successMsg: t`Claimed`,
      setPendingTxns,
    })
      .then(() => {
        onTxSent();
      })
      .catch(() => undefined)
      .finally(() => {
        setIsClaiming(false);
      });
  };

  const actionTabs = useMemo(() => {
    return [
      vault !== "glp" ? { value: "deposit", label: <Trans>Deposit</Trans> } : undefined,
      { value: "withdraw", label: <Trans>Withdraw</Trans> },
      { value: "claim", label: <Trans>Claim</Trans> },
    ].filter(defined);
  }, [vault]);

  const onClickMax = () => {
    if (depositConfig.maxAmount === undefined || depositConfig.maxAmount === 0n) {
      return;
    }

    handleSetDepositValue(formatAmountFree(depositConfig.maxAmount, 18, 18));
  };

  const actionPrimaryText = useMemo(() => {
    if (hasOutdatedUi) {
      return getPageOutdatedError();
    }

    if (activeAction === "deposit") {
      if (depositError) {
        return depositError;
      }
      return isDepositing ? <Trans>Depositing...</Trans> : <Trans>Deposit</Trans>;
    }
    if (activeAction === "withdraw") {
      if (vestedAmount === undefined || vestedAmount === 0n) {
        return <Trans>No funds to withdraw</Trans>;
      }
      return isWithdrawing ? <Trans>Confirming...</Trans> : getWithdrawText(vault);
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
    vault,
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

    return !canClaim || isClaiming;
  }, [
    active,
    activeAction,
    canClaim,
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

  const connectWalletButton = (
    <Button
      variant="primary-action"
      className="w-full"
      onClick={() => openConnectModal?.()}
      disabled={!openConnectModal}
    >
      <Trans>Connect wallet</Trans>
    </Button>
  );

  const primaryButton = active ? (
    <Button variant="primary-action" className="w-full" onClick={handleClick} disabled={isPrimaryDisabled}>
      {actionPrimaryText}
    </Button>
  ) : (
    connectWalletButton
  );

  const [isReadVestingDetailsBannerClosed, setIsReadVestingDetailsBannerClosed] = useLocalStorageSerializeKey(
    "is-read-vesting-details-banner-closed",
    false
  );

  if (isClosed) {
    const isActionDisabled = hasOutdatedUi || !signer || isClaiming || isWithdrawing;

    return (
      <ClosedVaultPanel
        claimableAmount={claimableAmount}
        convertedAmount={claimSum}
        vestedAmount={vestedAmount}
        actions={
          active ? (
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
                onClick={handleClaim}
                disabled={isActionDisabled || !canClaim}
              >
                {isClaiming ? <Trans>Claiming...</Trans> : <Trans>Claim GMX</Trans>}
              </Button>
              <Button
                variant="secondary"
                size="medium"
                className="w-full"
                onClick={handleWithdraw}
                disabled={isActionDisabled || !canWithdraw || !isWithdrawAcknowledged}
              >
                {hasOutdatedUi ? (
                  getPageOutdatedError()
                ) : !canWithdraw ? (
                  <Trans>No funds to withdraw</Trans>
                ) : isWithdrawing ? (
                  <Trans>Confirming...</Trans>
                ) : (
                  <Trans>Stop vesting & withdraw</Trans>
                )}
              </Button>
            </div>
          ) : (
            connectWalletButton
          )
        }
      />
    );
  }

  const readVestingDetailsBanner = !isReadVestingDetailsBannerClosed && (
    <AlertInfoCard type="info" onClose={() => setIsReadVestingDetailsBannerClosed(true)}>
      <div>
        <Trans>Convert esGMX to GMX tokens. Read the vesting details before using the vaults.</Trans>

        <ColorfulButtonLink color="blue" to="https://docs.gmx.io/docs/tokenomics/rewards/#vesting" newTab>
          <Trans>Read more</Trans>
        </ColorfulButtonLink>
      </div>
    </AlertInfoCard>
  );

  return (
    <div className="flex flex-col gap-8 px-20 pb-20">
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
            onClickMax={depositConfig.maxAmount !== undefined && depositConfig.maxAmount > 0n ? onClickMax : undefined}
            isMaxSelected={depositAmount === depositConfig.maxAmount}
            inputValue={depositValues[vault]}
            onInputValueChange={(e) => handleSetDepositValue(e.target.value)}
            maxDecimals={18}
          >
            <div className="flex items-center gap-4">
              <EsGmxIcon />
              {t`esGMX`}
            </div>
          </BuyInputSection>
          <SwitchToSettlementChainWarning topic="vesting" />
          {readVestingDetailsBanner}
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
            maxDecimals={18}
          >
            <div className="flex items-center gap-4">
              <EsGmxIcon />
              {t`esGMX`}
            </div>
          </BuyInputSection>
          <SwitchToSettlementChainWarning topic="vesting" />
          {readVestingDetailsBanner}
          <div className="Exchange-swap-button-container">
            <SwitchToSettlementChainButtons>{primaryButton}</SwitchToSettlementChainButtons>
          </div>
        </>
      )}

      {activeAction === "claim" && (
        <>
          <BuyInputSection
            topLeftLabel={t`Claim`}
            inputValue={formatGmxAmount(claimableAmount)}
            isDisabled
            maxDecimals={18}
          >
            <div className="flex items-center gap-4">
              <GmxIcon className="size-20" />
              {t`GMX`}
            </div>
          </BuyInputSection>
          <SwitchToSettlementChainWarning topic="staking" />
          {readVestingDetailsBanner}
          <div className="Exchange-swap-button-container">
            <SwitchToSettlementChainButtons>{primaryButton}</SwitchToSettlementChainButtons>
          </div>
        </>
      )}

      <div className="mt-12 flex flex-col gap-16">
        {vault !== "glp" && (
          <div className="flex flex-col gap-12">
            {vault === "gmx" && gmxDepositConfig.reserveAmount !== undefined && (
              <>
                <SyntheticsInfoRow
                  label={<Trans>Staked tokens reserved for vesting</Trans>}
                  value={
                    <TooltipWithPortal
                      handle={`${formatGmxAmount(gmxReservePreview.nextReserveAmount)} / ${formatGmxAmount(
                        gmxDepositConfig.maxReserveAmount
                      )}`}
                      position="top-end"
                      handleClassName="whitespace-nowrap numbers"
                      content={
                        <div>
                          <StatsTooltipRow
                            label={<Trans>Current reserved:</Trans>}
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
                />
                <div className="border-t-1/2 border-slate-600" />
              </>
            )}
            <SyntheticsInfoRow
              label={<Trans>Vault capacity</Trans>}
              value={
                <TooltipWithPortal
                  handle={`${formatGmxAmount(
                    vault === "gmx" ? gmxReservePreview.nextDepositAmount : affiliateNextDepositAmount
                  )} / ${formatGmxAmount(depositConfig.maxVestableAmount)}`}
                  position="top-end"
                  handleClassName="whitespace-nowrap numbers"
                  content={
                    <div>
                      <StatsTooltipRow
                        label={<Trans>Deposited:</Trans>}
                        value={formatGmxAmount(depositConfig.vestedAmount)}
                        showDollar={false}
                      />
                      <StatsTooltipRow
                        label={<Trans>Max capacity:</Trans>}
                        value={formatGmxAmount(depositConfig.maxVestableAmount)}
                        showDollar={false}
                      />
                    </div>
                  }
                />
              }
            />
          </div>
        )}

        <div className="flex flex-col gap-16 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
          <ProgressRow
            label={<Trans>Vesting status</Trans>}
            value={
              <TooltipWithPortal
                handle={`${formatGmxAmount(claimSum)} / ${formatGmxAmount(vestedAmount)}`}
                position="top-end"
                handleClassName="whitespace-nowrap numbers"
                content={
                  <span>
                    <Trans>
                      {formatGmxAmount(claimSum)} tokens converted to GMX from the {formatGmxAmount(vestedAmount)} esGMX
                      deposited for vesting
                    </Trans>
                  </span>
                }
              />
            }
            currentValue={claimSum}
            totalValue={vestedAmount}
          />
          <SyntheticsInfoRow
            label={<Trans>Claimable</Trans>}
            value={<span className="numbers">{t`${formatGmxAmount(claimableAmount)} GMX`}</span>}
          />
        </div>
      </div>
    </div>
  );
}

function getWithdrawText(vault: OldVestVault) {
  return vault === "gmx" ? <Trans>Withdraw and unreserve GMX</Trans> : <Trans>Confirm withdraw</Trans>;
}

const formatGmxAmount = (amount: bigint | undefined) => {
  return formatAmount(amount, 18, 4, true);
};
