import { Trans } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useLocalStorage } from "react-use";

import { getContract } from "config/contracts";
import { getClaimTermsAcceptedKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { createClaimAmountsTransaction } from "domain/synthetics/claims/createClaimTransaction";
import { useClaimExecutionFee } from "domain/synthetics/claims/useClaimExecutionFee";
import { useClaimFundsTransactionCallback } from "domain/synthetics/claims/useClaimFundsTransactionCallback";
import useUserClaimableAmounts, { GLP_DISTRIBUTION_ID } from "domain/synthetics/claims/useUserClaimableAmounts";
import { estimateExecutionGasPrice, getExecutionFeeBufferBps } from "domain/synthetics/fees/utils/executionFee";
import { useTokenBalances } from "domain/synthetics/tokens";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useIsSafeAccount } from "lib/wallets/useIsSmartAccount";
import useWallet from "lib/wallets/useWallet";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export default function ClaimableAmounts() {
  const { account, signer } = useWallet();
  const isSmartAccount = useIsSafeAccount();
  const chainId = useSelector(selectChainId);
  const {
    claimTerms,
    totalFundsToClaimUsd,
    claimableAmounts,
    claimableTokenTitles,
    claimsDisabled: claimsFeatureDisabled,
    claimableAmountsLoaded,
    mutateClaimableAmounts,
  } = useUserClaimableAmounts(chainId, account);
  const settings = useSettings();
  const [isClaiming, setIsClaiming] = useState(false);

  const [claimTermsAcceptedSignature, setClaimTermsAcceptedSignature] = useLocalStorage(
    getClaimTermsAcceptedKey(chainId, account, GLP_DISTRIBUTION_ID, claimTerms),
    ""
  );

  const claimableTokens = useMemo(() => {
    return Object.keys(claimableAmounts).filter(
      (token) => claimableAmounts[token]?.amount !== undefined && claimableAmounts[token]!.amount > 0n
    );
  }, [claimableAmounts]);

  const { data: executionFee } = useClaimExecutionFee({
    account,
    claimableTokens,
    chainId,
    claimTermsAcceptedSignature,
    signer,
    distributionId: GLP_DISTRIBUTION_ID,
  });

  const signClaimTerms = useCallback(async () => {
    const message = `${claimTerms}\ndistributionId ${GLP_DISTRIBUTION_ID}\ncontract ${getContract(chainId, "ClaimHandler").toLowerCase()}\nchainId ${chainId}`;
    const signature = await signer?.signMessage(message);

    if (signature) {
      setClaimTermsAcceptedSignature(signature);
    }
  }, [setClaimTermsAcceptedSignature, signer, claimTerms, chainId]);

  const claimFundsTransactionCallback = useClaimFundsTransactionCallback({
    tokens: claimableTokens,
    chainId,
    claimableTokenTitles,
  });

  const claimAmounts = useCallback(async () => {
    if (claimTerms && !claimTermsAcceptedSignature) {
      return;
    }

    if (!signer || !account) {
      return;
    }

    setIsClaiming(true);
    try {
      await createClaimAmountsTransaction({
        tokens: claimableTokens,
        chainId,
        signer,
        account,
        signature: claimTermsAcceptedSignature ?? "",
        distributionId: GLP_DISTRIBUTION_ID,
        claimableTokenTitles,
        callback: claimFundsTransactionCallback,
      });
      mutateClaimableAmounts(true);
      setClaimTermsAcceptedSignature("");
    } finally {
      setIsClaiming(false);
    }
  }, [
    claimTermsAcceptedSignature,
    signer,
    account,
    claimableTokens,
    chainId,
    claimableTokenTitles,
    setClaimTermsAcceptedSignature,
    mutateClaimableAmounts,
    claimTerms,
    claimFundsTransactionCallback,
  ]);

  const { balancesData } = useTokenBalances(chainId);
  const userNativeTokenBalance = getByKey(balancesData, NATIVE_TOKEN_ADDRESS);

  const { isButtonDisabled, buttonText, buttonTooltipText, hasAvailableFundsToCoverExecutionFee } = useMemo(() => {
    let isButtonDisabled = false;

    const requiredExecutionFee = estimateExecutionGasPrice({
      rawGasPrice: executionFee,
      maxPriorityFeePerGas: 0n,
      bufferBps: getExecutionFeeBufferBps(chainId, settings.executionFeeBufferBps),
      premium: 0n,
    });

    const hasAvailableFundsToCoverExecutionFee =
      userNativeTokenBalance !== undefined && userNativeTokenBalance >= requiredExecutionFee;

    if (claimTerms) {
      isButtonDisabled = !claimTermsAcceptedSignature || !hasAvailableFundsToCoverExecutionFee;
    } else {
      isButtonDisabled = !hasAvailableFundsToCoverExecutionFee;
    }

    if (claimsFeatureDisabled || isClaiming || !claimableAmountsLoaded || isSmartAccount) {
      isButtonDisabled = true;
    }

    let buttonText = <Trans>Claim funds</Trans>;

    if (isSmartAccount || claimsFeatureDisabled) {
      buttonText = <Trans>Claims are disabled</Trans>;
    }

    if (isClaiming) {
      buttonText = <Trans>Claiming...</Trans>;
    }

    let buttonTooltipText: React.ReactNode | null = null;

    if (isSmartAccount) {
      buttonTooltipText = (
        <Trans>
          Claiming with a smart account requires specific instructions. Contributors will post these in the coming days.
        </Trans>
      );
    }

    return {
      isButtonDisabled,
      buttonText,
      buttonTooltipText,
      hasAvailableFundsToCoverExecutionFee,
    };
  }, [
    claimTerms,
    claimTermsAcceptedSignature,
    chainId,
    settings.executionFeeBufferBps,
    claimableAmountsLoaded,
    userNativeTokenBalance,
    claimsFeatureDisabled,
    isClaiming,
    isSmartAccount,
    executionFee,
  ]);

  const controls = useMemo(() => {
    if (totalFundsToClaimUsd === 0n) {
      return (
        <Button variant="secondary" disabled>
          <Trans>No funds to claim</Trans>
        </Button>
      );
    }

    const buttonContent = (
      <Button variant="primary" className="!py-10" disabled={isButtonDisabled} onClick={claimAmounts}>
        {buttonText}
      </Button>
    );

    const buttonElement = buttonTooltipText ? (
      <TooltipWithPortal content={buttonTooltipText}>{buttonContent}</TooltipWithPortal>
    ) : (
      buttonContent
    );

    return (
      <>
        {!hasAvailableFundsToCoverExecutionFee ? (
          <AlertInfoCard type="warning">
            <Trans>Insufficient gas for network fees</Trans>
          </AlertInfoCard>
        ) : null}
        {claimTerms && hasAvailableFundsToCoverExecutionFee && !claimsFeatureDisabled ? (
          <Checkbox
            isChecked={Boolean(claimTermsAcceptedSignature)}
            setIsChecked={signClaimTerms}
            disabled={Boolean(claimTermsAcceptedSignature)}
          >
            <span className="muted">
              <Trans>Accept Claim Terms</Trans>
            </span>
          </Checkbox>
        ) : null}
        {buttonElement}
      </>
    );
  }, [
    totalFundsToClaimUsd,
    claimTermsAcceptedSignature,
    signClaimTerms,
    claimTerms,
    claimAmounts,
    claimsFeatureDisabled,
    buttonText,
    buttonTooltipText,
    hasAvailableFundsToCoverExecutionFee,
    isButtonDisabled,
  ]);

  return (
    <div className="flex flex-row gap-20 p-18">
      <div className="flex flex-row items-center justify-between gap-20">
        {claimableAmountsLoaded ? (
          Object.entries(claimableAmounts)
            .filter(([, data]) => data?.amount !== undefined && data?.amount !== 0n)
            .map(([token, data]) => (
              <div key={token}>
                <div className="flex flex-col gap-5">
                  <div className="text-sm text-nowrap text-slate-100">{claimableTokenTitles[token]}</div>
                  <div className="flex flex-col gap-2">
                    <span>{formatBalanceAmount(data?.amount ?? 0n, data?.decimals ?? 18)}</span>
                    <span className="text-body-small whitespace-nowrap text-slate-100">
                      ({formatUsd(data?.usd ?? 0n)})
                    </span>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <Skeleton width={300} height={32} baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" />
        )}
      </div>
      <div className="flex flex-grow flex-row items-center justify-end gap-20">{controls}</div>
    </div>
  );
}
