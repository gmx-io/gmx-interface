import { t, Trans } from "@lingui/macro";
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { isAddress } from "viem";

import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useReturnBonus, useReturnBonusHistory } from "domain/synthetics/incentives/v2/useReturnBonus";
import { formatMultiplierAdjustment } from "domain/synthetics/incentives/v2/utils";
import { formatAmount, formatAmountHuman, formatUsd, USD_DECIMALS } from "lib/numbers";
import { resolveEnsAddress } from "lib/resolveEnsAddress";

import IcWallet from "img/ic_wallet.svg?react";
import freshCurve from "img/rewards-landing/fresh-curve.svg";
import freshDot from "img/rewards-landing/fresh-dot.svg";
import IcHistoricalVolume from "img/rewards-landing/historical-volume.svg?react";
import shield from "img/rewards-landing/shield.png";

import { ReferralCardFrame } from "./RewardsReferralCard";
import { RewardsSpoiler } from "./RewardsSpoiler";
import { RewardsValue } from "./RewardsValue";

const RewardsReferralWallet = lazy(() => import("./RewardsReferralWallet"));
const BAR_STYLES = [17, 20, 28, 38, 50, 65, 85, 105, 131].map((height, index) => ({
  height,
  opacity: index === 0 ? 1 : index / 10,
}));

type Props = { config: IncentivesConfig | null | undefined; loading: boolean; endpoint?: string };

