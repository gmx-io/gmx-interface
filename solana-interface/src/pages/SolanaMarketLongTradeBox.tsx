import { useMemo, useState } from "react";

import Button from "components/Button/Button";
import { TradeInputField } from "components/TradeboxMarginFields/TradeInputField";
import { USD_DECIMALS } from "config/factors";
import { parseValue } from "lib/numbers";

import { getSolanaMarketLongConfig } from "../../gmsol/config";
import { signAndSendSolanaMarketLong } from "../../gmsol/marketLong";
import { getSolanaRpcClient } from "../lib/rpc";
import { useSolanaWallet } from "../wallet/useSolanaWallet";

const USDC_DECIMALS = 6;
const LEVERAGE_DECIMALS = 4;
const LEVERAGE_SCALE = 10n ** BigInt(LEVERAGE_DECIMALS);
const USD_SCALE = 10n ** BigInt(USD_DECIMALS);

function calculateSizeDeltaUsd(collateralAmount: bigint, leverage: bigint) {
  const collateralUsd = (collateralAmount * USD_SCALE) / 10n ** BigInt(USDC_DECIMALS);
  return (collateralUsd * leverage) / LEVERAGE_SCALE;
}

export function SolanaMarketLongTradeBox() {
  const { address, wallet } = useSolanaWallet();
  const [collateralInput, setCollateralInput] = useState("");
  const [leverageInput, setLeverageInput] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [signature, setSignature] = useState<string>();

  const collateralAmount = useMemo(
    () => parseValue(collateralInput || "0", USDC_DECIMALS) ?? 0n,
    [collateralInput]
  );
  const leverage = useMemo(
    () => parseValue(leverageInput || "0", LEVERAGE_DECIMALS) ?? 0n,
    [leverageInput]
  );
  const sizeDeltaUsd = useMemo(
    () => calculateSizeDeltaUsd(collateralAmount, leverage),
    [collateralAmount, leverage]
  );

  async function submit() {
    if (!address || !wallet || collateralAmount <= 0n || leverage <= 0n || isSubmitting) return;

    setError(undefined);
    setSignature(undefined);
    setIsSubmitting(true);
    try {
      const result = await signAndSendSolanaMarketLong(getSolanaRpcClient(), wallet, {
        owner: address,
        collateralAmount,
        sizeDeltaUsd,
        config: getSolanaMarketLongConfig(),
      });
      setSignature(result.signature);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = Boolean(address && wallet && collateralAmount > 0n && leverage > 0n && !isSubmitting);

  return (
    <section className="flex min-w-0 flex-col gap-12 rounded-8 bg-slate-900 p-16">
      <div>
        <h2 className="text-16 font-medium">SOL/USD</h2>
        <p className="mt-4 text-12 text-typography-secondary">Market Long · USDC collateral</p>
      </div>

      <TradeInputField
        label="Collateral"
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
        label="Leverage"
        alternateValue={undefined}
        displayMode="usd"
        showDisplayModeToggle={false}
        unitLabel="x"
        inputValue={leverageInput}
        onInputValueChange={(event) => setLeverageInput(event.target.value)}
        placeholder="1.00"
        maxDecimals={LEVERAGE_DECIMALS}
        qa="solana-market-long-leverage"
      />

      <div className="flex items-center justify-between text-13 text-typography-secondary">
        <span>Position size</span>
        <span className="numbers text-typography-primary">${Number(sizeDeltaUsd) / 10 ** USD_DECIMALS}</span>
      </div>

      <Button variant="primary-action" size="medium" disabled={!canSubmit} onClick={submit}>
        {isSubmitting ? "Confirming..." : address ? "Open Long" : "Connect Solana Wallet"}
      </Button>

      {error ? <p className="text-12 text-red-300">{error}</p> : null}
      {signature ? <p className="break-all text-12 text-green-300">Submitted: {signature}</p> : null}
    </section>
  );
}
