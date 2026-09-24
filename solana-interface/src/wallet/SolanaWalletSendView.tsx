import { t, Trans } from "@lingui/macro";
import { useEffect, useMemo, useState } from "react";

import { formatAmountFree, formatUsd, parseValue } from "lib/numbers";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { Amount } from "components/Amount/Amount";
import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import {
  collapseSolanaSendAssets,
  isSolanaAddress,
  maxSolSendAmount,
  formatEstimate,
  quoteSolanaTransferFee,
  solanaSendBlock,
  solanaTxUrl,
  type SolanaSendAsset,
} from "./solanaTransfer";
import { submitSolanaTransfer, useSolanaTransferStatus } from "./solanaTransferStore";
import { useSolanaAssets } from "./useSolanaAssets";
import { useSolanaWallet } from "./useSolanaWallet";

function tokenIconSymbol(symbol: string) {
  return symbol === "WSOL" ? "SOL" : symbol;
}

function SolFeeValue({
  ready,
  amount,
  usd,
  quoteError,
  noFeeWhenZero,
}: {
  ready: boolean;
  amount: bigint | undefined;
  usd: bigint | undefined;
  quoteError: string | undefined;
  noFeeWhenZero?: boolean;
}) {
  if (!ready || amount === undefined) return quoteError ? "-" : "...";
  if (noFeeWhenZero && amount === 0n) return <Trans>No fee</Trans>;
  if (usd === undefined) return <Amount amount={amount} decimals={9} isStable={false} symbol="SOL" showZero />;
  return <AmountWithUsdBalance amount={amount} decimals={9} usd={usd} symbol="SOL" />;
}

function SendAssetItem({ option }: { option: SolanaSendAsset }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <div className="flex items-center gap-8">
        <TokenIcon symbol={tokenIconSymbol(option.symbol)} displaySize={20} />
        <span>{option.symbol}</span>
      </div>
      <Amount amount={option.amount} decimals={option.decimals} isStable={false} />
    </div>
  );
}

