import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useEffect, useMemo, useState } from "react";
import { useCopyToClipboard } from "react-use";

import type { GtBuybackRequest, GtBuybackRequestStatus, GtBuybackSummary } from "domain/gtBuyback/useGtBuybackSummary";
import {
  GT_BUYBACK_INSUFFICIENT_SOL_ERROR,
  isGtBuybackUserRejection,
  USDC_DECIMALS,
} from "domain/gtBuyback/useGtBuybackSummary";
import { GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { formatTimeLeft } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { formatAmount, formatAmountFree, formatUsd, parseValue } from "lib/numbers";
import { useCurrentUnixTimestamp } from "lib/useCurrentUnixTimestamp";
import { bigMath } from "sdk/utils/bigmath";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

import CopyIcon from "img/ic_copy.svg?react";
import gtIcon from "img/tokens/ic_gt.svg";

import { formatGt, formatGtNumber, formatUsdc } from "./gtBuybackFormat";

function getStatusLabel(status: GtBuybackRequestStatus) {
  switch (status) {
    case "waitingSignature":
      return t`Waiting for signature`;
    case "submitting":
      return t`Submitting`;
    case "inBuyback":
      return t`In today's buyback`;
    case "awaitingPayout":
      return t`Awaiting payout`;
    case "paid":
      return t`Paid`;
    case "withdrawn":
      return t`Withdrawn`;
  }
}

function RequestTracker({ request }: { request: GtBuybackRequest }) {
  const now = useCurrentUnixTimestamp(60_000);
  const timeLeft =
    request.status === "inBuyback" && request.windowEndsAt ? formatTimeLeft(request.windowEndsAt - now) : "";

  return (
    <div className="flex items-center justify-between gap-12">
      <span className="text-body-medium font-medium text-typography-primary numbers">
        <Trans>Selling {formatGt(request.gtAmount)}</Trans>
      </span>
      <span className="text-body-small flex items-center gap-6 text-right">
        <span className="size-8 shrink-0 rounded-full bg-blue-300" />
        <span className="font-medium text-typography-primary">{getStatusLabel(request.status)}</span>
        {timeLeft ? <span className="text-typography-secondary">· {timeLeft}</span> : null}
      </span>
    </div>
  );
}

const HISTORY_PREVIEW_COUNT = 5;

function formatRequestDate(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(timestamp * 1000));
}

function RequestHistory({ requests, showTitle = true }: { requests: GtBuybackRequest[]; showTitle?: boolean }) {
  const { i18n } = useLingui();
  const [isExpanded, setIsExpanded] = useState(false);
  const sorted = useMemo(() => [...requests].sort((a, b) => b.createdAt - a.createdAt), [requests]);
  const visible = isExpanded ? sorted : sorted.slice(0, HISTORY_PREVIEW_COUNT);

  return (
    <div className="flex flex-col gap-8">
      {showTitle ? (
        <span className="text-body-medium font-medium text-typography-primary">
          <Trans>History</Trans>
        </span>
      ) : null}
      <div className={cx("flex flex-col gap-8", { "max-h-[200px] overflow-y-auto pr-4": isExpanded })}>
        {visible.map((request) => (
          <div key={request.id} className="text-body-small grid grid-cols-[56px_1fr_auto] items-center gap-8">
            <span className="text-typography-secondary">{formatRequestDate(request.createdAt, i18n.locale)}</span>
            <span className="text-typography-primary numbers">
              {formatGt(request.gtAmount)}
              {request.usdcAmount !== undefined ? (
                <span className="text-typography-secondary"> → {formatUsdc(request.usdcAmount)}</span>
              ) : null}
            </span>
            <span className="flex items-center gap-6">
              <span
                className={cx("size-8 shrink-0 rounded-full", {
                  "bg-green-500": request.status === "paid" || request.status === "withdrawn",
                  "bg-blue-300": request.status !== "paid" && request.status !== "withdrawn",
                })}
              />
              <span className="text-typography-secondary">{getStatusLabel(request.status)}</span>
            </span>
          </div>
        ))}
      </div>
      {sorted.length > HISTORY_PREVIEW_COUNT ? (
        <button
          type="button"
          className="text-body-small self-start font-medium text-blue-300 gmx-hover:text-blue-100"
          onClick={() => setIsExpanded((value) => !value)}
        >
          {isExpanded ? <Trans>Show less</Trans> : <Trans>Show all ({sorted.length})</Trans>}
        </button>
      ) : null}
    </div>
  );
}

