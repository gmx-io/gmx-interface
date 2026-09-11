import { t, Trans } from "@lingui/macro";
import { lazy, Suspense, useState, type FormEvent } from "react";
import { isAddress } from "viem";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useReturnBonus, useReturnBonusVolume } from "domain/synthetics/incentives/v2/useReturnBonus";
import { formatMultiplierAdjustment } from "domain/synthetics/incentives/v2/utils";
import { formatAmountHuman, formatUsd, USD_DECIMALS } from "lib/numbers";

import IcWallet from "img/ic_wallet.svg?react";
import shield from "img/rewards-landing/shield.png";

import { ReferralCardFrame } from "./RewardsReferralCard";
import { RewardsValue } from "./RewardsValue";

const RewardsReferralWallet = lazy(() => import("./RewardsReferralWallet"));

export function ReturningTrader({
  config,
  loading,
  endpoint,
}: {
  config: IncentivesConfig | null | undefined;
  loading: boolean;
  endpoint?: string;
}) {
  const [input, setInput] = useState("");
  const [account, setAccount] = useState<string>();
  const [validationError, setValidationError] = useState<string>();
  const result = useReturnBonus(endpoint, account);
  const hasBonus = result.data != null && result.data.manualRewardRemainingUsd > 0n;
  const volume = useReturnBonusVolume(endpoint, hasBonus ? account : undefined, config?.programStartTimestamp);
  const comebackMultiplier = config?.boosts.find(({ boost }) => boost === "ManualAllocation")?.multiplier;
  const multiplier = (
    <RewardsValue loading={loading}>
      {config && comebackMultiplier !== undefined
        ? formatMultiplierAdjustment(comebackMultiplier, config.multiplierDecimals)
        : undefined}
    </RewardsValue>
  );

  function checkWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = input.trim();
    if (!isAddress(address)) {
      setValidationError(t`Enter a valid 0x wallet address`);
      return;
    }
    setValidationError(undefined);
    if (address === account) void result.mutate();
    else setAccount(address);
  }

  return (
    <section className="rewards-comeback rewards-light" id="comeback">
      <div className="rewards-container">
        <h2>
          <Trans>
            Traded on GMX before?
            <br />
            You come back at {multiplier}.
          </Trans>
        </h2>
        <form className="rewards-checker" onSubmit={checkWallet}>
          <label className="sr-only" htmlFor="rewards-address">
            <Trans>Wallet address</Trans>
          </label>
          <div className="rewards-address-field">
            <IcWallet aria-hidden="true" />
            <input
              id="rewards-address"
              value={input}
              placeholder={t`Enter your 0x wallet address`}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? "rewards-address-error" : undefined}
              onChange={(event) => {
                setInput(event.target.value);
                setValidationError(undefined);
              }}
            />
          </div>
          <button className="rewards-button" disabled={!endpoint || result.isValidating}>
            {result.isValidating ? <Trans>Checking...</Trans> : <Trans>Check wallet</Trans>}
          </button>
        </form>
        {validationError && (
          <p className="rewards-form-error" id="rewards-address-error" role="alert">
            {validationError}
          </p>
        )}
        <div className="rewards-card-grid">
          <div
            className={`rewards-bonus-card ${!account || result.isLoading ? "is-idle" : !result.error && !hasBonus ? "is-empty" : ""}`}
            aria-live="polite"
            aria-busy={result.isLoading}
          >
            {result.error && !result.isLoading ? (
              <div className="rewards-card-status" role="alert">
                <p>
                  <Trans>Unable to check this wallet. Please try again.</Trans>
                </p>
                <button className="rewards-button" onClick={() => void result.mutate()}>
                  <Trans>Try again</Trans>
                </button>
              </div>
            ) : hasBonus ? (
              <>
                <h3>
                  <Trans>Boost is yours</Trans>
                </h3>
                <p>
                  <Trans>
                    {formatUsd(result.data!.manualRewardRemainingUsd, { displayDecimals: 0 })} in comeback rewards
                    remaining
                  </Trans>
                </p>
                <img className="rewards-shield" src={shield} alt="" loading="lazy" />
                {(volume.data != null || volume.isLoading) && (
                  <p className="rewards-volume-pill">
                    <span aria-hidden="true">✓</span>{" "}
                    <Trans>
                      Your historical volume is{" "}
                      {volume.data != null ? (
                        formatAmountHuman(volume.data, USD_DECIMALS, true, 0).toUpperCase()
                      ) : (
                        <RewardsValue loading={volume.isLoading} width="6ch" />
                      )}
                    </Trans>
                  </p>
                )}
              </>
            ) : !account || result.isLoading ? (
              <>
                <h3>
                  <Trans>Your comeback starts here</Trans>
                </h3>
                <p>
                  {result.isLoading ? (
                    <>
                      <span className="sr-only">
                        <Trans>Checking your comeback bonus...</Trans>
                      </span>
                      <RewardsValue loading width="24ch" />
                    </>
                  ) : (
                    <Trans>Check your wallet to discover your bonus.</Trans>
                  )}
                </p>
                <img className="rewards-shield" src={shield} alt="" loading="lazy" />
              </>
            ) : (
              <span className="sr-only">
                <Trans>No comeback bonus remaining for this wallet.</Trans>
              </span>
            )}
          </div>
          <div className="rewards-referral-wallet">
            <Suspense
              fallback={
                <ReferralCardFrame config={config} loading={loading}>
                  <button className="rewards-button" disabled aria-busy="true">
                    <Trans>Connect wallet</Trans>
                  </button>
                </ReferralCardFrame>
              }
            >
              <RewardsReferralWallet config={config} loading={loading} />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