export function ReturningTrader({ config, loading, endpoint }: Props) {
  const [input, setInput] = useState("");
  const [account, setAccount] = useState<string>();
  const [validationError, setValidationError] = useState<string>();
  const [resolving, setResolving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const result = useReturnBonus(endpoint, account);
  const history = useReturnBonusHistory(endpoint, account, config?.programStartTimestamp);
  const hasBonus = result.data != null && result.data.manualRewardRemainingUsd > 0n;
  const checking = resolving || result.isValidating;
  const checked = Boolean(account && result.data !== undefined && !result.error && !checking);
  const comebackMultiplier = config?.boosts.find(({ boost }) => boost === "ManualAllocation")?.multiplier;
  const multiplier = (
    <RewardsValue loading={loading}>
      {config && comebackMultiplier !== undefined
        ? formatMultiplierAdjustment(comebackMultiplier, config.multiplierDecimals)
        : undefined}
    </RewardsValue>
  );

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    []
  );

  async function checkWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    const id = ++requestId.current;
    setValidationError(undefined);
    let address = value;
    if (!isAddress(address)) {
      if (!value.includes(".") || value.startsWith("0x")) {
        setValidationError(t`Enter a valid wallet address or ENS name`);
        return;
      }
      setResolving(true);
      try {
        const resolved = await resolveEnsAddress(value);
        if (id !== requestId.current) return;
        if (!resolved) {
          setValidationError(t`No wallet address was found for this ENS name`);
          return;
        }
        address = resolved;
      } catch (_error) {
        if (id === requestId.current) setValidationError(t`Unable to resolve this ENS name. Please try again.`);
        return;
      } finally {
        if (id === requestId.current) setResolving(false);
      }
    }
    if (address === account) {
      void result.mutate();
      void history.mutate();
    } else {
      setAccount(address);
    }
  }

  const initialReferral = (
    <ReferralCardFrame config={config} loading={loading}>
      <RewardsValue loading width="100%" height={40} />
    </ReferralCardFrame>
  );

  return (
    <section
      className={`rewards-comeback rewards-light ${checked && !hasBonus ? "rewards-comeback-muted" : ""}`}
      id="comeback"
    >
      <div className="rewards-container">
        <h2>
          <Trans>
            Traded on GMX before?
            <br />
            You come back at {multiplier}.
          </Trans>
        </h2>
        <form className="rewards-checker" onSubmit={(event) => void checkWallet(event)}>
          <label className="sr-only" htmlFor="rewards-address">
            <Trans>Wallet address</Trans>
          </label>
          <div className="rewards-address-field">
            <IcWallet aria-hidden="true" />
            <input
              ref={inputRef}
              id="rewards-address"
              value={input}
              placeholder={t`Enter any wallet address or ENS`}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? "rewards-address-error" : undefined}
              onChange={(event) => {
                requestId.current += 1;
                setInput(event.target.value);
                setResolving(false);
                setValidationError(undefined);
              }}
            />
          </div>
          <button className="rewards-button" disabled={!endpoint || !config || resolving || result.isValidating}>
            {resolving ? (
              <Trans>Resolving...</Trans>
            ) : result.isValidating ? (
              <Trans>Checking...</Trans>
            ) : (
              <Trans>Check wallet</Trans>
            )}
          </button>
        </form>
        {validationError && (
          <p className="rewards-form-error" id="rewards-address-error" role="alert">
            {validationError}
          </p>
        )}
        <div className="rewards-card-grid">
          {result.error && !checking ? (
            <div className="rewards-bonus-card">
              <div className="rewards-card-status" role="alert">
                <p>
                  <Trans>Unable to check this wallet. Please try again.</Trans>
                </p>
                <button className="rewards-button" onClick={() => void result.mutate()}>
                  <Trans>Try again</Trans>
                </button>
              </div>
            </div>
          ) : !checked ? (
            <RewardsSpoiler onFocusAddress={checking ? undefined : () => inputRef.current?.focus()}>
              <BonusCard loading />
            </RewardsSpoiler>
          ) : hasBonus ? (
            <BonusCard
              account={account}
              loading={false}
              remaining={result.data?.manualRewardRemainingUsd}
              volume={history.data?.lifetimeVolume}
              loadingVolume={history.isLoading}
              volumeError={Boolean(history.error)}
              onRetryVolume={() => void history.mutate()}
            />
          ) : (
            <FreshCard
              config={config}
              loading={loading}
              exhausted={(result.data?.manualRewardCapUsd ?? 0n) > 0n}
              hasHistory={history.data?.hasHistory}
              historyLoading={history.isLoading}
              historyError={Boolean(history.error)}
              onRetryHistory={() => void history.mutate()}
            />
          )}
          <div className="rewards-referral-wallet">
            {checked ? (
              <Suspense
                fallback={
                  <ReferralCardFrame config={config} loading={loading}>
                    <RewardsValue loading width="100%" height={40} />
                  </ReferralCardFrame>
                }
              >
                <RewardsReferralWallet
                  key={account}
                  account={account!}
                  config={config}
                  loading={loading}
                  hasBonus={hasBonus}
                />
              </Suspense>
            ) : (
              <RewardsSpoiler>{initialReferral}</RewardsSpoiler>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BonusCard({
  account,
  loading,
  remaining,
  volume,
  loadingVolume = false,
  volumeError,
  onRetryVolume,
}: {
  account?: string;
  loading: boolean;
  remaining?: bigint;
  volume?: bigint | null;
  loadingVolume?: boolean;
  volumeError?: boolean;
  onRetryVolume?: () => void;
}) {
  return (
    <div className="rewards-bonus-card rewards-eligible-card" aria-live="polite" aria-busy={loading}>
      <div className="rewards-bonus-wallet">
        <p className="rewards-checked-address">
          <RewardsValue loading={loading} width="32ch">
            {account}
          </RewardsValue>
        </p>
        <div className="rewards-volume-pill">
          <span aria-hidden="true">
            <IcHistoricalVolume />
          </span>
          {volumeError ? (
            <button type="button" onClick={onRetryVolume}>
              <Trans>Retry historical volume</Trans>
            </button>
          ) : (
            <Trans>
              Your historical volume is{" "}
              <RewardsValue loading={loading || loadingVolume} width="4ch">
                {volume != null ? formatAmountHuman(volume, USD_DECIMALS, true, 0).toUpperCase() : undefined}
              </RewardsValue>
            </Trans>
          )}
        </div>
      </div>
      <div className="rewards-shield">
        <img src={shield} alt="" />
      </div>
      <div className="rewards-bonus-reward">
        <h3>
          <Trans>On every trade</Trans>
        </h3>
        <p>
          <Trans>
            applied up to{" "}
            <strong>
              <RewardsValue loading={loading} width="6ch">
                {remaining !== undefined ? formatUsd(remaining, { displayDecimals: 0 }) : undefined}
              </RewardsValue>{" "}
              in rewards
            </strong>
          </Trans>
        </p>
      </div>
    </div>
  );
}

function FreshCard({
  config,
  loading,
  exhausted,
  hasHistory,
  historyLoading,
  historyError,
  onRetryHistory,
}: {
  config: Props["config"];
  loading: boolean;
  exhausted: boolean;
  hasHistory?: boolean;
  historyLoading: boolean;
  historyError: boolean;
  onRetryHistory: () => void;
}) {
  const stakingTier = config?.stakingTiers.find(({ multiplier }) => multiplier > 0n);
  return (
    <div className="rewards-bonus-card rewards-fresh-card" aria-live="polite" aria-busy={historyLoading}>
      <div className="rewards-fresh-heading">
        {exhausted ? (
          <>
            <h3>
              <Trans>Your comeback boost is fully used</Trans>
            </h3>
            <p>
              <Trans>Keep earning with staking, volume tiers and other boosts.</Trans>
            </p>
          </>
        ) : historyError ? (
          <>
            <h3>
              <Trans>Keep building your rewards</Trans>
            </h3>
            <button className="rewards-button" onClick={onRetryHistory}>
              <Trans>Retry historical volume</Trans>
            </button>
          </>
        ) : historyLoading || hasHistory === undefined ? (
          <>
            <h3>
              <RewardsValue loading width="12ch" />
            </h3>
            <p>
              <RewardsValue loading width="25ch" />
            </p>
          </>
        ) : hasHistory ? (
          <>
            <h3>
              <Trans>Keep building your rewards</Trans>
            </h3>
            <p>
              <Trans>This wallet has no comeback allocation.</Trans>
            </p>
          </>
        ) : (
          <>
            <h3>
              <Trans>You're starting fresh</Trans>
            </h3>
            <p>
              <Trans>No history here yet, so no comeback boost.</Trans>
            </p>
          </>
        )}
      </div>
      <div className="rewards-fresh-tips">
        <p>
          <span aria-hidden="true">→</span>
          <Trans>
            Stake just{" "}
            <RewardsValue loading={loading} width="2ch">
              {stakingTier ? formatAmount(stakingTier.threshold, ES_GMX_DECIMALS, 0, true) : undefined}
            </RewardsValue>{" "}
            GMX to start at{" "}
            <RewardsValue loading={loading} width="2ch">
              {config && stakingTier
                ? formatMultiplierAdjustment(stakingTier.multiplier, config.multiplierDecimals)
                : undefined}
            </RewardsValue>
          </Trans>
        </p>
        <p>
          <span aria-hidden="true">→</span>
          <Trans>Your volume tier builds from the first epoch</Trans>
        </p>
      </div>
      <div className="rewards-fresh-chart" aria-hidden="true">
        <div className="rewards-fresh-bars">
          {BAR_STYLES.map((style) => (
            <i key={style.height} style={style} />
          ))}
        </div>
        <img className="rewards-fresh-curve" src={freshCurve} alt="" />
        <img className="rewards-fresh-dot" src={freshDot} alt="" />
      </div>
    </div>
  );
}
