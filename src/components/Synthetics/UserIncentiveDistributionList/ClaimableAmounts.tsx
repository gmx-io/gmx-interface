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
import { useAccountType, AccountType } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

//
// Safe and ERC-4337 message signing support is implemented below in signClaimTerms.
//

export default function ClaimableAmounts() {
  const { account, signer, walletClient } = useWallet();
  const accountType = useAccountType();
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

  const isSmartAccount = accountType !== AccountType.EOA && accountType !== AccountType.PostEip7702EOA;

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
    if (!account || !claimTerms) {
      return;
    }

    debugger;

    const message = `${claimTerms}\ndistributionId ${GLP_DISTRIBUTION_ID}\ncontract ${getContract(chainId, "ClaimHandler").toLowerCase()}\nchainId ${chainId}`;
    // Safe accounts: delegate signing to the Safe-aware wallet provider (Rabby/MMI/Safe Wallet)
    if (accountType === AccountType.Safe) {
      try {
        if (!walletClient) throw new Error("Missing wallet client for Safe signing");
        const signature = (await walletClient.signMessage({ account: account as `0x${string}`, message })) as string;
        if (!signature || !signature.startsWith("0x")) throw new Error("Invalid Safe signature format");
        setClaimTermsAcceptedSignature(signature);
        return;
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error("Safe signing failed:", error);
        throw new Error(
          `Unable to sign with Safe via provider. Ensure your wallet supports Safe multisig signing. Error: ${error?.message ?? error}`
        );
      }
    }

    // ERC-4337 smart accounts: sign with the connected wallet client/account
    if (accountType === AccountType.SmartAccount) {
      try {
        let signature: string | undefined;
        if (walletClient && account) {
          signature = (await walletClient.signMessage({ account: account as `0x${string}`, message })) as string;
        } else if (signer) {
          signature = await signer.signMessage(message);
        }

        if (signature && signature.startsWith("0x")) {
          setClaimTermsAcceptedSignature(signature);
        }
        return;
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error("Smart account signing failed:", error);
        throw new Error(`Unable to sign message with smart account. Error: ${error?.message ?? error}`);
      }
    }

    // EOAs (including post-EIP-7702 undelegated): standard signMessage
    try {
      const signature = await signer?.signMessage(message);
      if (signature && signature.startsWith("0x")) {
        setClaimTermsAcceptedSignature(signature);
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("EOA signing failed:", error);
      throw new Error(`Unable to sign message. Error: ${error?.message ?? error}`);
    }
  }, [account, accountType, chainId, claimTerms, setClaimTermsAcceptedSignature, signer, walletClient]);

  const claimFundsTransactionCallback = useClaimFundsTransactionCallback({
    tokens: claimableTokens,
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
        signature: claimTermsAcceptedSignature,
        distributionId: GLP_DISTRIBUTION_ID,
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

    isButtonDisabled = !hasAvailableFundsToCoverExecutionFee;

    if (claimTerms) {
      isButtonDisabled = isButtonDisabled || !claimTermsAcceptedSignature;
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

    if (isSmartAccount && !claimTermsAcceptedSignature) {
      buttonTooltipText = <Trans>Please accept the Claim Terms above to continue.</Trans>;
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
                  <div className="text-body-small text-nowrap text-typography-secondary">
                    {claimableTokenTitles[token]}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span>{formatBalanceAmount(data?.amount ?? 0n, data?.decimals ?? 18)}</span>
                    <span className="text-body-small whitespace-nowrap text-typography-secondary">
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
