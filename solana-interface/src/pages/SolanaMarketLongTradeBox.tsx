import { useMemo, useState } from "react";

import Button from "components/Button/Button";
import { TradeInputField } from "components/TradeboxMarginFields/TradeInputField";
import { parseValue } from "lib/numbers";

import { getSolanaMarketLongConfig } from "../../gmsol/config";
import {
  calculateSolanaMarketLongSizeDeltaUsd,
  signAndSendSolanaMarketLong,
} from "../../gmsol/marketLong";
import { getSolanaRpcClient } from "../lib/rpc";
import { useSolanaTokenPrices } from "../prices/useSolanaTokenPrices";
import { useSolanaWallet } from "../wallet/useSolanaWallet";

const USDC_DECIMALS = 6;
const SOLANA_USD_DECIMALS = 20;
const SOLANA_INDEX_TOKEN_DECIMALS = 9;
const SOLANA_INDEX_TOKEN_MINT = "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH";
const FIXED_LEVERAGE = 10n * 10n ** 4n;

type SolanaMarketTradeBoxProps = {
  isLong: boolean;
  orderType?: "market" | "limit";
};

export function SolanaMarketLongTradeBox({ isLong, orderType = "market" }: SolanaMarketTradeBoxProps) {
  const { address, wallet } = useSolanaWallet();
  const { tokenPriceByMint } = useSolanaTokenPrices();
  const [collateralInput, setCollateralInput] = useState("");
  const [triggerPriceInput, setTriggerPriceInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [signature, setSignature] = useState<string>();
  const [orderAddress, setOrderAddress] = useState<string>();

  const collateralAmount = useMemo(
    () => parseValue(collateralInput || "0", USDC_DECIMALS) ?? 0n,
    [collateralInput]
  );
  const sizeDeltaUsd = useMemo(
    () => calculateSolanaMarketLongSizeDeltaUsd(collateralAmount, FIXED_LEVERAGE),
    [collateralAmount]
  );
  const triggerPrice = useMemo(
    () => parseValue(triggerPriceInput || "0", SOLANA_USD_DECIMALS) ?? 0n,
    [triggerPriceInput]
  );
  const currentPrice = tokenPriceByMint.get(SOLANA_INDEX_TOKEN_MINT)?.price;
  const triggerUnitPrice = triggerPrice / 10n ** BigInt(SOLANA_INDEX_TOKEN_DECIMALS);
  const isLimit = orderType === "limit";
  const hasValidLimit =
    !isLimit ||
    (triggerPrice > 0n &&
      currentPrice !== undefined &&
      (isLong ? triggerPrice < currentPrice : triggerPrice > currentPrice) &&
      triggerUnitPrice > 0n);

  async function submit() {
    if (!address || !wallet || collateralAmount <= 0n || !hasValidLimit || isSubmitting) return;

    setError(undefined);
    setSignature(undefined);
    setOrderAddress(undefined);
    setIsSubmitting(true);
    try {
      const result = await signAndSendSolanaMarketLong(getSolanaRpcClient(), wallet, {
        owner: address,
        collateralAmount,
        sizeDeltaUsd,
        isLong,
        triggerPrice: isLimit ? triggerUnitPrice : undefined,
        acceptablePrice: isLimit ? triggerUnitPrice : undefined,
        config: getSolanaMarketLongConfig(),
      });
      setSignature(result.signature);
      setOrderAddress(result.order.toBase58());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = Boolean(
    address && wallet && collateralAmount > 0n && hasValidLimit && !isSubmitting
  );

  return (
    <section className="flex min-w-0 flex-col gap-12 rounded-8 bg-slate-900 p-16">
      <div>
        <h2 className="text-16 font-medium">SOL/USD</h2>
        <p className="mt-4 text-12 text-typography-secondary">
          {isLimit ? "Limit" : "Market"} {isLong ? "Long" : "Short"} · USDC collateral
        </p>
      </div>

      <TradeInputField
        label="Margin"
        alternateValue={undefined}
        tokenSymbol="USDC"
        displayMode="token"
        showDisplayModeToggle={false}
        unitLabel="USDC"
        inputValue={collateralInput}
        onInputValueChange={(event) => setCollateralInput(event.target.value)}
        placeholder="0.00"
        maxDecimals={USDC_DECIMALS}
        qa="solana-market-long-collateral"
      />
      <TradeInputField
        label="Size"
        alternateValue={undefined}
        displayMode="usd"
        showDisplayModeToggle={false}
        unitLabel="USD"
        rightHeadline="10x"
        inputValue={(Number(sizeDeltaUsd) / 10 ** SOLANA_USD_DECIMALS).toFixed(2)}
        onInputValueChange={() => undefined}
        placeholder="0.00"
        maxDecimals={2}
        isDisabled
        qa="solana-market-long-size"
      />

      {isLimit ? (
        <>
          <TradeInputField
            label="Limit price"
            alternateValue={undefined}
            displayMode="usd"
            showDisplayModeToggle={false}
            unitLabel="USD"
            rightHeadline={
              currentPrice === undefined
                ? "Mark: Loading..."
                : `Mark: $${Number(currentPrice) / 10 ** SOLANA_USD_DECIMALS}`
            }
            inputValue={triggerPriceInput}
            onInputValueChange={(event) => setTriggerPriceInput(event.target.value)}
            placeholder="140.00"
            maxDecimals={2}
            qa="solana-market-long-trigger-price"
          />
        </>
      ) : null}

      <Button variant="primary-action" size="medium" disabled={!canSubmit} onClick={submit}>
        {isSubmitting
          ? "Confirming..."
          : address
            ? isLimit
              ? `Place Limit ${isLong ? "Long" : "Short"}`
              : `Open ${isLong ? "Long" : "Short"}`
            : "Connect Solana Wallet"}
      </Button>

      {error ? <p className="text-12 text-red-300">{error}</p> : null}
      {signature ? (
        <p className="break-all text-12 text-green-300">
          {isLimit ? "Limit order submitted" : "Submitted"}: {signature}
        </p>
      ) : null}
      {isLimit && orderAddress ? (
        <p className="break-all text-12 text-typography-secondary">Order: {orderAddress}</p>
      ) : null}
    </section>
  );
}
