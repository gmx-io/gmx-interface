import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { isAddress } from "viem";

import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useReturnBonus, useReturnBonusHistory } from "domain/synthetics/incentives/v2/useReturnBonus";
import { formatMultiplierAdjustment } from "domain/synthetics/incentives/v2/utils";
import { formatAmount, formatAmountHuman, formatUsd, USD_DECIMALS } from "lib/numbers";
import { resolveEnsAddress } from "lib/resolveEnsAddress";
import { getComebackAnalyticsParams, sendRewardsLandingEvent } from "lib/userAnalytics/rewardsLandingEvents";

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
  const [addressHighlightKey, setAddressHighlightKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const lastTrackedInput = useRef<string>();
  const [checkId, setCheckId] = useState(0);
  const lastReportedCheck = useRef<number>();
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

  function focusAddress() {
    inputRef.current?.focus();
    setAddressHighlightKey((key) => key + 1);
  }

  const onResultRevealed = useCallback(
    (hasReferralCode: boolean) => {
      if (!checked || lastReportedCheck.current === checkId) return;
      lastReportedCheck.current = checkId;
      sendRewardsLandingEvent({
        action: "ComebackBlockAction",
        type: "ResultRevealed",
        ...getComebackAnalyticsParams(result.data?.manualRewardRemainingUsd ?? 0n, hasReferralCode),
      });
    },
    [checked, checkId, result.data?.manualRewardRemainingUsd]
  );

  function trackAddressEntered() {
    const value = input.trim();
    if (!value || value === lastTrackedInput.current) return;
    lastTrackedInput.current = value;
    sendRewardsLandingEvent({ action: "ComebackBlockAction", type: "AddressEntered" });
  }

  async function checkWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    trackAddressEntered();
    sendRewardsLandingEvent({ action: "ComebackBlockAction", type: "CheckClicked" });
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
    setCheckId((current) => current + 1);
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
      className={cx(
        "px-0 py-[120px] text-slate-900 [--rewards-skeleton-base:#090a140d] [--rewards-skeleton-highlight:#090a141a]",
        "[background:#fff]",
        "max-mobile:px-0 max-mobile:py-40",
        "max-mobile:[&_.rewards-card-grid>.rewards-spoiler>.rewards-spoiler-source]:absolute",
        "max-mobile:[&_.rewards-card-grid>.rewards-spoiler>.rewards-spoiler-source]:inset-0",
        "max-mobile:[&_.rewards-card-grid>.rewards-spoiler]:h-auto max-mobile:[&_.rewards-card-grid>.rewards-spoiler]:min-h-0",
        "max-mobile:[&_.rewards-card-grid>.rewards-spoiler]:[aspect-ratio:1]",
        "max-mobile:[&_.rewards-card-grid[data-checked='false']>.rewards-referral-wallet]:hidden",
        "[&_.rewards-card-grid[data-checked='true']>*]:animate-[rewards-card-reveal_0.4s_ease-out]",
        "motion-reduce:[&_.rewards-card-grid[data-checked='true']>*]:animate-none",
        "[&_h2]:mb-48",
        "max-mobile:[&_h2]:mb-16 max-mobile:[&_h2]:text-[40px] max-mobile:[&_h2]:leading-[48px] max-mobile:[&_h2]:tracking-[-0.03em]",
        checked && !hasBonus ? "rewards-comeback-muted [&.rewards-comeback-muted]:[background:#f4f5f9]" : ""
      )}
      id="comeback"
    >
      <div className="rewards-container relative ml-auto mr-auto w-[min(1200px,_calc(100%_-_80px))] max-mobile:w-[calc(100%_-_32px)]">
        <h2>
          <Trans>
            Traded on GMX before?
            <br />
            You come back at {multiplier}.
          </Trans>
        </h2>
        <form
          className={cx(
            "mb-48 flex gap-12",
            "[&_input]:text-18 [&_input]:h-60 [&_input]:w-full [&_input]:rounded-8 [&_input]:pb-0 [&_input]:pl-60 [&_input]:pr-20 [&_input]:pt-0",
            "[&_input]:text-slate-900 [&_input]:[background:#fff] [&_input]:[border:1px_solid_#bec0da] [&_input]:[caret-color:#2d42fc]",
            "max-mobile:[&_input]:text-18 max-mobile:[&_input]:pb-0 max-mobile:[&_input]:pl-60 max-mobile:[&_input]:pr-20 max-mobile:[&_input]:pt-0",
            "max-mobile:[&_input]:shadow-[0_6px_8px_-6px_#bec0da]",
            "max-mobile:mb-16 max-mobile:flex-col max-mobile:gap-8",
            "[&_.rewards-button]:min-h-60",
            "max-mobile:[&_.rewards-button]:px-20 max-mobile:[&_.rewards-button]:py-10 max-mobile:[&_.rewards-button]:text-16",
            "[&_input::placeholder]:text-slate-500",
            "[&_input:focus]:border-blue-400 [&_input:focus]:shadow-[0_0_0_2px_#2d42fc1a] [&_input:focus]:[outline:none]",
            "[&_input[aria-invalid='true']]:border-[#a51b45]"
          )}
          onSubmit={(event) => void checkWallet(event)}
        >
          <label className="sr-only" htmlFor="rewards-address">
            <Trans>Wallet address</Trans>
          </label>
          <div
            className={cx(
              "relative min-w-0 flex-1",
              "[&:not(:focus-within)_.rewards-address-highlight]:hidden",
              "[&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:left-20 [&>svg]:top-18 [&>svg]:h-24 [&>svg]:w-24 [&>svg]:text-blue-400",
              "max-mobile:[&>svg]:left-20 max-mobile:[&>svg]:top-18 max-mobile:[&>svg]:h-24 max-mobile:[&>svg]:w-24"
            )}
          >
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
              onBlur={() => {
                setAddressHighlightKey(0);
                trackAddressEntered();
              }}
              onChange={(event) => {
                requestId.current += 1;
                setInput(event.target.value);
                setResolving(false);
                setValidationError(undefined);
              }}
            />
            {addressHighlightKey > 0 && (
              <span
                key={addressHighlightKey}
                className={cx(
                  "rewards-address-highlight pointer-events-none absolute inset-0 animate-[rewards-address-blink_1.6s_ease-in-out] rounded-8 opacity-[0]",
                  "shadow-[0_0_0_6px_#2d42fc26,_0_0_28px_#2d42fc59] [border:2px_solid_#2d42fc]",
                  "motion-reduce:hidden"
                )}
                aria-hidden="true"
              />
            )}
          </div>
          <button
            className={cx(
              "rewards-button inline-flex min-h-44 items-center justify-center gap-8 rounded-8 px-20 py-14 text-center text-16 font-medium leading-[24px]",
              "tracking-[-0.032em] text-white [background:var(--rewards-blue)]",
              "[&:disabled]:cursor-default [&:disabled]:opacity-[0.55]"
            )}
            disabled={!endpoint || !config || resolving || result.isValidating}
          >
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
          <p
            className="mb-24 ml-0 mr-0 mt-[-32px] text-[#a51b45] max-mobile:mt-0 max-mobile:text-[13px]"
            id="rewards-address-error"
            role="alert"
          >
            {validationError}
          </p>
        )}
        <div
          className="rewards-card-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-24 max-mobile:grid-cols-[1fr] max-mobile:gap-20"
          data-checked={checked}
        >
          {result.error && !checking ? (
            <div
              className={cx(
                "relative flex min-h-[477px] flex-col items-center overflow-hidden rounded-20 pb-24 pl-32 pr-32 pt-32 text-center",
                "text-white [--rewards-skeleton-base:#b4bbff1a] [--rewards-skeleton-highlight:#b4bbff33]",
                "[background:url('../../src/img/rewards-landing/lines.svg')_center_142px_/_100%_auto_no-repeat,_url('../../src/img/rewards-landing/bonus-background.svg')_center_/_cover_no-repeat,_#090a14]",
                "[&_h3]:text-50 [&_h3]:mb-8 [&_h3]:leading-[0.98] [&_h3]:tracking-[-0.04em]",
                "[&>p]:text-18 [&>p]:font-medium [&>p]:leading-[1.36] [&>p]:text-slate-500",
                "max-mobile:[&_h3]:text-34",
                "max-tablet:px-24 max-tablet:py-28",
                "max-mobile:min-h-[430px] max-mobile:px-20 max-mobile:py-28",
                "max-mobile:[&>p]:text-15",
                "max-tablet:[&_h3]:text-[36px]"
              )}
            >
              <div className="m-auto [&_button]:mt-20" role="alert">
                <p>
                  <Trans>Unable to check this wallet. Please try again.</Trans>
                </p>
                <button
                  className={cx(
                    "rewards-button inline-flex min-h-44 items-center justify-center gap-8 rounded-8 px-20 py-14 text-center text-16 font-medium leading-[24px]",
                    "tracking-[-0.032em] text-white [background:var(--rewards-blue)]",
                    "[&:disabled]:cursor-default [&:disabled]:opacity-[0.55]"
                  )}
                  onClick={() => void result.mutate()}
                >
                  <Trans>Try again</Trans>
                </button>
              </div>
            </div>
          ) : !checked ? (
            <RewardsSpoiler onFocusAddress={checking ? undefined : focusAddress} blurRadius={12}>
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
          <div className="rewards-referral-wallet min-w-0 [&_.rewards-referral-card]:h-full">
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
                  rewardsUsd={result.data?.manualRewardRemainingUsd}
                  onResultRevealed={onResultRevealed}
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
    <div
      className={cx(
        "relative flex min-h-[477px] flex-col items-center justify-between gap-20 overflow-hidden rounded-20",
        "p-32 text-center text-white [--rewards-skeleton-base:#b4bbff1a] [--rewards-skeleton-highlight:#b4bbff33]",
        "[background-position:center_112px,_center]",
        "[background:url('../../src/img/rewards-landing/lines.svg')_center_142px_/_100%_auto_no-repeat,_url('../../src/img/rewards-landing/bonus-background.svg')_center_/_cover_no-repeat,_#090a14]",
        "[&_h3]:text-50 [&_h3]:mb-8 [&_h3]:leading-[0.98] [&_h3]:tracking-[-0.04em]",
        "[&>p]:text-18 [&>p]:font-medium [&>p]:leading-[1.36] [&>p]:text-slate-500",
        "max-mobile:[&_h3]:text-34",
        "max-tablet:px-24 max-tablet:py-28",
        "max-mobile:min-h-[430px] max-mobile:px-20 max-mobile:py-28",
        "max-mobile:[&>p]:text-15",
        "max-tablet:[&_h3]:text-[36px]"
      )}
      aria-live="polite"
      aria-busy={loading}
    >
      <div className="flex w-full flex-col items-center gap-8">
        <p className="text-12 leading-[1.36] text-blue-100 [overflow-wrap:anywhere]" data-qa="rewards-checked-address">
          <RewardsValue loading={loading} width="32ch">
            {account}
          </RewardsValue>
        </p>
        <div className="inline-block rounded-20 bg-[#090a1480] py-4 pl-4 pr-8 text-14 leading-[20px] text-blue-100">
          <span
            aria-hidden="true"
            className="mr-4 inline-grid size-20 place-items-center rounded-full bg-blue-400 text-white"
          >
            <IcHistoricalVolume className="size-14" />
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
      <div
        className={cx(
          "relative h-[250px] w-[250px] shrink-0 overflow-hidden",
          "max-mobile:h-[250px] max-mobile:w-[250px]",
          "[&_img]:absolute [&_img]:left-[-6.93%] [&_img]:top-[-6.92%] [&_img]:h-[113.92%] [&_img]:w-[113.52%] [&_img]:max-w-none"
        )}
      >
        <img src={shield} alt="" />
      </div>
      <div className="[&_p]:text-18 [&_h3]:text-[40px] [&_p]:leading-[1.36] [&_p]:text-blue-100 max-mobile:[&_p]:text-15 [&_strong]:font-medium [&_strong]:text-white">
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
    <div
      className={cx(
        "relative flex min-h-[477px] flex-col items-center overflow-hidden rounded-20 pb-0 pl-0 pr-0 pt-32",
        "text-center text-white shadow-[inset_0_-16px_60px_12px_#2d42fc66] [--rewards-skeleton-base:#b4bbff1a]",
        "[--rewards-skeleton-highlight:#b4bbff33] [background:url('../../src/img/rewards-landing/bonus-background.svg')_center_/_cover,_#090a14]",
        "[&_h3]:text-50 [&_h3]:mb-8 [&_h3]:leading-[1.2] [&_h3]:tracking-[-0.04em]",
        "[&>p]:text-18 [&>p]:font-medium [&>p]:leading-[1.36] [&>p]:text-slate-500",
        "max-mobile:[&_h3]:text-34",
        "max-tablet:px-24 max-tablet:py-28",
        "max-mobile:min-h-[430px] max-mobile:pb-0 max-mobile:pl-0 max-mobile:pr-0 max-mobile:pt-28",
        "max-mobile:[&>p]:text-15",
        "max-tablet:[&_h3]:text-[36px]"
      )}
      aria-live="polite"
      aria-busy={historyLoading}
    >
      <div
        className={cx(
          "w-full px-24 py-0 text-blue-100",
          "[&_h3]:text-transparent [&_h3]:[background-clip:text] [&_h3]:[background-image:linear-gradient(170deg,_#a4c3f9_15%,_#2d42fc_205%)]",
          "[&_p]:text-18 [&_p]:leading-[1.36]",
          "max-mobile:[&_p]:text-15"
        )}
      >
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
            <button
              className={cx(
                "rewards-button inline-flex min-h-44 items-center justify-center gap-8 rounded-8 px-20 py-14 text-center text-16 font-medium leading-[24px]",
                "tracking-[-0.032em] text-white [background:var(--rewards-blue)]",
                "[&:disabled]:cursor-default [&:disabled]:opacity-[0.55]"
              )}
              onClick={onRetryHistory}
            >
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
      <div
        className={cx(
          "text-18 mt-64 flex flex-col items-center gap-8 px-16 py-0 leading-[24px] text-blue-100",
          "max-mobile:mt-40 max-mobile:text-15",
          "[&_p>span[aria-hidden]]:mr-8 [&_p>span[aria-hidden]]:inline-grid [&_p>span[aria-hidden]]:h-24 [&_p>span[aria-hidden]]:w-24",
          "[&_p>span[aria-hidden]]:place-items-center [&_p>span[aria-hidden]]:rounded-full [&_p>span[aria-hidden]]:text-white",
          "[&_p>span[aria-hidden]]:shadow-[inset_0_0_8px_#fff6] [&_p>span[aria-hidden]]:[background:#2d42fc]",
          "[&_p]:rounded-24 [&_p]:pb-8 [&_p]:pl-8 [&_p]:pr-16 [&_p]:pt-8 [&_p]:[background:#090a1480]"
        )}
      >
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
      <div className="pointer-events-none relative min-h-[160px] w-full flex-1" aria-hidden="true">
        <div
          className={cx(
            "absolute flex items-end gap-8 [inset:0_32px]",
            "[&_i:first-child]:shadow-[0_0_12px_#2d42fc,_inset_0_0_8px_#fff6]",
            "[&_i]:flex-1 [&_i]:[background:linear-gradient(#2d42fc,_#1b2796)] [&_i]:[border-radius:4px_4px_0_0] [&_i]:[border:1px_solid_#7885ff]"
          )}
        >
          {BAR_STYLES.map((style) => (
            <i key={style.height} style={style} />
          ))}
        </div>
        <img className="absolute bottom-40 h-[119px] w-full" src={freshCurve} alt="" />
        <img className="absolute bottom-24 left-40 h-36 w-36" src={freshDot} alt="" />
      </div>
    </div>
  );
}