export function GtBuybackModal({
  isVisible,
  setIsVisible,
  gtBalance,
  gtBalanceUsd,
  buyback,
  onRequestSale,
  onSignWithdraw,
  onApproveSolanaWithdraw,
  initialView = "overview",
  onCreateReferralCode,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  gtBalance: bigint;
  gtBalanceUsd: bigint | undefined;
  buyback: GtBuybackSummary;
  onRequestSale?: (gtAmount: bigint) => Promise<void>;
  onSignWithdraw?: (usdcAmount: bigint, solanaAddress: string) => Promise<void>;
  onApproveSolanaWithdraw?: (usdcAmount: bigint, solanaAddress: string) => Promise<void>;
  initialView?: "overview" | "withdraw";
  onCreateReferralCode?: () => void;
}) {
  const [, copyToClipboard] = useCopyToClipboard();
  const [view, setView] = useState<"overview" | "sell" | "withdraw">("overview");

  useEffect(() => {
    setView(isVisible ? initialView : "overview");
  }, [isVisible, initialView]);

  const quotaAvailable = bigMath.min(bigMath.max(buyback.quotaTotal - buyback.quotaUsed, 0n), gtBalance);
  const quotaUsedText = formatGtNumber(buyback.quotaUsed);
  const quotaTotalText = formatGtNumber(buyback.quotaTotal);
  const currentRequest =
    buyback.activeRequest && !["paid", "withdrawn"].includes(buyback.activeRequest.status)
      ? buyback.activeRequest
      : undefined;
  const sendDisabledReason = buyback.isSmartContractWallet
    ? t`Not available for smart-contract wallets`
    : quotaAvailable === 0n
      ? t`No sellable GT`
      : undefined;
  const quotaUsedPercent =
    buyback.quotaTotal > 0n ? Math.min(Number((buyback.quotaUsed * 10000n) / buyback.quotaTotal) / 100, 100) : 0;
  const quotaBarStyle = useMemo(() => ({ width: `${quotaUsedPercent}%` }), [quotaUsedPercent]);

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={view === "overview" ? t`GT buyback` : view === "sell" ? t`Sell GT` : t`Withdraw USDC`}
      withMobileBottomPosition
    >
      {view === "overview" ? (
        <div className="flex w-[420px] max-w-full flex-col gap-16 pb-20">
          <div className="grid grid-cols-2 gap-12">
            <div className="flex flex-col gap-2 rounded-8 bg-slate-800 p-12">
              <span className="text-body-small text-typography-secondary">
                <Trans>GT balance</Trans>
              </span>
              <span className="text-body-large font-medium numbers">{formatGt(gtBalance)}</span>
              {gtBalanceUsd !== undefined ? (
                <span className="text-body-small text-typography-secondary numbers">{formatUsd(gtBalanceUsd)}</span>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 rounded-8 bg-slate-800 p-12">
              <span className="text-body-small text-typography-secondary">
                <Tooltip
                  variant="iconStroke"
                  handle={<Trans>Sellable GT</Trans>}
                  content={
                    <Trans>
                      How much of your GT you can sell in the buyback this season. Your referees unlock it as they use
                      GMX on Solana, and it can't be more than your GT balance.
                    </Trans>
                  }
                />
              </span>
              <span className="text-body-large font-medium numbers">{formatGt(quotaAvailable)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <SyntheticsInfoRow
              label={<Trans>Season quota</Trans>}
              value={
                <span className="numbers">
                  <Trans>
                    {quotaUsedText} / {quotaTotalText} GT used
                  </Trans>
                </span>
              }
            />
            {buyback.quotaTotal > 0n ? (
              <div className="h-4 overflow-hidden rounded-full bg-cold-blue-900">
                <div className="h-full rounded-full bg-blue-300" style={quotaBarStyle} />
              </div>
            ) : null}
            <SyntheticsInfoRow
              label={<Trans>Referral code</Trans>}
              value={
                buyback.referralCode ? (
                  <span className="flex items-center gap-6">
                    <span className="font-medium">{buyback.referralCode}</span>
                    <button
                      type="button"
                      className="text-typography-secondary gmx-hover:text-typography-primary"
                      aria-label={t`Copy referral code`}
                      onClick={() => {
                        copyToClipboard(buyback.referralCode!);
                        helperToast.success(t`Referral code copied to your clipboard`);
                      }}
                    >
                      <CopyIcon className="size-16" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="font-medium text-blue-300 gmx-hover:text-blue-100"
                    onClick={onCreateReferralCode}
                  >
                    <Trans>Create referral code</Trans>
                  </button>
                )
              }
            />
            <SyntheticsInfoRow
              label={<Trans>Total bought back</Trans>}
              value={<span className="numbers">{formatUsdc(buyback.totalBoughtBackUsdc)}</span>}
            />
          </div>

          {buyback.isSmartContractWallet ? (
            <AlertInfoCard type="warning" hideClose>
              <Trans>
                Multisig and other smart-contract wallets can't join the buyback. Connect a regular wallet to sell GT.
              </Trans>
            </AlertInfoCard>
          ) : null}

          {buyback && !buyback.isSmartContractWallet && buyback.referralCode && quotaAvailable === 0n ? (
            <AlertInfoCard type="info" hideClose>
              <Trans>
                No sellable GT right now. Share your referral code — your GT unlocks as the people you refer use GMX on
                Solana.
              </Trans>
            </AlertInfoCard>
          ) : null}

          {currentRequest ? <RequestTracker request={currentRequest} /> : null}

          <Button
            variant="primary-action"
            className="w-full"
            disabled={sendDisabledReason !== undefined}
            onClick={() => setView("sell")}
          >
            {sendDisabledReason ?? <Trans>Sell through buyback</Trans>}
          </Button>
        </div>
      ) : view === "withdraw" ? (
        <GtBuybackWithdrawFlow
          withdrawableUsdc={buyback.withdrawableUsdc}
          onSignWithdraw={onSignWithdraw}
          onApproveSolanaWithdraw={onApproveSolanaWithdraw}
          onCancel={() => setIsVisible(false)}
          onDone={() => setIsVisible(false)}
        />
      ) : (
        <GtBuybackSellFlow
          quotaAvailable={quotaAvailable}
          season={buyback.season}
          isBlocked={sendDisabledReason !== undefined}
          onRequestSale={onRequestSale}
          onBack={() => setView("overview")}
        />
      )}
    </ModalWithPortal>
  );
}

function GtBuybackSellFlow({
  quotaAvailable,
  season,
  isBlocked,
  onRequestSale,
  onBack,
}: {
  quotaAvailable: bigint;
  season: string | undefined;
  isBlocked: boolean;
  onRequestSale?: (gtAmount: bigint) => Promise<void>;
  onBack: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | undefined>(undefined);

  const amount = useMemo(() => parseValue(inputValue, GT_DECIMALS) ?? 0n, [inputValue]);
  const amountError = amount === 0n ? t`Enter an amount` : amount > quotaAvailable ? t`Max amount exceeded` : undefined;

  const sell = async () => {
    if (!onRequestSale) return;
    setIsSigning(true);
    setSignError(undefined);
    try {
      await onRequestSale(amount);
      onBack();
    } catch (e) {
      setSignError(
        isGtBuybackUserRejection(e)
          ? t`The signature was rejected. Nothing was sent and your GT is unchanged.`
          : t`Something went wrong. Check your buyback history before trying again.`
      );
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="flex w-[420px] max-w-full flex-col gap-16 pb-20">
      <BuyInputSection
        topLeftLabel={t`Sell`}
        topRightLabel={t`Sellable`}
        topRightValue={formatAmount(quotaAvailable, GT_DECIMALS, 2, true)}
        onClickMax={
          quotaAvailable > 0n && !isSigning
            ? () => setInputValue(formatAmountFree(quotaAvailable, GT_DECIMALS))
            : undefined
        }
        inputValue={inputValue}
        onInputValueChange={(e) => setInputValue(e.target.value)}
        maxDecimals={GT_DECIMALS}
      >
        <div className="flex items-center gap-4 py-8">
          <img className="size-24" src={gtIcon} alt="GT" />
          GT
        </div>
      </BuyInputSection>

      <span className="text-body-small text-typography-secondary">
        {season ? (
          <Trans>You can sell up to your sellable GT. The request counts toward {season} only.</Trans>
        ) : (
          <Trans>You can sell up to your sellable GT. The request counts toward the current season only.</Trans>
        )}
      </span>

      {signError ? (
        <AlertInfoCard type="error" hideClose>
          {signError}
        </AlertInfoCard>
      ) : null}

      <div className="grid grid-cols-2 gap-8">
        <Button variant="secondary" disabled={isSigning} onClick={onBack}>
          <Trans>Back</Trans>
        </Button>
        <Button
          variant="primary"
          disabled={isBlocked || isSigning || !onRequestSale || amountError !== undefined}
          onClick={sell}
        >
          {amountError ??
            (!onRequestSale ? (
              <Trans>Signing not connected</Trans>
            ) : isSigning ? (
              <Trans>Confirm in your wallet...</Trans>
            ) : (
              <Trans>Sell</Trans>
            ))}
        </Button>
      </div>
    </div>
  );
}

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function WalletSteps({ stage }: { stage: "idle" | "evmSign" | "solanaApprove" | "done" }) {
  const steps = [
    { key: "evmSign", label: t`Sign in your EVM wallet` },
    { key: "solanaApprove", label: t`Approve in a Solana wallet` },
  ];
  const activeIndex = steps.findIndex((step) => step.key === stage);

  return (
    <div className="flex items-center gap-8">
      {steps.map((step, index) => (
        <div key={step.key} className="contents">
          {index > 0 ? <span className="text-typography-secondary">→</span> : null}
          <div
            className={cx(
              "text-body-small flex items-center gap-8",
              index === activeIndex ? "text-typography-primary" : "text-typography-secondary"
            )}
          >
            <span
              className={cx(
                "flex size-20 shrink-0 items-center justify-center rounded-full text-12 font-medium numbers",
                index < activeIndex
                  ? "bg-green-900 text-green-700"
                  : index === activeIndex
                    ? "bg-blue-300 text-white"
                    : "bg-slate-700 text-typography-secondary"
              )}
            >
              {index < activeIndex ? "✓" : index + 1}
            </span>
            {step.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function GtBuybackWithdrawFlow({
  withdrawableUsdc,
  onSignWithdraw,
  onApproveSolanaWithdraw,
  onCancel,
  onDone,
}: {
  withdrawableUsdc: bigint;
  onSignWithdraw?: (usdcAmount: bigint, solanaAddress: string) => Promise<void>;
  onApproveSolanaWithdraw?: (usdcAmount: bigint, solanaAddress: string) => Promise<void>;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [address, setAddress] = useState("");
  const [stage, setStage] = useState<"idle" | "evmSign" | "solanaApprove" | "done">("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const [sentAmount, setSentAmount] = useState(0n);

  const amount = useMemo(() => parseValue(inputValue, USDC_DECIMALS) ?? 0n, [inputValue]);
  const trimmedAddress = address.trim();
  const isConnected = Boolean(onSignWithdraw && onApproveSolanaWithdraw);
  const isBusy = stage === "evmSign" || stage === "solanaApprove";
  const formError =
    amount === 0n
      ? t`Enter an amount`
      : amount > withdrawableUsdc
        ? t`Max amount exceeded`
        : trimmedAddress === ""
          ? t`Enter a Solana address`
          : !SOLANA_ADDRESS_REGEX.test(trimmedAddress)
            ? t`Invalid Solana address`
            : undefined;

  const withdraw = async () => {
    if (!onSignWithdraw || !onApproveSolanaWithdraw) return;
    setError(undefined);
    try {
      setStage("evmSign");
      await onSignWithdraw(amount, trimmedAddress);
    } catch (e) {
      setStage("idle");
      setError(
        isGtBuybackUserRejection(e)
          ? t`The EVM signature was rejected. Nothing was withdrawn.`
          : t`Couldn't get the EVM signature. Nothing was withdrawn. Try again.`
      );
      return;
    }
    try {
      setStage("solanaApprove");
      await onApproveSolanaWithdraw(amount, trimmedAddress);
      setSentAmount(amount);
      setStage("done");
    } catch (e) {
      setStage("idle");
      setError(
        e instanceof Error && e.message === GT_BUYBACK_INSUFFICIENT_SOL_ERROR
          ? t`Not enough SOL in your Solana wallet for the network fee.`
          : t`We couldn't confirm the Solana transaction. Check your Solana wallet before trying again.`
      );
    }
  };

  if (stage === "done") {
    const shortAddress = `${trimmedAddress.slice(0, 4)}...${trimmedAddress.slice(-4)}`;
    return (
      <div className="flex w-[420px] max-w-full flex-col items-center gap-12 pb-20 pt-8 text-center">
        <span className="text-h3 font-medium text-typography-primary">
          <Trans>Withdrawal sent</Trans>
        </span>
        <span className="text-h2 font-medium text-green-500 numbers">{formatUsdc(sentAmount)}</span>
        <span className="text-body-small text-typography-secondary">
          <Trans>Sent to {shortAddress}. It may take a few minutes to arrive.</Trans>
        </span>
        <Button variant="primary-action" className="mt-8 w-full" onClick={onDone}>
          <Trans>Done</Trans>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-[420px] max-w-full flex-col gap-16 pb-20">
      <BuyInputSection
        topLeftLabel={t`Withdraw`}
        topRightLabel={t`Available`}
        topRightValue={formatAmount(withdrawableUsdc, USDC_DECIMALS, 2, true)}
        onClickMax={
          withdrawableUsdc > 0n && !isBusy
            ? () => setInputValue(formatAmountFree(withdrawableUsdc, USDC_DECIMALS))
            : undefined
        }
        inputValue={inputValue}
        onInputValueChange={(e) => setInputValue(e.target.value)}
        maxDecimals={USDC_DECIMALS}
      >
        <div className="flex items-center gap-4 py-8">USDC</div>
      </BuyInputSection>

      <label className="flex flex-col gap-6">
        <span className="text-body-small text-typography-secondary">
          <Trans>Receive USDC to Solana address</Trans>
        </span>
        <input
          className="text-body-medium rounded-8 border-1/2 border-slate-600 bg-slate-800 px-12 py-10 text-typography-primary placeholder:text-typography-inactive"
          placeholder={t`Solana address that receives the USDC`}
          value={address}
          disabled={isBusy}
          onChange={(e) => setAddress(e.target.value)}
        />
      </label>

      <WalletSteps stage={stage} />

      {error ? (
        <AlertInfoCard type="error" hideClose>
          {error}
        </AlertInfoCard>
      ) : null}

      <div className="grid grid-cols-2 gap-8">
        <Button variant="secondary" disabled={isBusy} onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" disabled={isBusy || !isConnected || formError !== undefined} onClick={withdraw}>
          {stage === "evmSign" ? (
            <Trans>Sign in your EVM wallet...</Trans>
          ) : stage === "solanaApprove" ? (
            <Trans>Approve in Solana wallet...</Trans>
          ) : (
            formError ?? (!isConnected ? <Trans>Withdraw not connected</Trans> : <Trans>Withdraw</Trans>)
          )}
        </Button>
      </div>
    </div>
  );
}

export function GtBuybackHistoryModal({
  isVisible,
  setIsVisible,
  history,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  history: GtBuybackRequest[];
}) {
  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`Buyback history`}
      withMobileBottomPosition
    >
      <div className="flex w-[420px] max-w-full flex-col gap-16 pb-20">
        {history.length > 0 ? (
          <RequestHistory requests={history} showTitle={false} />
        ) : (
          <span className="text-body-small text-typography-secondary">
            <Trans>No past buyback requests yet.</Trans>
          </span>
        )}
      </div>
    </ModalWithPortal>
  );
}
