import { t } from "@lingui/macro";
import cx from "classnames";
import { useCopyToClipboard } from "react-use";
import { parseUnits } from "viem";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentiveDistributionRow } from "domain/synthetics/incentives/v2/types";
import { GMX_DECIMALS } from "lib/legacy";
import { formatTokenAmount, formatUsd, USD_DECIMALS } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CheckIcon from "img/ic_check.svg?react";
import CopyIcon from "img/ic_copy.svg?react";

type AmountColumn = Exclude<keyof IncentiveDistributionRow, "wallet">;

const COLUMN_DECIMALS: Record<AmountColumn, number> = {
  esGMX: ES_GMX_DECIMALS,
  GT: GT_DECIMALS,
  volume_usd: USD_DECIMALS,
  volume_multiplier: 2,
  staking_gmx: GMX_DECIMALS,
  staking_multiplier: 2,
  total_multiplier: 2,
  eligible_referral_volume_usd: USD_DECIMALS,
  eligible_fees_usd: USD_DECIMALS,
};

export function IncentivesDistributionAmount({
  column,
  value,
  className,
}: {
  column: AmountColumn;
  value: string;
  className?: string;
}) {
  if (!value) return <span className="text-typography-secondary">—</span>;

  const isMultiplier = column.endsWith("_multiplier");
  const isUsd = column.endsWith("_usd");
  const decimals = COLUMN_DECIMALS[column];
  const amount = parseUnits(value, decimals);
  const formatted = isMultiplier
    ? `${value}×`
    : isUsd
      ? formatUsd(amount)
      : formatTokenAmount(amount, decimals, undefined, {
          displayDecimals: 4,
          minThreshold: "0.0001",
          useCommas: true,
        });

  return (
    <TooltipWithPortal
      as="span"
      tabIndex={0}
      variant="none"
      position="top-end"
      className={cx("IncentivesDistribution-amount", className, {
        "text-typography-secondary": amount === 0n,
        "IncentivesDistribution-multiplier": column === "total_multiplier" && amount > 0n,
      })}
      content={
        <span className="break-all font-mono text-13">
          {value}
          {isMultiplier ? "×" : isUsd ? " USD" : ""}
        </span>
      }
    >
      {formatted}
    </TooltipWithPortal>
  );
}

export function IncentivesDistributionWallet({ address }: { address: string }) {
  const [copyState, copyToClipboard] = useCopyToClipboard();
  const copied = copyState.value === address && !copyState.error;

  return (
    <TooltipWithPortal
      variant="none"
      position="top-start"
      disableClickToggle
      shouldPreventDefault={false}
      content={<span className="break-all font-mono text-13">{address}</span>}
    >
      <button
        type="button"
        className="IncentivesDistribution-wallet"
        aria-label={`${t`Copy address`}: ${address}`}
        title={copied ? t`Copied` : undefined}
        onClick={() => copyToClipboard(address)}
      >
        <AddressView address={address} size={24} breakpoint="XL" noLink />
        {copied ? (
          <CheckIcon className="size-16 text-green-500" />
        ) : (
          <CopyIcon className="size-16 text-typography-secondary" />
        )}
      </button>
    </TooltipWithPortal>
  );
}
