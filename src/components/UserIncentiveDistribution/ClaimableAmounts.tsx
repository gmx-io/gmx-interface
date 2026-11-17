import { Trans, msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useCallback, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import { GLP_REIMBURSEMENT_TERMS_URL } from "config/links";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GLP_DISTRIBUTION_ID } from "domain/synthetics/claims/constants";
import { createClaimAmountsTransaction } from "domain/synthetics/claims/createClaimTransaction";
import { useClaimExecutionFee } from "domain/synthetics/claims/useClaimExecutionFee";
import { useClaimFundsTransactionCallback } from "domain/synthetics/claims/useClaimFundsTransactionCallback";
import useUserClaimableAmounts from "domain/synthetics/claims/useUserClaimableAmounts";
import { estimateExecutionGasPrice, getExecutionFeeBufferBps } from "domain/synthetics/fees/utils/executionFee";
import { useTokenBalances } from "domain/synthetics/tokens";
import { formatBalanceAmount } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { UsdValue } from "components/NumericValue/UsdValue";
import TokenIcon from "components/TokenIcon/TokenIcon";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipRow, TooltipRows } from "components/Tooltip/TooltipBlocks";

import EarnIcon from "img/ic_earn.svg?react";

import { ClaimableDistribution } from "./ClaimableDistribution";

