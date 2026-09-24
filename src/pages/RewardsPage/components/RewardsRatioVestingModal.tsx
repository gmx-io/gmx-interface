import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useEffect, useRef, useState } from "react";

import type { ContractsChainId } from "config/chains";
import { REWARDS_TERMS_URL } from "config/links";
import type { RatioVestingConfig } from "config/vesting";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  getRatioVestingDepositPreview,
  isRatioVestingDepositDisabled,
  type RatioVestingDepositAction,
} from "domain/vesting/ratioVesting";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { GMX_DECIMALS } from "lib/legacy";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { useCurrentUnixTimestamp } from "lib/useCurrentUnixTimestamp";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { ButtonTooltipWrapper } from "components/Tooltip/ButtonTooltipWrapper";

import { RewardsVestingChainGuard } from "./RewardsVestingChainGuard";
import { RewardsVestingStep } from "./RewardsVestingStep";

type TransactionStep = {
  action: RatioVestingDepositAction;
  completed: boolean;
};

type Props = {
  chainId: ContractsChainId;
  config: RatioVestingConfig;
  data: RewardsVestingData;
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  mutate: () => Promise<RewardsVestingData | undefined>;
  onVestingStarted: () => void;
};

export function RewardsRatioVestingModal({
  chainId,
  config,
  data,
  isVisible,
  setIsVisible,
  mutate,
  onVestingStarted,
}: Props) {
  const { account, active, signer, chainId: walletChainId, connector } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const chainError = useMultipleWalletExtensionsChainError();
  const now = useCurrentUnixTimestamp(30_000);
  const [value, setValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<TransactionStep[]>([]);
  const [transactionStep, setTransactionStep] = useState<RatioVestingDepositAction>();
  const [hasInterruptedTransaction, setHasInterruptedTransaction] = useState(false);
  const pendingRef = useRef(false);
  const sessionRef = useRef(0);
  const stateRef = useRef({
    account,
    active,
    walletChainId,
    chainId,
    connectorUid: connector?.uid,
    signer,
    isVisible,
    hasOutdatedUi,
    chainError: chainError.buttonErrorMessage,
  });
  stateRef.current = {
    account,
    active,
    walletChainId,
    chainId,
    connectorUid: connector?.uid,
    signer,
    isVisible,
    hasOutdatedUi,
    chainError: chainError.buttonErrorMessage,
  };
  const amount = parseValue(value, GMX_DECIMALS) ?? 0n;
  const preview = getRatioVestingDepositPreview(data, amount);
  const ratio = data.ratioVesting!;
  const depositsDisabled = isRatioVestingDepositDisabled(ratio, BigInt(now));

  useEffect(() => {
    sessionRef.current += 1;
    pendingRef.current = false;
    setIsPending(false);
    setValue("");
    setTransactionSteps([]);
    setTransactionStep(undefined);
    setHasInterruptedTransaction(false);
    return () => {
      sessionRef.current += 1;
    };
  }, [account, active, chainId, connector?.uid, isVisible, walletChainId]);

  const setDepositValue = (nextValue: string) => {
    setValue(nextValue);
    setTransactionSteps([]);
    setHasInterruptedTransaction(false);
  };

  const handleSubmit = async () => {
    if (
      !account ||
      !active ||
      !signer ||
      walletChainId !== chainId ||
      pendingRef.current ||
      hasOutdatedUi ||
      chainError.buttonErrorMessage ||
      depositsDisabled ||
      amount <= 0n ||
      amount > preview.maxDepositAmount
    )
      return;
    const session = ++sessionRef.current;
    const submitted = stateRef.current;
    const isCurrent = () => {
      const current = stateRef.current;
      return (
        sessionRef.current === session &&
        current.account === submitted.account &&
        current.active &&
        current.walletChainId === chainId &&
        current.chainId === chainId &&
        current.connectorUid === submitted.connectorUid &&
        current.signer === signer &&
        current.isVisible &&
        !current.hasOutdatedUi &&
        !current.chainError
      );
    };
    pendingRef.current = true;
    setIsPending(true);
    const completedActions = new Set<RatioVestingDepositAction>();
    let completed = false;
    try {
      while (isCurrent()) {
        let refreshed;
        try {
          refreshed = await mutate();
        } catch {
          if (isCurrent()) helperToast.error(t`Unable to refresh vesting details. Please try again.`);
          return;
        }
        if (!isCurrent()) return;
        if (!refreshed?.ratioVesting) {
          helperToast.error(t`Unable to refresh vesting details. Please try again.`);
          return;
        }
        const next = getRatioVestingDepositPreview(refreshed, amount);
        if (
          isRatioVestingDepositDisabled(refreshed.ratioVesting, BigInt(Math.floor(Date.now() / 1000))) ||
          amount > next.maxDepositAmount ||
          next.additionalPairAmount > preview.additionalPairAmount ||
          refreshed.vestingInfo.vestedAmount !== data.vestingInfo.vestedAmount ||
          refreshed.vestingInfo.pairAmount !== data.vestingInfo.pairAmount ||
          completedActions.has(next.action)
        ) {
          helperToast.info(t`Vesting details changed. Review the updated collateral and continue vesting.`);
          return;
        }

        setTransactionSteps((current) => [
          ...current.filter((step) => step.completed && !next.steps.includes(step.action)),
          ...next.steps.map((action) => ({ action, completed: false })),
        ]);
        setTransactionStep(next.action);

        let transaction;
        if (next.action === "claim") {
          transaction = await callContract(
            chainId,
            new ethers.Contract(config.issuer, abis.EsGmxIssuer, signer),
            "claim",
            [],
            {
              sentMsg: t`esGMX claim submitted`,
              failMsg: t`esGMX claim failed`,
              successMsg: t`esGMX claimed`,
              setPendingTxns,
            }
          );
        } else if (next.action === "approveEsGmx" || next.action === "approvePair") {
          const token = next.action === "approveEsGmx" ? config.esToken : config.pairToken;
          const approvalAmount = next.action === "approveEsGmx" ? amount : next.additionalPairAmount;
          transaction = await callContract(
            chainId,
            new ethers.Contract(token, abis.Token, signer),
            "approve",
            [config.vester, approvalAmount],
            {
              sentMsg: t`Approval submitted`,
              failMsg: t`Approval failed`,
              successMsg: t`Approved`,
              setPendingTxns,
            }
          );
        } else {
          transaction = await callContract(
            chainId,
            new ethers.Contract(config.vester, abis.RatioVester, signer),
            "deposit",
            [amount],
            {
              sentMsg: t`Vesting submitted`,
              failMsg: t`Vesting failed`,
              successMsg: t`Vesting started`,
              setPendingTxns,
            }
          );
        }
        if (!isCurrent() || !transaction) return;
        const receipt = await transaction.wait();
        if (!isCurrent()) return;
        if (!receipt || receipt.status !== 1) return;
        completedActions.add(next.action);
        setTransactionSteps((current) =>
          current.map((step) => (step.action === next.action ? { ...step, completed: true } : step))
        );
        setTransactionStep(undefined);
        if (next.action === "deposit") {
          completed = true;
          setIsVisible(false);
          onVestingStarted();
          try {
            await mutate();
          } catch {
            if (isCurrent()) helperToast.info(t`Balances will refresh shortly.`);
          }
          return;
        }
      }
    } catch {
      // Contract errors are reported by callContract.
    } finally {
      if (sessionRef.current === session) {
        pendingRef.current = false;
        setIsPending(false);
        setTransactionStep(undefined);
        setHasInterruptedTransaction(!completed);
      }
    }
  };

  const primaryText = hasOutdatedUi
    ? getPageOutdatedError()
    : chainError.buttonErrorMessage
      ? chainError.buttonErrorMessage
      : isPending
        ? t`Confirming...`
        : depositsDisabled
          ? t`Deposits are closed.`
          : amount <= 0n
            ? t`Enter an amount`
            : amount > preview.maxDepositAmount
              ? t`Max amount exceeded`
              : hasInterruptedTransaction
                ? t`Continue`
                : t`Vest esGMX`;
  const format = (amount: bigint) => formatAmount(amount, GMX_DECIMALS, 4, true, { trimTrailingZeros: true });

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={(visible) => {
        if (!isPending) setIsVisible(visible);
      }}
      label={t`Vest esGMX`}
      contentClassName="w-[420px]"
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-16">
        <div className="flex h-48 items-center gap-8 rounded-8 bg-fill-surfaceElevated50 px-12">
          <NumberInput
            value={value}
            onValueChange={(event) => setDepositValue(event.target.value)}
            maxDecimals={GMX_DECIMALS}
            isDisabled={isPending}
            placeholder="0"
            className="bg-transparent min-w-0 grow text-16 outline-none"
            qa="rewards-vesting-amount"
          />
          <span>esGMX</span>
          <Button
            variant="secondary"
            size="small"
            disabled={isPending}
            onClick={() => setDepositValue(formatAmountFree(preview.maxDepositAmount, GMX_DECIMALS, GMX_DECIMALS))}
          >
            <Trans>Max</Trans>
          </Button>
        </div>
        <SyntheticsInfoRow label={<Trans>Available to Vest</Trans>} value={`${format(preview.availableEsGmx)} esGMX`} />
        <SyntheticsInfoRow
          label={<Trans>Collateral required for vest</Trans>}
          value={`${format(preview.additionalPairAmount)} ${config.pairTokenSymbol}`}
        />
        <SyntheticsInfoRow
          label={<Trans>Collateral available</Trans>}
          value={`${format(data.freePairAmount)} ${config.pairTokenSymbol}`}
        />
        <p className="text-13 text-typography-secondary">
          <Trans>Sepolia vesting uses test GMX, esGMX, and sbfGMX collateral tokens.</Trans>
        </p>
        {depositsDisabled ? (
          <AlertInfoCard type="warning" hideClose>
            <Trans>Deposits are closed.</Trans>
          </AlertInfoCard>
        ) : null}
        <p className="text-13 text-typography-secondary">
          <Trans>
            By claiming or vesting esGMX, you agree to the Rewards Program{" "}
            <ExternalLink href={REWARDS_TERMS_URL}>Terms and Conditions</ExternalLink>.
          </Trans>
        </p>
        <RewardsVestingChainGuard chainId={chainId}>
          <ButtonTooltipWrapper content={chainError.buttonTooltipMessage}>
            <Button
              variant="primary-action"
              className="w-full"
              onClick={handleSubmit}
              disabled={
                isPending ||
                depositsDisabled ||
                amount <= 0n ||
                amount > preview.maxDepositAmount ||
                !signer ||
                !active ||
                hasOutdatedUi ||
                Boolean(chainError.buttonErrorMessage)
              }
            >
              {primaryText}
            </Button>
          </ButtonTooltipWrapper>
        </RewardsVestingChainGuard>
        {transactionSteps.length > 1 ? (
          <div
            className="flex flex-col gap-12 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-12"
            data-qa="rewards-vesting-steps"
          >
            {transactionSteps.map((step, index) => {
              const tokenSymbol = step.action === "approveEsGmx" ? "esGMX" : config.pairTokenSymbol;
              const label =
                step.action === "claim"
                  ? t`Claim esGMX rewards`
                  : step.action === "deposit"
                    ? t`Start vesting`
                    : t`Approve ${tokenSymbol}`;
              const completedLabel =
                step.action === "claim" ? t`esGMX claimed` : step.action === "deposit" ? t`Vesting started` : label;
              return (
                <RewardsVestingStep
                  key={step.action}
                  index={index + 1}
                  status={step.completed ? "completed" : step.action === transactionStep ? "loading" : "pending"}
                  label={label}
                  completedLabel={completedLabel}
                  showConnector={index < transactionSteps.length - 1}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </ModalWithPortal>
  );
}
