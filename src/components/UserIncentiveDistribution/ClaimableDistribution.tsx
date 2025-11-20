import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "react-use";
import { usePublicClient } from "wagmi";

import { getClaimTermsAcceptedKey } from "config/localStorage";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  ClaimableAmountsData,
  DistributionConfiguration,
  GLP_DISTRIBUTION_ID,
} from "domain/synthetics/claims/useUserClaimableAmounts";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { AccountType, useAccountType } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";

import Checkbox from "components/Checkbox/Checkbox";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { checkValidity, getDistributionTitle, signMessage } from "./utils";

const MULTISIG_CHECK_INTERVAL = 5_000;

export function ClaimableDistribution({
  distributionId,
  claimableAmountsData,
  distributionConfiguration,
  selected,
  onToggle,
  onSignTerms,
}: {
  distributionId: string;
  claimableAmountsData: ClaimableAmountsData;
  distributionConfiguration?: DistributionConfiguration;
  selected: boolean;
  onToggle: (distributionId: string) => void;
  onSignTerms: (distributionId: string, signature: string) => void;
}) {
  const { claimTerms, claimsDisabled } = distributionConfiguration ?? {};
  const { account, signer, walletClient } = useWallet();
  const { accountType, isSmartAccount } = useAccountType();
  const chainId = useSelector(selectChainId);
  const publicClient = usePublicClient();

  const [claimTermsAcceptedSignature, setClaimTermsAcceptedSignature] = useLocalStorage(
    claimTerms ? getClaimTermsAcceptedKey(chainId, account, GLP_DISTRIBUTION_ID, claimTerms) : distributionId,
    ""
  );

  const [isContractOwnersSigned, setIsContractOwnersSigned] = useState(false);
  const [isStartedMultisig, setIsStartedMultisig] = useState(false);
  const [isSafeSigValid, setIsSafeSigValid] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timer | undefined;

    async function runCheckValidity() {
      try {
        if (!claimTerms || !publicClient || !account) {
          return;
        }

        if (!isSmartAccount && claimTermsAcceptedSignature) {
          onSignTerms(distributionId, claimTermsAcceptedSignature);
          return;
        }

        if (accountType === null || !isSmartAccount || !isContractOwnersSigned) {
          setIsSafeSigValid(false);
          return;
        }

        const isValid = await checkValidity({
          chainId,
          account,
          publicClient,
          claimTerms,
          claimTermsAcceptedSignature,
          distributionId,
        });

        setIsSafeSigValid(isValid);
        setIsContractOwnersSigned(isValid);
        onSignTerms(distributionId, isValid ? claimTermsAcceptedSignature || "0x" : "");
      } catch (e) {
        setIsSafeSigValid(false);
        onSignTerms(distributionId, "");
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
    onSignTerms,
    distributionId,
  ]);

  const onViewBreakdown = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, [setIsExpanded]);

  const onFinishMultisig = useCallback(
    (signature: string) => {
      setIsContractOwnersSigned(true);
      setClaimTermsAcceptedSignature(signature);
      onSignTerms(distributionId, signature);
    },
    [setIsContractOwnersSigned, setClaimTermsAcceptedSignature, onSignTerms, distributionId]
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
      distributionId,
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
    distributionId,
  ]);

  /**
   * Display the accept claim terms if:
   * - The claim terms are set and the feature is not disabled
   * - The user is a smart account and the contract owners have not signed the claim terms
   * - The user is not a smart account and the claim terms have not been accepted
   */
  const displayAcceptClaimTerms =
    claimTerms && !claimsDisabled && (isSmartAccount ? !isContractOwnersSigned : !claimTermsAcceptedSignature);

  const checkBox = useMemo(() => {
    const component = (
      <Checkbox
        disabled={Boolean(displayAcceptClaimTerms)}
        isChecked={selected}
        setIsChecked={() => onToggle(distributionId)}
        className="mr-2"
      />
    );

    let text = <Trans>Accept the claim terms to continue.</Trans>;

    if (isSmartAccount && !isContractOwnersSigned) {
      text = <Trans>Accept the claim terms to continue.</Trans>;
    }

    if (accountType === AccountType.Safe && isStartedMultisig && !isSafeSigValid) {
      text = <Trans>Waiting for the remaining Safe confirmations.</Trans>;
    }

    if (displayAcceptClaimTerms) {
      return (
        <TooltipWithPortal content={text} variant="none" handleClassName="w-full" contentClassName="w-full">
          <div className="relative top-2">{component}</div>
        </TooltipWithPortal>
      );
    }

    return component;
  }, [
    displayAcceptClaimTerms,
    selected,
    onToggle,
    distributionId,
    isSmartAccount,
    isContractOwnersSigned,
    isStartedMultisig,
    accountType,
    isSafeSigValid,
  ]);

  if (claimsDisabled || claimableAmountsData.amounts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-8 bg-fill-surfaceElevated50 lg:pl-12">
      <div className="flex items-center justify-between rounded-t-8 border-b-1/2 border-slate-600 p-12 lg:pl-0">
        <div className="space-between flex items-center gap-4">
          {checkBox}
          <span className="text-body-medium font-medium text-typography-primary">
            {getDistributionTitle(distributionId)}
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
          <div className="flex cursor-pointer items-center gap-4" onClick={onViewBreakdown}>
            <span className="text-body-small cursor-pointer select-none font-medium text-typography-secondary">
              {isExpanded ? <Trans>Hide breakdown</Trans> : <Trans>View breakdown</Trans>}
            </span>
            <ChevronDownIcon className={cx("size-14 text-typography-secondary", { "rotate-180": isExpanded })} />
          </div>

          <span className="text-body-small text-typography-secondary">{formatUsd(claimableAmountsData.totalUsd)}</span>
        </div>

        {isExpanded
          ? Object.entries(claimableAmountsData.amounts)
              .filter(([, data]) => data?.amount !== undefined && data?.amount !== 0n)
              .map(([token, data]) => (
                <div key={token}>
                  <div className="flex justify-between">
                    <div className="text-body-small font-medium text-typography-secondary">{data.title}</div>
                    <div className="flex gap-2 text-12">
                      <span>{formatBalanceAmount(data.amount, data.token.decimals)}</span>
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
}
