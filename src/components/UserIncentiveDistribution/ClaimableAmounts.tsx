import { Trans } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { createClaimAmountsTransaction } from "domain/synthetics/claims/createClaimTransaction";
import { useClaimExecutionFee } from "domain/synthetics/claims/useClaimExecutionFee";
import { useClaimFundsTransactionCallback } from "domain/synthetics/claims/useClaimFundsTransactionCallback";
import useUserClaimableAmounts from "domain/synthetics/claims/useUserClaimableAmounts";
import { estimateExecutionGasPrice, getExecutionFeeBufferBps } from "domain/synthetics/fees/utils/executionFee";
import { useTokenBalances } from "domain/synthetics/tokens";
import { formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import EarnIcon from "img/ic_earn.svg?react";

import { ClaimableDistribution } from "./ClaimableDistribution";

export default function ClaimableAmounts() {
  const { account, signer } = useWallet();
  const chainId = useSelector(selectChainId);
  const { claimsConfigByDistributionId, claimableAmountsDataByDistributionId, isLoading, onClaimed } =
    useUserClaimableAmounts(chainId, account);
  const settings = useSettings();

  const [isClaiming, setIsClaiming] = useState(false);
  const [selectedDistributionIds, setSelectedDistributionIds] = useState<string[]>([]);
  const [signatures, setSignatures] = useState<Record<string, string>>({});

  const onSignTerms = useCallback((distributionId: string, signature: string) => {
    setSignatures((prev) => ({ ...prev, [distributionId]: signature }));
  }, []);

  const toggleDistributionId = useCallback((distributionId: string) => {
    setSelectedDistributionIds((prev) => {
      if (prev.includes(distributionId)) {
        return prev.filter((id) => id !== distributionId);
      }
      return [...prev, distributionId];
    });
  }, []);

  const { data: executionFee } = useClaimExecutionFee({
    selectedDistributionIds,
    claimableAmountsDataByDistributionId,
    claimsConfigByDistributionId,
    signatures,
    chainId,
    signer,
    account,
  });

  const onClaimSuccess = useCallback(() => {
    onClaimed(selectedDistributionIds);
    setSelectedDistributionIds([]);
  }, [onClaimed, selectedDistributionIds]);

  const claimFundsTransactionCallback = useClaimFundsTransactionCallback({
    selectedDistributionIds,
    onSuccess: onClaimSuccess,
  });

  const claimAmounts = useCallback(async () => {
    if (!signer || !account || !claimableAmountsDataByDistributionId) {
      return;
    }

    setIsClaiming(true);
    try {
      await createClaimAmountsTransaction({
        selectedDistributionIds,
        claimableAmountsDataByDistributionId,
        signatures,
        chainId,
        signer,
        account,
        callback: claimFundsTransactionCallback,
      });
    } finally {
      setIsClaiming(false);
    }
  }, [
    signer,
    account,
    chainId,
    claimFundsTransactionCallback,
    claimableAmountsDataByDistributionId,
    selectedDistributionIds,
    signatures,
  ]);

  const { balancesData } = useTokenBalances(chainId);
  const userNativeTokenBalance = getByKey(balancesData, NATIVE_TOKEN_ADDRESS);

  const totalFundsToClaimUsd = useMemo(() => {
    return selectedDistributionIds.reduce((acc, curr) => {
      acc += claimableAmountsDataByDistributionId?.[curr]?.totalUsd ?? 0n;
      return acc;
    }, 0n);
  }, [selectedDistributionIds, claimableAmountsDataByDistributionId]);

  const { isButtonDisabled, buttonText, buttonTooltipText, hasAvailableFundsToCoverExecutionFee } = useMemo(() => {
    let isButtonDisabled = false;

    const requiredExecutionFee = estimateExecutionGasPrice({
      rawGasPrice: executionFee,
      maxPriorityFeePerGas: 0n,
      bufferBps: getExecutionFeeBufferBps(chainId, settings.executionFeeBufferBps),
      premium: 0n,
    });

    const hasAvailableFundsToCoverExecutionFee =
      userNativeTokenBalance !== undefined &&
      (executionFee !== undefined ? userNativeTokenBalance >= requiredExecutionFee : true);

    isButtonDisabled = !hasAvailableFundsToCoverExecutionFee;

    let buttonText = <Trans>Claim funds</Trans>;

    if (isClaiming) {
      buttonText = <Trans>Claiming...</Trans>;
    }

    let buttonTooltipText: React.ReactNode | null = null;

    if (selectedDistributionIds.length === 0) {
      buttonTooltipText = <Trans>Select at least one distribution to claim.</Trans>;
      isButtonDisabled = true;
    }

    if (totalFundsToClaimUsd === 0n) {
      isButtonDisabled = true;
    }

    return {
      isButtonDisabled,
      buttonText,
      buttonTooltipText,
      hasAvailableFundsToCoverExecutionFee,
    };
  }, [
    chainId,
    settings.executionFeeBufferBps,
    userNativeTokenBalance,
    executionFee,
    isClaiming,
    selectedDistributionIds,
    totalFundsToClaimUsd,
  ]);

  /**
   * Display the insufficient gas alert if:
   * - The user signed the claim terms
   * - The user does not have enough funds to cover the execution fee
   */
  const displayInsufficientGasAlert = !hasAvailableFundsToCoverExecutionFee;

  const buttonContent = (
    <Button variant="primary" size="medium" disabled={isButtonDisabled} onClick={claimAmounts} className="w-full">
      <EarnIcon className="size-16" />
      {buttonText}
    </Button>
  );

  const buttonElement = buttonTooltipText ? (
    <TooltipWithPortal content={buttonTooltipText} variant="none" handleClassName="w-full" contentClassName="w-full">
      {buttonContent}
    </TooltipWithPortal>
  ) : (
    buttonContent
  );

  const claimableEntries = useMemo(
    () =>
      Object.entries(claimableAmountsDataByDistributionId ?? {}).filter(
        ([distributionId]) => !claimsConfigByDistributionId?.[distributionId]?.claimsDisabled
      ),
    [claimableAmountsDataByDistributionId, claimsConfigByDistributionId]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-16">
        <Skeleton className="h-64 w-full" baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" />
      </div>
    );
  }

  if (claimableEntries.length === 0) {
    return (
      <div className="flex flex-col gap-16">
        <span className="text-body-medium font-medium text-typography-secondary">No distributions to claim</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-16">
      {claimableEntries.length > 0 &&
        claimableEntries.map(([distributionId, data]) => (
          <ClaimableDistribution
            key={distributionId}
            selected={selectedDistributionIds.includes(distributionId)}
            onToggle={toggleDistributionId}
            distributionId={distributionId}
            claimableAmountsData={data}
            distributionConfiguration={claimsConfigByDistributionId?.[distributionId]}
            onSignTerms={onSignTerms}
          />
        ))}

      <div className="flex items-center justify-between">
        <span className="text-body-medium font-medium text-typography-secondary">Total to claim</span>
        <span className="text-body-medium text-typography-primary">{formatUsd(totalFundsToClaimUsd)}</span>
      </div>

      {displayInsufficientGasAlert ? (
        <AlertInfoCard type="warning" hideClose>
          <Trans>Insufficient gas for network fees</Trans>
        </AlertInfoCard>
      ) : null}

      {buttonElement}
    </div>
  );
}