export default function ClaimableAmounts() {
  const { account, signer } = useWallet();
  const chainId = useSelector(selectChainId);
  const { claimsConfigByDistributionId, claimableAmountsDataByDistributionId, isLoading, onClaimed } =
    useUserClaimableAmounts(chainId, account);
  const settings = useSettings();
  const hasOutdatedUi = useHasOutdatedUi();

  const [isClaiming, setIsClaiming] = useState(false);
  const [selectedDistributionIds, setSelectedDistributionIds] = useState<string[]>([]);

  const toggleDistributionId = useCallback((distributionId: string) => {
    setSelectedDistributionIds((prev) => {
      if (prev.includes(distributionId)) {
        return prev.filter((id) => id !== distributionId);
      }
      return [...prev, distributionId];
    });
  }, []);

  const claimableEntries = useMemo(
    () =>
      Object.entries(claimableAmountsDataByDistributionId ?? {}).filter(
        ([distributionId]) => !claimsConfigByDistributionId?.[distributionId]?.claimsDisabled
      ),
    [claimableAmountsDataByDistributionId, claimsConfigByDistributionId]
  );

  const selectedClaimableDistributionIds = useMemo(
    () => selectedDistributionIds.filter((distributionId) => claimableEntries.some(([id]) => id === distributionId)),
    [selectedDistributionIds, claimableEntries]
  );

  const { data: executionFee } = useClaimExecutionFee({
    selectedDistributionIds: selectedClaimableDistributionIds,
    claimableAmountsDataByDistributionId,
    claimsConfigByDistributionId,
    signatures: {},
    chainId,
    signer,
    account,
  });

  const onClaimSuccess = useCallback(() => {
    onClaimed(selectedClaimableDistributionIds);
    setSelectedDistributionIds([]);
  }, [onClaimed, selectedClaimableDistributionIds]);

  const claimFundsTransactionCallback = useClaimFundsTransactionCallback({
    selectedDistributionIds: selectedClaimableDistributionIds,
    onSuccess: onClaimSuccess,
  });

  const claimAmounts = useCallback(async () => {
    if (!signer || !account || !claimableAmountsDataByDistributionId || !claimsConfigByDistributionId) {
      return;
    }

    setIsClaiming(true);
    try {
      await createClaimAmountsTransaction({
        selectedDistributionIds: selectedClaimableDistributionIds,
        claimableAmountsDataByDistributionId,
        claimsConfigByDistributionId,
        signatures: {},
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
    claimsConfigByDistributionId,
    selectedClaimableDistributionIds,
  ]);

  const { balancesData } = useTokenBalances(chainId);
  const userNativeTokenBalance = getByKey(balancesData, NATIVE_TOKEN_ADDRESS);

  const totalFundsToClaimUsd = useMemo(() => {
    return selectedClaimableDistributionIds.reduce((acc, curr) => {
      acc += claimableAmountsDataByDistributionId?.[curr]?.totalUsd ?? 0n;
      return acc;
    }, 0n);
  }, [selectedClaimableDistributionIds, claimableAmountsDataByDistributionId]);

  const renderTotalTooltipContent = useCallback(() => {
    if (!claimableAmountsDataByDistributionId) {
      return null;
    }

    const allAmounts: Array<{ symbol: string; amount: bigint; decimals: number }> = [];
    selectedClaimableDistributionIds.forEach((distributionId) => {
      const data = claimableAmountsDataByDistributionId[distributionId];
      if (data) {
        data.amounts.forEach((amount) => {
          allAmounts.push({
            symbol: amount.token.symbol,
            amount: amount.amount,
            decimals: amount.token.decimals,
          });
        });
      }
    });

    return (
      <TooltipRows>
        {allAmounts.map((tokenInfo, index) => (
          <TooltipRow
            key={`${tokenInfo.symbol}-${index}`}
            label={
              tokenInfo.symbol ? (
                <div className="flex items-center gap-4">
                  <TokenIcon symbol={tokenInfo.symbol} displaySize={16} />
                  <span>{tokenInfo.symbol}</span>
                </div>
              ) : (
                t`Unknown`
              )
            }
            value={formatBalanceAmount(tokenInfo.amount, tokenInfo.decimals)}
          />
        ))}
      </TooltipRows>
    );
  }, [selectedClaimableDistributionIds, claimableAmountsDataByDistributionId]);

  const hasGlpReimbursementSelected = useMemo(() => {
    return selectedClaimableDistributionIds.includes(GLP_DISTRIBUTION_ID.toString());
  }, [selectedClaimableDistributionIds]);

  const { _ } = useLingui();
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

    let buttonText: React.ReactNode = <Trans>Claim funds</Trans>;

    if (hasOutdatedUi) {
      buttonText = getPageOutdatedError();
      isButtonDisabled = true;
    } else if (isClaiming) {
      buttonText = <Trans>Claiming...</Trans>;
    }

    let buttonTooltipText: React.ReactNode | null = null;

    if (selectedClaimableDistributionIds.length === 0) {
      buttonTooltipText = _(msg`Select at least one distribution to claim`);
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
    _,
    chainId,
    settings.executionFeeBufferBps,
    userNativeTokenBalance,
    executionFee,
    hasOutdatedUi,
    isClaiming,
    selectedClaimableDistributionIds,
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
    <StandardTooltip
      content={buttonTooltipText}
      variant="none"
      isHandlerDisabled={isButtonDisabled}
      handleClassName="w-full"
      contentClassName="w-full"
    >
      {buttonContent}
    </StandardTooltip>
  ) : (
    buttonContent
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
        <span className="text-body-medium font-medium text-typography-secondary">
          <Trans>No distributions to claim</Trans>
        </span>
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
          />
        ))}

      <div className="flex items-center justify-between">
        <span className="text-body-medium font-medium text-typography-secondary">
          <Trans>Total to claim</Trans>
        </span>
        <StandardTooltip
          handle={<UsdValue usd={totalFundsToClaimUsd} />}
          handleClassName="numbers"
          className="whitespace-nowrap"
          renderContent={renderTotalTooltipContent}
        />
      </div>

      {displayInsufficientGasAlert ? (
        <AlertInfoCard type="error" hideClose>
          <Trans>Insufficient gas for network fees</Trans>
        </AlertInfoCard>
      ) : null}

      {buttonElement}

      {hasGlpReimbursementSelected && (
        <div className="text-center font-medium text-typography-secondary">
          <Trans>
            By claiming, you agree to the{" "}
            <ExternalLink href={GLP_REIMBURSEMENT_TERMS_URL} variant="underline" className="font-medium text-blue-300">
              GLP Reimbursement
            </ExternalLink>{" "}
            terms
          </Trans>
        </div>
      )}
    </div>
  );
}
