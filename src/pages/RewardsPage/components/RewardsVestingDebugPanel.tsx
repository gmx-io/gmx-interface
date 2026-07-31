import { useEffect, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { GMX_DECIMALS } from "lib/legacy";
import { formatAmountFree, parseValue } from "lib/numbers";

import Button from "components/Button/Button";

import { getRewardsVestingDebugPreset, type RewardsVestingDebugPreset } from "../rewardsVestingDebug";

const DAY_SECONDS = 24n * 60n * 60n;
const DAY_INPUT_DECIMALS = 6;
const DAY_INPUT_UNIT = 10n ** BigInt(DAY_INPUT_DECIMALS);

type DebugFormValues = {
  walletGmxBalance: string;
  walletEsGmxBalance: string;
  claimableEsGmxRewards: string;
  stakedGmxBalance: string;
  freePairAmount: string;
  pairAmount: string;
  vestedAmount: string;
  escrowedBalance: string;
  claimedAmounts: string;
  claimable: string;
  maxVestableAmount: string;
  averageStakedAmount: string;
  vestingDurationDays: string;
  gmxPrice: string;
};

type TokenField = Exclude<keyof DebugFormValues, "vestingDurationDays" | "gmxPrice">;

const TOKEN_FIELDS: { key: TokenField; label: string }[] = [
  { key: "walletGmxBalance", label: "Wallet GMX" },
  { key: "walletEsGmxBalance", label: "Wallet esGMX" },
  { key: "claimableEsGmxRewards", label: "Claimable esGMX rewards" },
  { key: "stakedGmxBalance", label: "Staked GMX" },
  { key: "freePairAmount", label: "Free staked GMX collateral" },
  { key: "pairAmount", label: "Locked GMX collateral" },
  { key: "vestedAmount", label: "Total esGMX deposited" },
  { key: "escrowedBalance", label: "esGMX vesting balance" },
  { key: "claimedAmounts", label: "Total GMX claimed" },
  { key: "claimable", label: "GMX claimable" },
  { key: "maxVestableAmount", label: "Max vestable esGMX cap" },
  { key: "averageStakedAmount", label: "Average staked GMX" },
];

function formatInputAmount(amount: bigint, decimals: number) {
  return formatAmountFree(amount, decimals, decimals);
}

function getDebugFormValues(data: RewardsVestingData): DebugFormValues {
  return {
    walletGmxBalance: formatInputAmount(data.walletGmxBalance, GMX_DECIMALS),
    walletEsGmxBalance: formatInputAmount(data.walletEsGmxBalance, GMX_DECIMALS),
    claimableEsGmxRewards: formatInputAmount(data.claimableEsGmxRewards, GMX_DECIMALS),
    stakedGmxBalance: formatInputAmount(data.stakedGmxBalance, GMX_DECIMALS),
    freePairAmount: formatInputAmount(data.freePairAmount, GMX_DECIMALS),
    pairAmount: formatInputAmount(data.vestingInfo.pairAmount, GMX_DECIMALS),
    vestedAmount: formatInputAmount(data.vestingInfo.vestedAmount, GMX_DECIMALS),
    escrowedBalance: formatInputAmount(data.vestingInfo.escrowedBalance, GMX_DECIMALS),
    claimedAmounts: formatInputAmount(data.vestingInfo.claimedAmounts, GMX_DECIMALS),
    claimable: formatInputAmount(data.vestingInfo.claimable, GMX_DECIMALS),
    maxVestableAmount: formatInputAmount(data.vestingInfo.maxVestableAmount, GMX_DECIMALS),
    averageStakedAmount: formatInputAmount(data.vestingInfo.averageStakedAmount, GMX_DECIMALS),
    vestingDurationDays: formatInputAmount((data.vestingDuration * DAY_INPUT_UNIT) / DAY_SECONDS, DAY_INPUT_DECIMALS),
    gmxPrice: data.gmxPrice === undefined ? "" : formatInputAmount(data.gmxPrice, USD_DECIMALS),
  };
}

function parseRequiredValue(value: string, decimals: number) {
  const parsedValue = parseValue(value, decimals);

  return parsedValue !== undefined && parsedValue >= 0n ? parsedValue : undefined;
}

function getDebugData(data: RewardsVestingData, values: DebugFormValues): RewardsVestingData | undefined {
  const tokenValues = Object.fromEntries(
    TOKEN_FIELDS.map(({ key }) => [key, parseRequiredValue(values[key], GMX_DECIMALS)])
  ) as Record<TokenField, bigint | undefined>;
  const durationDays = parseRequiredValue(values.vestingDurationDays, DAY_INPUT_DECIMALS);
  const gmxPrice = values.gmxPrice === "" ? undefined : parseRequiredValue(values.gmxPrice, USD_DECIMALS);

  if (
    Object.values(tokenValues).some((value) => value === undefined) ||
    durationDays === undefined ||
    (values.gmxPrice !== "" && gmxPrice === undefined)
  ) {
    return undefined;
  }

  return {
    walletGmxBalance: tokenValues.walletGmxBalance!,
    walletEsGmxBalance: tokenValues.walletEsGmxBalance!,
    claimableEsGmxRewards: tokenValues.claimableEsGmxRewards!,
    stakedGmxBalance: tokenValues.stakedGmxBalance!,
    freePairAmount: tokenValues.freePairAmount!,
    vestingInfo: {
      pairAmount: tokenValues.pairAmount!,
      vestedAmount: tokenValues.vestedAmount!,
      escrowedBalance: tokenValues.escrowedBalance!,
      claimedAmounts: tokenValues.claimedAmounts!,
      claimable: tokenValues.claimable!,
      maxVestableAmount: tokenValues.maxVestableAmount!,
      averageStakedAmount: tokenValues.averageStakedAmount!,
    },
    vestingDuration: (durationDays * DAY_SECONDS) / DAY_INPUT_UNIT,
    gmxPrice,
  };
}

function getDebugDataError(data: RewardsVestingData) {
  const totalCollateral = data.freePairAmount + data.vestingInfo.pairAmount;

  if (totalCollateral > data.stakedGmxBalance) {
    return "Free and locked GMX collateral cannot exceed Staked GMX.";
  }
}

export function RewardsVestingDebugPanel({
  data,
  onApply,
  onReset,
}: {
  data: RewardsVestingData;
  onApply: (data: RewardsVestingData) => void;
  onReset: () => void;
}) {
  const [values, setValues] = useState(() => getDebugFormValues(data));
  const [error, setError] = useState<string>();

  useEffect(() => {
    setValues(getDebugFormValues(data));
  }, [data]);

  const updateValue = (key: keyof DebugFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setError(undefined);
  };

  const applyValues = () => {
    const nextData = getDebugData(data, values);

    if (!nextData) {
      setError("Enter valid non-negative values in every required field.");
      return;
    }

    const nextError = getDebugDataError(nextData);
    if (nextError) {
      setError(nextError);
      return;
    }

    onApply(nextData);
    setError(undefined);
  };

  const applyPreset = (preset: RewardsVestingDebugPreset) => {
    onApply(getRewardsVestingDebugPreset(preset));
    setError(undefined);
  };

  const reset = () => {
    onReset();
    setError(undefined);
  };

  return (
    <section
      className="mb-12 rounded-8 border-1/2 border-blue-300/50 bg-slate-900 p-16"
      data-testid="vesting-debug-panel"
    >
      <div className="mb-16 flex flex-wrap items-center justify-between gap-12">
        <div>
          <div className="text-14 font-medium text-typography-primary">Vesting simulator</div>
          <div className="mt-2 text-12 text-typography-secondary">
            Transactions succeed locally and update these mocked values.
          </div>
        </div>
        <div className="flex flex-wrap gap-8">
          <Button variant="secondary" size="small" onClick={() => applyPreset("zero")}>
            Zero state
          </Button>
          {(["idle", "active", "complete"] as const).map((preset) => (
            <Button key={preset} variant="secondary" size="small" onClick={() => applyPreset(preset)}>
              {preset[0].toUpperCase() + preset.slice(1)}
            </Button>
          ))}
          <Button variant="secondary" size="small" onClick={reset}>
            Reset
          </Button>
          <Button variant="primary" size="small" onClick={applyValues}>
            Apply values
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-12 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {TOKEN_FIELDS.map(({ key, label }) => (
          <label key={key} className="flex min-w-0 flex-col gap-4 text-12 text-typography-secondary">
            {label}
            <input
              aria-label={label}
              inputMode="decimal"
              value={values[key]}
              onChange={(event) => updateValue(key, event.target.value)}
              className="h-36 min-w-0 rounded-4 border-1/2 border-stroke-primary bg-slate-950 px-8 text-13 text-typography-primary outline-none focus:border-blue-300"
            />
          </label>
        ))}
        <label className="flex min-w-0 flex-col gap-4 text-12 text-typography-secondary">
          Vesting duration (days)
          <input
            aria-label="Vesting duration (days)"
            inputMode="decimal"
            value={values.vestingDurationDays}
            onChange={(event) => updateValue("vestingDurationDays", event.target.value)}
            className="h-36 min-w-0 rounded-4 border-1/2 border-stroke-primary bg-slate-950 px-8 text-13 text-typography-primary outline-none focus:border-blue-300"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-4 text-12 text-typography-secondary">
          GMX price (USD)
          <input
            aria-label="GMX price (USD)"
            inputMode="decimal"
            placeholder="Unavailable"
            value={values.gmxPrice}
            onChange={(event) => updateValue("gmxPrice", event.target.value)}
            className="h-36 min-w-0 rounded-4 border-1/2 border-stroke-primary bg-slate-950 px-8 text-13 text-typography-primary outline-none focus:border-blue-300"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-12 text-12 text-red-500" role="alert">
          {error}
        </div>
      ) : null}
    </section>
  );
}