export function SolanaWalletSendView() {
  const { address, wallet } = useSolanaWallet();
  const { rows } = useSolanaAssets(address);
  const transfer = useSolanaTransferStatus();
  const assets = useMemo(() => collapseSolanaSendAssets(rows), [rows]);
  const [selectedMint, setSelectedMint] = useState<string>();
  const [recipient, setRecipient] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [networkFee, setNetworkFee] = useState<bigint>();
  const [sendFee, setSendFee] = useState<bigint>();
  const [estimatedSeconds, setEstimatedSeconds] = useState<number>();
  const [quoteError, setQuoteError] = useState<string>();

  const asset = assets.find((item) => item.mint === selectedMint);
  const solAsset = assets.find((item) => item.native);
  const solBalance = solAsset?.amount ?? 0n;
  const amount = asset && inputValue !== "" ? parseValue(inputValue, asset.decimals) : undefined;
  const amountUsd = asset && asset.amount > 0n && amount ? (amount * asset.balanceUsd) / asset.amount : 0n;
  const walletBalanceUsd = assets.reduce((sum, item) => sum + item.balanceUsd, 0n);
  const insufficientBalance = asset !== undefined && amount !== undefined && amount > asset.amount;
  const nextWalletBalanceUsd =
    asset && !insufficientBalance && amount && amount > 0n ? walletBalanceUsd - amountUsd : undefined;
  const fee = networkFee !== undefined && sendFee !== undefined ? networkFee + sendFee : undefined;
  const networkFeeUsd =
    networkFee !== undefined && solAsset && solAsset.amount > 0n
      ? (networkFee * solAsset.balanceUsd) / solAsset.amount
      : undefined;
  const sendFeeUsd =
    sendFee !== undefined && solAsset && solAsset.amount > 0n ? (sendFee * solAsset.balanceUsd) / solAsset.amount : undefined;
  const maxAmount = !asset ? undefined : asset.native ? (fee === undefined ? undefined : maxSolSendAmount(asset.amount, fee)) : asset.amount;
  const inProgress = transfer.phase === "awaitingSignature" || transfer.phase === "submitted";
  const block =
    asset && amount !== undefined && amount > 0n && fee !== undefined
      ? solanaSendBlock({
          recipient,
          amount,
          assetBalance: asset.amount,
          solBalance,
          fee,
          native: asset.native,
        })
      : undefined;

  useEffect(() => {
    if (selectedMint && !assets.some((item) => item.mint === selectedMint)) setSelectedMint(undefined);
  }, [assets, selectedMint]);

  const quoteMint = asset?.mint;
  const quoteNative = asset?.native;
  const quoteDecimals = asset?.decimals;

  useEffect(() => {
    if (!address || !quoteMint || quoteNative === undefined || quoteDecimals === undefined || !isSolanaAddress(recipient)) {
      setNetworkFee(undefined);
      setSendFee(undefined);
      setEstimatedSeconds(undefined);
      setQuoteError(undefined);
      return;
    }

    let cancelled = false;
    setNetworkFee(undefined);
    setSendFee(undefined);
    setEstimatedSeconds(undefined);
    setQuoteError(undefined);
    quoteSolanaTransferFee({
      owner: address,
      recipient,
      native: quoteNative,
      mint: quoteMint,
      decimals: quoteDecimals,
      amount: 1n,
    })
      .then((next) => {
        if (cancelled) return;
        setNetworkFee(next.networkFee);
        setSendFee(next.sendFee);
        setEstimatedSeconds(next.estimatedSeconds);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNetworkFee(undefined);
        setSendFee(undefined);
        setEstimatedSeconds(undefined);
        setQuoteError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [address, quoteDecimals, quoteMint, quoteNative, recipient]);

  const handleSend = () => {
    if (!address || !wallet || !asset || amount === undefined || amount <= 0n || fee === undefined || block) return;
    submitSolanaTransfer({
      wallet,
      owner: address,
      recipient,
      native: asset.native,
      mint: asset.mint,
      decimals: asset.decimals,
      amount,
    });
  };

  let buttonText = t`Send`;
  let buttonDisabled = false;
  if (inProgress) {
    buttonText = transfer.phase === "awaitingSignature" ? t`Awaiting signature` : t`Submitted`;
    buttonDisabled = true;
  } else if (!asset) {
    buttonText = t`Select token`;
    buttonDisabled = true;
  } else if (recipient === "") {
    buttonText = t`Enter recipient address`;
    buttonDisabled = true;
  } else if (!isSolanaAddress(recipient)) {
    buttonText = t`Invalid recipient address`;
    buttonDisabled = true;
  } else if (amount === undefined || amount <= 0n) {
    buttonText = t`Enter amount`;
    buttonDisabled = true;
  } else if (fee === undefined || block) {
    buttonText =
      block === "insufficient-balance"
        ? t`Insufficient balance`
        : block === "insufficient-sol"
          ? t`Insufficient SOL for network fee`
          : t`Send`;
    buttonDisabled = true;
  }

  const recipientReady = isSolanaAddress(recipient);
  const showStatus =
    transfer.phase === "awaitingSignature" || transfer.phase === "submitted" || transfer.phase === "confirmed";

  return (
    <div className="flex grow flex-col overflow-y-auto p-adaptive">
      <div className="flex flex-col gap-[--padding-adaptive]">
        <div className="flex flex-col gap-6">
          <div className="text-body-medium text-typography-secondary">
            <Trans>Asset</Trans>
          </div>
          <DropdownSelector
            value={selectedMint}
            onChange={setSelectedMint}
            placeholder={t`Select token`}
            button={
              asset ? (
                <div className="flex items-center gap-8">
                  <TokenIcon symbol={tokenIconSymbol(asset.symbol)} displaySize={20} />
                  <span>{asset.symbol}</span>
                </div>
              ) : undefined
            }
            options={assets}
            item={SendAssetItem}
            itemKey={(option) => option.mint}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="text-body-medium text-typography-secondary">
            <Trans>Recipient address</Trans>
          </div>
          <input
            type="text"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value.trim())}
            spellCheck={false}
            autoComplete="off"
            placeholder={t`Solana address`}
            className="w-full rounded-8 border border-slate-800 bg-slate-800 px-14 py-13 text-16 leading-base
                       outline-none placeholder:text-typography-secondary focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="text-body-medium flex items-center justify-between text-typography-secondary">
            <Trans>Amount</Trans>
            {asset && (
              <div>
                <Trans>Available:</Trans>{" "}
                <Amount
                  className="text-typography-primary"
                  amount={asset.amount}
                  decimals={asset.decimals}
                  isStable={false}
                  symbol={asset.symbol}
                />
              </div>
            )}
          </div>
          <div className="relative text-16 leading-base">
            <NumberInput
              value={inputValue}
              onValueChange={(event) => setInputValue(event.target.value)}
              className="w-full rounded-8 border border-slate-800 bg-slate-800 py-13 pl-14 pr-96 text-16 leading-base
                         focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
              placeholder="0.00"
              maxDecimals={asset?.decimals}
            />
            <div className="pointer-events-none absolute right-14 top-1/2 flex -translate-y-1/2 items-center gap-8">
              <span className="text-typography-secondary">{asset?.symbol}</span>
              {maxAmount !== undefined && maxAmount > 0n && asset && (
                <button
                  className="text-body-small pointer-events-auto rounded-full bg-slate-600 px-8 py-2 font-medium
                           hover:bg-slate-500 focus-visible:bg-slate-500 active:bg-slate-500/70"
                  onClick={() => setInputValue(formatAmountFree(maxAmount, asset.decimals))}
                >
                  <Trans>Max</Trans>
                </button>
              )}
            </div>
          </div>
          <div className="text-body-medium text-typography-secondary numbers">{formatUsd(amountUsd)}</div>
        </div>
      </div>

      {quoteError && (
        <AlertInfoCard type="error" className="my-4" hideClose>
          {quoteError}
        </AlertInfoCard>
      )}
      {transfer.phase === "failed" && transfer.message && (
        <AlertInfoCard type="error" className="my-4" hideClose>
          <div className="flex flex-col gap-4">
            <span>{transfer.message}</span>
            {transfer.signature && (
              <a
                href={solanaTxUrl(transfer.signature)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400"
              >
                <Trans>View transaction</Trans>
              </a>
            )}
          </div>
        </AlertInfoCard>
      )}

      <div className="h-32 shrink-0 grow" />

      {asset || showStatus ? (
        <div className="mb-16 flex flex-col gap-10">
          {asset && (
            <>
              <SyntheticsInfoRow
                label={<Trans>Estimated time</Trans>}
                valueClassName="numbers"
                value={!recipientReady || estimatedSeconds === undefined ? (quoteError ? "-" : "...") : formatEstimate(estimatedSeconds)}
              />
              <SyntheticsInfoRow
                label={<Trans>Network fee</Trans>}
                value={
                  <SolFeeValue ready={recipientReady} amount={networkFee} usd={networkFeeUsd} quoteError={quoteError} />
                }
              />
              <SyntheticsInfoRow
                label={<Trans>Send fee</Trans>}
                value={
                  <SolFeeValue
                    ready={recipientReady}
                    amount={sendFee}
                    usd={sendFeeUsd}
                    quoteError={quoteError}
                    noFeeWhenZero
                  />
                }
              />
              <SyntheticsInfoRow
                label={<Trans>Wallet balance</Trans>}
                value={<ValueTransition from={formatUsd(walletBalanceUsd)} to={formatUsd(nextWalletBalanceUsd)} />}
              />
            </>
          )}
          {transfer.phase === "awaitingSignature" && (
            <SyntheticsInfoRow label={<Trans>Status</Trans>} value={<Trans>Awaiting signature</Trans>} />
          )}
          {transfer.signature && (transfer.phase === "submitted" || transfer.phase === "confirmed") && (
            <SyntheticsInfoRow
              label={<Trans>Status</Trans>}
              value={
                <a
                  href={solanaTxUrl(transfer.signature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400"
                >
                  {transfer.phase === "submitted" ? <Trans>Submitted</Trans> : <Trans>Confirmed</Trans>}
                </a>
              }
            />
          )}
        </div>
      ) : null}

      <Button variant="primary-action" className="w-full shrink-0" onClick={handleSend} disabled={buttonDisabled}>
        {buttonText}
      </Button>
    </div>
  );
}
