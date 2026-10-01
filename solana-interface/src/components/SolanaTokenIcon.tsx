import { useMemo } from "react";

import { importImage } from "lib/legacy";

import TokenIcon from "components/TokenIcon/TokenIcon";

import { pickSolanaTokenIconSymbol } from "../lib/solanaTokenIconSymbol";

function hasTokenIcon(symbol: string): boolean {
  try {
    importImage(`ic_${symbol.toLowerCase()}.svg`);
    return true;
  } catch {
    return false;
  }
}

type Props = { symbol: string | undefined; displaySize: number; className?: string };

/** `TokenIcon` that renders nothing instead of throwing when no icon matches the GMTrade symbol. */
export function SolanaTokenIcon({ symbol, displaySize, className }: Props) {
  const iconSymbol = useMemo(() => pickSolanaTokenIconSymbol(symbol, hasTokenIcon), [symbol]);
  if (!iconSymbol) return null;
  return <TokenIcon symbol={iconSymbol} displaySize={displaySize} className={className} />;
}
