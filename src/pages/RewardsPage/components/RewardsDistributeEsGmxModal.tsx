import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { isAddress, zeroAddress } from "viem";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { getContract } from "config/contracts";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  getEsGmxDistributionError,
  getEsGmxIssuerFunding,
  getUnusedEsGmxDistributionBatchIndex,
} from "domain/vesting/esGmxDistribution";
import { useChainId } from "lib/chains";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { GMX_DECIMALS } from "lib/legacy";
import { formatAmountFree, parseUint256DecimalString, parseValue } from "lib/numbers";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import NumberInput from "components/NumberInput/NumberInput";
import { ButtonTooltipWrapper } from "components/Tooltip/ButtonTooltipWrapper";

import { RewardsVestingChainGuard } from "./RewardsVestingChainGuard";

type Props = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  onDistributed: () => Promise<unknown>;
};

export function RewardsDistributeEsGmxModal({ isVisible, setIsVisible, onDistributed }: Props) {
  const { chainId } = useChainId();
  const { account, active, signer, chainId: walletChainId, connector } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const chainError = useMultipleWalletExtensionsChainError();
  const { availability } = useIncentivesV2State();
  const config = availability.status === "active" ? availability.config : undefined;
  const previousEpoch = config ? config.epochTimestamp - config.epochDuration : undefined;
  const defaultEpochValue =
    config && config.epochDuration > 0 && previousEpoch !== undefined && previousEpoch >= config.programStartTimestamp
      ? String(previousEpoch)
      : undefined;
  const [value, setValue] = useState("100");
  const [recipient, setRecipient] = useState(account ?? "");
  const [epochValue, setEpochValue] = useState<string>();
  const [batchValue, setBatchValue] = useState<string>();
  const [pendingAction, setPendingAction] = useState<"distribute" | "fund">();
  const isDistributing = pendingAction === "distribute";
  const isFunding = pendingAction === "fund";
  const isPending = pendingAction !== undefined;
  const pendingRef = useRef(false);
  const sessionRef = useRef(0);
  const amount = parseValue(value, GMX_DECIMALS);
  const {
    data: funding,
    error: fundingError,
    isValidating: isCheckingFunding,
    mutate: mutateFunding,
  } = useSWR(
    isVisible && active && account && chainId === ARBITRUM_SEPOLIA && amount !== undefined && amount > 0n
      ? ["esGmxIssuerFunding", chainId, account, amount.toString()]
      : null,
    () => getEsGmxIssuerFunding(account as `0x${string}`, amount!),
    { revalidateOnFocus: false, revalidateOnMount: true, dedupingInterval: 0, shouldRetryOnError: false }
  );
  const fundingAmount = formatAmountFree(funding?.shortfall ?? 0n, GMX_DECIMALS, GMX_DECIMALS);
  const hasInsufficientFundingBalance = funding !== undefined && funding.walletBalance < funding.shortfall;
  const epochId = parseUint256DecimalString(epochValue ?? "");
  const batchKey =
    isVisible && chainId === ARBITRUM_SEPOLIA && epochId !== undefined && batchValue === undefined
      ? ["unusedEsGmxDistributionBatchIndex", chainId, epochId.toString()]
      : null;
  const {
    data: defaultBatchIndex,
    error: batchError,
    isValidating: isCheckingBatch,
  } = useSWR(batchKey, () => getUnusedEsGmxDistributionBatchIndex(epochId!), {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    dedupingInterval: 0,
    shouldRetryOnError: false,
  });
  const batchInputValue = batchValue ?? defaultBatchIndex?.toString() ?? "";
  const batchIndex = parseUint256DecimalString(batchInputValue);
  const isLoadingBatch = batchKey !== null && !batchError && (defaultBatchIndex === undefined || isCheckingBatch);
  const inputError =
    !isAddress(recipient) || recipient === zeroAddress
      ? t`Invalid recipient address`
      : epochId === undefined || batchIndex === undefined
        ? t`Enter valid epoch and batch IDs`
        : amount === undefined || amount <= 0n
          ? t`Enter an amount`
          : undefined;

  useEffect(() => {
    sessionRef.current += 1;
    pendingRef.current = false;
    setPendingAction(undefined);
    return () => {
      sessionRef.current += 1;
    };
  }, [
    account,
    active,
    chainId,
    connector?.uid,
    isVisible,
    signer,
    walletChainId,
    hasOutdatedUi,
    chainError.buttonErrorMessage,
  ]);

  useEffect(() => {
    setValue("100");
    setRecipient(account ?? "");
    setEpochValue(undefined);
    setBatchValue(undefined);
  }, [account, isVisible]);

  useEffect(() => {
    if (isVisible) setEpochValue((current) => current ?? defaultEpochValue);
  }, [account, defaultEpochValue, isVisible]);

  const handleFundIssuer = async () => {
    if (
      !isVisible ||
      chainId !== ARBITRUM_SEPOLIA ||
      walletChainId !== ARBITRUM_SEPOLIA ||
      !active ||
      !account ||
      !signer ||
      amount === undefined ||
      amount <= 0n ||
      !funding ||
      funding.shortfall <= 0n ||
      hasInsufficientFundingBalance ||
      fundingError ||
      isCheckingFunding ||
      pendingRef.current ||
      hasOutdatedUi ||
      chainError.buttonErrorMessage
    )
      return;

    const session = ++sessionRef.current;
    pendingRef.current = true;
    setPendingAction("fund");
    try {
      let currentFunding;
      try {
        currentFunding = await getEsGmxIssuerFunding(account as `0x${string}`, amount);
      } catch {
        if (sessionRef.current === session)
          helperToast.error(t`Unable to check distribution details. Please try again.`);
        return;
      }
      if (sessionRef.current !== session) return;
      if (currentFunding.shortfall !== funding.shortfall) {
        void mutateFunding(currentFunding, false);
        helperToast.info(t`Issuer funding changed. Review the amount and try again.`);
        return;
      }
      if (currentFunding.walletBalance < currentFunding.shortfall) {
        void mutateFunding(currentFunding, false);
        helperToast.error(t`Insufficient balance`);
        return;
      }
      const token = new ethers.Contract(getContract(ARBITRUM_SEPOLIA, "IncentiveEsGmx"), abis.Token, signer);
      const transaction = await callContract(
        ARBITRUM_SEPOLIA,
        token,
        "transfer",
        [getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer"), currentFunding.shortfall],
        {
          sentMsg: t`Transfer submitted`,
          failMsg: t`Transfer failed`,
          successMsg: t`Transfer completed`,
          setPendingTxns,
        }
      );
      if (!transaction || sessionRef.current !== session) return;
      await transaction.wait();
      if (sessionRef.current !== session) return;
      try {
        await mutateFunding();
      } catch {
        if (sessionRef.current === session) helperToast.info(t`Balances will refresh shortly.`);
      }
    } catch {
      // Transaction errors are reported by callContract and the pending transaction watcher.
    } finally {
      if (sessionRef.current === session) {
        pendingRef.current = false;
        setPendingAction(undefined);
      }
    }
  };

  const handleDistribute = async () => {
    if (
      !isVisible ||
      chainId !== ARBITRUM_SEPOLIA ||
      walletChainId !== ARBITRUM_SEPOLIA ||
      !account ||
      !active ||
      !signer ||
      inputError ||
      isLoadingBatch ||
      (batchValue === undefined && batchError) ||
      !isAddress(recipient) ||
      epochId === undefined ||
      batchIndex === undefined ||
      amount === undefined ||
      pendingRef.current ||
      hasOutdatedUi ||
      chainError.buttonErrorMessage
    ) {
      return;
    }

    const session = ++sessionRef.current;
    pendingRef.current = true;
    setPendingAction("distribute");
    try {
      let distributionError;
      try {
        distributionError = await getEsGmxDistributionError({
          sender: account as `0x${string}`,
          recipient,
          epochId,
          batchIndex,
          amount,
        });
      } catch {
        if (sessionRef.current === session)
          helperToast.error(t`Unable to check distribution details. Please try again.`);
        return;
      }
      if (sessionRef.current !== session) return;
      if (distributionError) {
        const messages = {
          unauthorized: t`This wallet cannot distribute rewards.`,
          finalized: t`This epoch is finalized.`,
          usedIndex: t`This batch index has already been used.`,
          usedContent: t`These rewards have already been distributed in this epoch.`,
        };
        if (distributionError.reason === "funding") {
          void mutateFunding().catch(() => undefined);
          const shortfall = formatAmountFree(distributionError.shortfall, GMX_DECIMALS, GMX_DECIMALS);
          helperToast.error(t`Fund the issuer with ${shortfall} more esGMX before distributing.`);
        } else {
          helperToast.error(messages[distributionError.reason]);
        }
        return;
      }
      const issuer = new ethers.Contract(getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer"), abis.EsGmxIssuer, signer);
      const transaction = await callContract(
        ARBITRUM_SEPOLIA,
        issuer,
        "distributeEpoch",
        [epochId, batchIndex, [recipient], [amount]],
        {
          sentMsg: t`Rewards distribution submitted`,
          failMsg: t`Rewards distribution failed`,
          successMsg: t`Rewards distributed`,
          setPendingTxns,
        }
      );
      if (!transaction || sessionRef.current !== session) return;
      await transaction.wait();
      if (sessionRef.current !== session) return;
      try {
        await onDistributed();
      } catch {
        if (sessionRef.current === session) helperToast.info(t`Balances will refresh shortly.`);
      }
      if (sessionRef.current === session) setIsVisible(false);
    } catch {
      // Transaction errors are reported by callContract and the pending transaction watcher.
    } finally {
      if (sessionRef.current === session) {
        pendingRef.current = false;
        setPendingAction(undefined);
      }
    }
  };

  const primaryText = hasOutdatedUi
    ? getPageOutdatedError()
    : chainError.buttonErrorMessage ??
      (isDistributing
        ? t`Confirming...`
        : isLoadingBatch
          ? t`Loading...`
          : batchValue === undefined && batchError
            ? t`Unable to check distribution details. Please try again.`
            : inputError ?? t`Distribute esGMX`);

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={(visible) => {
        if (!pendingRef.current) setIsVisible(visible);
      }}
      label={t`Distribute esGMX`}
      contentClassName="w-[420px]"
      withMobileBottomPosition
      qa="rewards-distribute-esgmx-modal"
    >
      <div className="flex flex-col gap-16">
        <p className="text-13 text-typography-secondary">
          <Trans>Issue esGMX rewards to a recipient, increasing their claimable rewards and vesting limit.</Trans>
        </p>
        <div className="grid grid-cols-2 gap-12">
          <div className="flex min-w-0 flex-col gap-8">
            <label htmlFor="rewards-distribution-epoch" className="text-13 text-typography-secondary">
              <Trans>Epoch ID</Trans>
            </label>
            <NumberInput
              inputId="rewards-distribution-epoch"
              value={epochValue ?? ""}
              onValueChange={(event) => {
                setEpochValue(event.target.value);
                setBatchValue(undefined);
              }}
              maxDecimals={0}
              isDisabled={isPending}
              placeholder="0"
              className="h-40 min-w-0 rounded-8 bg-fill-surfaceElevated50 px-12 text-14 outline-none"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-8">
            <label htmlFor="rewards-distribution-batch" className="text-13 text-typography-secondary">
              <Trans>Batch index</Trans>
            </label>
            <NumberInput
              inputId="rewards-distribution-batch"
              value={batchInputValue}
              onValueChange={(event) => setBatchValue(event.target.value)}
              maxDecimals={0}
              isDisabled={isPending}
              placeholder="0"
              className="h-40 min-w-0 rounded-8 bg-fill-surfaceElevated50 px-12 text-14 outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col gap-8">
          <label htmlFor="rewards-distribution-recipient" className="text-13 text-typography-secondary">
            <Trans>Recipient address</Trans>
          </label>
          <input
            id="rewards-distribution-recipient"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value.trim())}
            disabled={isPending}
            placeholder="0x..."
            autoComplete="off"
            spellCheck={false}
            className="h-40 min-w-0 rounded-8 bg-fill-surfaceElevated50 px-12 text-14 text-typography-primary outline-none"
          />
        </div>
        <div className="flex flex-col gap-8">
          <label htmlFor="rewards-distribute-esgmx-amount" className="text-13 text-typography-secondary">
            <Trans>Amount</Trans>
          </label>
          <div className="flex h-48 items-center gap-8 rounded-8 bg-fill-surfaceElevated50 px-12">
            <NumberInput
              inputId="rewards-distribute-esgmx-amount"
              value={value}
              onValueChange={(event) => setValue(event.target.value)}
              maxDecimals={GMX_DECIMALS}
              isDisabled={isPending}
              placeholder="0"
              className="bg-transparent min-w-0 grow text-16 outline-none"
            />
            <span className="text-14">esGMX</span>
          </div>
        </div>
        {!active || !account ? (
          <Button variant="primary-action" className="w-full" onClick={openConnectModal}>
            <Trans>Connect wallet</Trans>
          </Button>
        ) : (
          <RewardsVestingChainGuard chainId={ARBITRUM_SEPOLIA}>
            {funding && funding.shortfall > 0n ? (
              <ButtonTooltipWrapper
                content={
                  chainError.buttonTooltipMessage ??
                  (hasInsufficientFundingBalance ? t`Insufficient balance` : undefined)
                }
              >
                <Button
                  variant="secondary"
                  size="small"
                  className="w-full"
                  onClick={handleFundIssuer}
                  disabled={
                    isPending ||
                    isCheckingFunding ||
                    Boolean(fundingError) ||
                    hasInsufficientFundingBalance ||
                    !signer ||
                    chainId !== ARBITRUM_SEPOLIA ||
                    hasOutdatedUi ||
                    Boolean(chainError.buttonErrorMessage)
                  }
                >
                  {isFunding ? t`Sending...` : <Trans>Send {fundingAmount} esGMX to issuer</Trans>}
                </Button>
              </ButtonTooltipWrapper>
            ) : null}
            <ButtonTooltipWrapper content={chainError.buttonTooltipMessage}>
              <Button
                variant="primary-action"
                className="w-full"
                onClick={handleDistribute}
                disabled={
                  isPending ||
                  isLoadingBatch ||
                  (batchValue === undefined && Boolean(batchError)) ||
                  Boolean(inputError) ||
                  !signer ||
                  chainId !== ARBITRUM_SEPOLIA ||
                  hasOutdatedUi ||
                  Boolean(chainError.buttonErrorMessage)
                }
              >
                {primaryText}
              </Button>
            </ButtonTooltipWrapper>
          </RewardsVestingChainGuard>
        )}
      </div>
    </ModalWithPortal>
  );
}
