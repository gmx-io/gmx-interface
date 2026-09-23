import { Trans } from "@lingui/macro";
import { useMemo, useState } from "react";

import { formatUsd } from "lib/numbers";

import { Amount } from "components/Amount/Amount";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

import { useSolanaAssets } from "./useSolanaAssets";
import { useSolanaWallet } from "./useSolanaWallet";

export function SolanaAssetsList() {
  const { address } = useSolanaWallet();
  const { status, error, rows } = useSolanaAssets(address);
  const [searchQuery, setSearchQuery] = useState("");
  const visibleRows = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return rows
      .filter((row) => `${row.symbol} ${row.name} ${row.mint}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (a.balanceUsd !== b.balanceUsd) return a.balanceUsd < b.balanceUsd ? 1 : -1;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [rows, searchQuery]);

  if (status === "loading") {
    return (
      <div className="p-adaptive text-typography-secondary">
        <Trans>Loading...</Trans>
      </div>
    );
  }

  if (status === "error") {
    return (
      <p role="alert" className="p-adaptive text-red-500">
        {error}
      </p>
    );
  }

  return (
    <div className="flex grow flex-col overflow-y-hidden">
      <div className="px-adaptive">
        <SearchInput value={searchQuery} setValue={setSearchQuery} noBorder />
      </div>
      <VerticalScrollFadeContainer className="flex grow flex-col overflow-y-auto pt-12">
        {visibleRows.map((row) => (
          <div
            key={row.mint}
            className="flex items-center justify-between px-adaptive py-8 gmx-hover:bg-fill-surfaceElevated50"
          >
            <div className="flex items-center gap-16">
              <TokenIcon symbol={row.symbol === "WSOL" ? "SOL" : row.symbol} displaySize={40} />
              <div>{row.symbol}</div>
            </div>
            <div className="text-right">
              <Amount className="text-body-large" amount={row.amount} decimals={row.decimals} isStable={false} />
              <div className="text-body-small text-typography-secondary numbers">{formatUsd(row.balanceUsd)}</div>
            </div>
          </div>
        ))}
        {visibleRows.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center p-adaptive text-typography-secondary">
            {searchQuery ? <Trans>No assets found</Trans> : <Trans>No assets in your wallet</Trans>}
          </div>
        )}
      </VerticalScrollFadeContainer>
    </div>
  );
}
