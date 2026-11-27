import { formatAmount, formatUsd } from "lib/numbers";

import TokenIcon from "components/TokenIcon/TokenIcon";

import { LP_TOKEN_DECIMALS, type GtStakeToken } from "../gtPointsTypes";

export function getStakeTokenName(token: GtStakeToken) {
  return token.kind === "GM" ? `GM: ${token.name}` : `GLV (${token.name})`;
}

const TEN_TOKENS = 10n * 10n ** BigInt(LP_TOKEN_DECIMALS);

// 5 decimals for small amounts (as in the wireframe), 2 from 10 tokens up.
export function formatLpAmount(amount: bigint, token: GtStakeToken) {
  return `${formatAmount(amount, LP_TOKEN_DECIMALS, amount < TEN_TOKENS ? 5 : 2, true)} ${token.kind}`;
}

export function formatUsdValue(usd: bigint) {
  return formatUsd(usd, { displayDecimals: 2 }) ?? "–";
}

// Token icon with the pool tokens as a badge, the name, and the pool on a second line — as in the wireframe.
export function StakeTokenLabel({ token, size = 32 }: { token: GtStakeToken; size?: number }) {
  return (
    <span className="inline-flex min-w-max items-center gap-10">
      <TokenIcon
        symbol={token.iconSymbol}
        displaySize={size}
        badge={[token.poolTokens[0].toLowerCase(), token.poolTokens[1].toLowerCase()] as const}
      />
      <span className="flex flex-col">
        <span className="text-body-medium font-medium text-typography-primary">{getStakeTokenName(token)}</span>
        <span className="text-body-small text-typography-secondary">
          [{token.poolTokens[0]}-{token.poolTokens[1]}]
        </span>
      </span>
    </span>
  );
}
