import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "react-use";
import { usePublicClient } from "wagmi";

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
import { AccountType, useAccountType } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import LockIcon from "img/ic_lock.svg?react";

import { checkValidity, signMessage } from "./utils";

const MULTISIG_CHECK_INTERVAL = 5_000;

export default function ClaimableAmounts() {
  const { account, signer, walletClient } = useWallet();
  const { accountType, isSmartAccount } = useAccountType();
  const chainId = useSelector(selectChainId);
  const publicClient = usePublicClient();
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
  const [isContractOwnersSigned, setIsContractOwnersSigned] = useState(false);
  const [isStartedMultisig, setIsStartedMultisig] = useState(false);
  const [isSafeSigValid, setIsSafeSigValid] = useState(false);

  const claimableTokens = useMemo(() => {
    return Object.keys(claimableAmounts).filter(
      (token) => claimableAmounts[token]?.amount !== undefined && claimableAmounts[token]!.amount > 0n
    );
  }, [claimableAmounts]);

  const { data: executionFee } = useClaimExecutionFee({
    account,
    claimableTokens,
    chainId,
    isSmartAccount,
    isContractOwnersSigned,
    claimTermsAcceptedSignature,
    signer,
    distributionId: GLP_DISTRIBUTION_ID,
    claimTerms,
  });

  const onFinishMultisig = useCallback(
    (signature: string) => {
      setIsContractOwnersSigned(true);
      setClaimTermsAcceptedSignature(signature);
    },
    [setIsContractOwnersSigned, setClaimTermsAcceptedSignature]
  );

  const signClaimTerms = useCallback(async () => {
    if (!account || !claimTerms || !publicClient || !walletClient || !signer || accountType === null) {
      return;
    }

    signMessage({
      accountType,
      account,
      walletClient,
      chainId,
      publicClient,
      claimTerms,
      onFinishMultisig,
      setClaimTermsAcceptedSignature,
      setIsStartedMultisig,
      signer,
    });
  }, [
    account,
    signer,
    walletClient,
    publicClient,
    onFinishMultisig,
    setClaimTermsAcceptedSignature,
    claimTerms,
    chainId,
    accountType,
  ]);

  useEffect(() => {
    let intervalId: NodeJS.Timer | undefined;

    async function runCheckValidity() {
      try {
        if (
          accountType === null ||
          !isSmartAccount ||
          !account ||
          !publicClient ||
          !claimTerms ||
          !isContractOwnersSigned
        ) {
          setIsSafeSigValid(false);
          return;
        }

        const isValid = await checkValidity({
          chainId,
          account,
          publicClient,
          claimTerms,
          claimTermsAcceptedSignature,
        });

        setIsSafeSigValid(isValid);
        setIsContractOwnersSigned(isValid);
        setClaimTermsAcceptedSignature(isValid ? claimTermsAcceptedSignature || "0x" : "");
      } catch (e) {
        setIsSafeSigValid(false);
      }
    }

    runCheckValidity();
    if (accountType === AccountType.Safe && claimTermsAcceptedSignature) {
      intervalId = setInterval(runCheckValidity, MULTISIG_CHECK_INTERVAL);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [
    accountType,
    account,
    publicClient,
    claimTerms,
    claimTermsAcceptedSignature,
    chainId,
    isSmartAccount,
    isContractOwnersSigned,
    setClaimTermsAcceptedSignature,
  ]);

  const claimFundsTransactionCallback = useClaimFundsTransactionCallback({
    tokens: claimableTokens,
    claimableTokenTitles,
  });

  const claimAmounts = useCallback(async () => {
    if (claimTerms && !claimTermsAcceptedSignature) {
      return;
    }

    if (accountType === AccountType.Safe && !isSafeSigValid) {
      return;
    }

    if (!signer || !account) {
      return;
    }

    setIsClaiming(true);
    try {
      const signature =
        claimTermsAcceptedSignature && claimTermsAcceptedSignature !== "0x" ? claimTermsAcceptedSignature : undefined;

      await createClaimAmountsTransaction({
        tokens: claimableTokens,
        chainId,
        signer,
        account,
        signature,
        distributionId: GLP_DISTRIBUTION_ID,
        claimTerms,
        claimableTokenTitles,
        callback: claimFundsTransactionCallback,
      });
      mutateClaimableAmounts();
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
    accountType,
    isSafeSigValid,
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
      userNativeTokenBalance !== undefined &&
      executionFee !== undefined &&
      userNativeTokenBalance >= requiredExecutionFee;

    isButtonDisabled = !hasAvailableFundsToCoverExecutionFee;

    if (claimTerms) {
      if (accountType === AccountType.Safe) {
        isButtonDisabled = isButtonDisabled || !claimTermsAcceptedSignature || !isContractOwnersSigned;
      } else {
        isButtonDisabled = isButtonDisabled || !claimTermsAcceptedSignature;
      }
    }

    if (claimsFeatureDisabled || isClaiming || !claimableAmountsLoaded) {
      isButtonDisabled = true;
    }

    let buttonText = <Trans>Claim funds</Trans>;

    if (claimsFeatureDisabled) {
      buttonText = <Trans>Claims are disabled</Trans>;
    }

    if (isClaiming) {
      buttonText = <Trans>Claiming...</Trans>;
    }

    let buttonTooltipText: React.ReactNode | null = null;

    if (isSmartAccount && !isContractOwnersSigned) {
      buttonTooltipText = <Trans>Accept the claim terms to continue.</Trans>;
    }

    if (accountType === AccountType.Safe && isStartedMultisig && !isSafeSigValid) {
      buttonTooltipText = <Trans>Waiting for the remaining Safe confirmations.</Trans>;
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
    accountType,
    isSafeSigValid,
    isContractOwnersSigned,
    isStartedMultisig,
    totalFundsToClaimUsd,
  ]);

  /**
   * Display the accept claim terms if:
   * - The claim terms are set and the feature is not disabled
   * - The user is a smart account and the contract owners have not signed the claim terms
   * - The user is not a smart account and the claim terms have not been accepted
   */
  const displayAcceptClaimTerms =
    claimTerms && !claimsFeatureDisabled && (isSmartAccount ? !isContractOwnersSigned : !claimTermsAcceptedSignature);

  /**
   * Display the insufficient gas alert if:
   * - The user signed the claim terms
   * - The user does not have enough funds to cover the execution fee
   */
  const displayInsufficientGasAlert =
    (isSmartAccount ? isContractOwnersSigned : claimTermsAcceptedSignature) && !hasAvailableFundsToCoverExecutionFee;

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

  const [isExpanded, setIsExpanded] = useState(false);

  const onViewBreakdown = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, [setIsExpanded]);

  const hasClaimableAmounts = useMemo(() => {
    return (
      claimableAmountsLoaded &&
      Object.values(claimableAmounts).some((data) => data?.amount !== undefined && data?.amount !== 0n)
    );
  }, [claimableAmounts, claimableAmountsLoaded]);

  const glpReimbursement = (
    <div className="rounded-8 bg-fill-surfaceElevated50 lg:pl-12">
      <div className="flex items-center justify-between rounded-t-8 border-b-1/2 border-slate-600 p-12 lg:pl-0">
        <div className="flex items-center gap-4">
          {claimTerms && !claimTermsAcceptedSignature && <LockIcon className="size-16 text-slate-500" />}
          <span className="text-body-medium font-medium text-typography-primary">
            <Trans>GLP Reimbursement</Trans>
          </span>
        </div>

        {displayAcceptClaimTerms && (
          <span className="cursor-pointer text-13 font-medium text-blue-300" onClick={signClaimTerms}>
            <Trans>Accept claim terms</Trans>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-8 rounded-b-8 p-12 lg:pl-0">
        <div className="flex items-center justify-between">
          {hasClaimableAmounts ? (
            <div className="flex cursor-pointer items-center gap-4" onClick={onViewBreakdown}>
              <span className="text-body-small cursor-pointer select-none font-medium text-typography-secondary">
                {isExpanded ? <Trans>Hide breakdown</Trans> : <Trans>View breakdown</Trans>}
              </span>
              <ChevronDownIcon className={cx("size-14 text-typography-secondary", { "rotate-180": isExpanded })} />
            </div>
          ) : null}

          <span className="text-body-small text-typography-secondary">{formatUsd(totalFundsToClaimUsd)}</span>
        </div>

        {isExpanded
          ? Object.entries(claimableAmounts)
              .filter(([, data]) => data?.amount !== undefined && data?.amount !== 0n)
              .map(([token, data]) => (
                <div key={token}>
                  <div className="flex justify-between">
                    <div className="text-body-small font-medium text-typography-secondary">
                      {claimableTokenTitles[token]}
                    </div>
                    <div className="flex gap-2 text-12">
                      <span>{formatBalanceAmount(data?.amount ?? 0n, data?.decimals ?? 18)}</span>
                      <span className="text-body-small whitespace-nowrap text-typography-secondary">
                        ({formatUsd(data?.usd ?? 0n)})
                      </span>
                    </div>
                  </div>
                </div>
              ))
          : null}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-16">
      {glpReimbursement}

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
