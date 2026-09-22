import { Trans, t } from "@lingui/macro";
import { useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useCopyToClipboard } from "react-use";

import { useGmxAccountAvailableAssetsFilter, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useDisconnectAndClose } from "domain/multichain/useDisconnectAndClose";
import { formatUsd } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";

import { Amount } from "components/Amount/Amount";
import Button from "components/Button/Button";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CheckIcon from "img/ic_check.svg?react";
import ChevronLeftIcon from "img/ic_chevron_left.svg?react";
import CopyIcon from "img/ic_copy.svg?react";
import ExplorerIcon from "img/ic_explorer.svg?react";
import DisconnectIcon from "img/ic_sign_out_20.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";
import solanaIcon from "img/tokens/ic_sol.svg";

import { useSolanaAssets } from "./useSolanaAssets";
import { useSolanaWallet } from "./useSolanaWallet";

const ICON_BUTTON =
  "flex size-28 -m-4 items-center justify-center rounded-8 text-typography-secondary gmx-hover:bg-fill-surfaceHover gmx-hover:text-typography-primary";

function solanaExplorerUrl(address: string) {
  return `https://solscan.io/account/${address}`;
}

export function SolanaAddressButton({ account }: { account: string }) {
  const [, setModalOpen] = useGmxAccountModalOpen();

  return (
    <Button
      variant="secondary"
      type="button"
      size="controlled"
      className="h-32 px-12 md:h-40"
      onClick={() => setModalOpen(true)}
    >
      <span className="flex items-center gap-8">
        <img src={solanaIcon} alt="" className="size-16 rounded-full md:size-24" />
        {shortenAddressOrEns(account, 13)}
      </span>
    </Button>
  );
}

export function SolanaWalletSummary({ account }: { account: string }) {
  const [, setModalView] = useGmxAccountModalOpen();
  const [, setAvailableAssetsFilter] = useGmxAccountAvailableAssetsFilter();
  const [, copyToClipboard] = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<number | undefined>(undefined);
  const handleDisconnect = useDisconnectAndClose();
  const { status, totalUsd } = useSolanaAssets(account);

  useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

  return (
    <div className="flex flex-col gap-6 rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12">
      <div className="flex items-center justify-between gap-8">
        <button
          className="flex items-center gap-8 text-typography-secondary gmx-hover:text-typography-primary"
          onClick={() => {
            copyToClipboard(account);
            clearTimeout(copyTimeoutRef.current);
            setIsCopied(true);
            copyTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1000);
          }}
        >
          <WalletIcon className="size-20" />
          <span className="text-12 font-medium">{shortenAddressOrEns(account, 13)}</span>
          {isCopied ? <CheckIcon className="size-16 text-green-500" /> : <CopyIcon className="size-16" />}
        </button>
        <div className="flex items-center gap-8">
          <TooltipWithPortal
            shouldPreventDefault={false}
            content={t`View in explorer`}
            position="bottom"
            tooltipClassName="!min-w-max"
            variant="none"
          >
            <a href={solanaExplorerUrl(account)} target="_blank" rel="noopener noreferrer" className={ICON_BUTTON}>
              <ExplorerIcon className="size-16" />
            </a>
          </TooltipWithPortal>
          <TooltipWithPortal content={t`Disconnect`} position="bottom" tooltipClassName="!min-w-max" variant="none">
            <button className={ICON_BUTTON} onClick={handleDisconnect}>
              <DisconnectIcon className="size-16" />
            </button>
          </TooltipWithPortal>
        </div>
      </div>
      <button
        className="flex min-h-32 items-center gap-4"
        onClick={() => {
          setAvailableAssetsFilter("wallet");
          setModalView("availableToTradeAssets");
        }}
      >
        {status === "loading" ? (
          <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={100} height={30} className="!block" inline />
        ) : totalUsd !== undefined ? (
          <span className="text-h2 normal-nums leading-[30px]">{formatUsd(totalUsd)}</span>
        ) : null}
        <ChevronLeftIcon className="size-16 rotate-180 text-typography-secondary" />
      </button>
    </div>
  );
}

export function SolanaAssetsList() {
  const { address } = useSolanaWallet();
  const { status, error, rows } = useSolanaAssets(address);
  const [searchQuery, setSearchQuery] = useState("");
  const visibleRows = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return rows
      .filter((row) => `${row.symbol} ${row.name} ${row.mint}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (a.balanceUsd !== undefined && b.balanceUsd === undefined) return -1;
        if (a.balanceUsd === undefined && b.balanceUsd !== undefined) return 1;
        if (a.balanceUsd !== undefined && b.balanceUsd !== undefined) return a.balanceUsd < b.balanceUsd ? 1 : -1;
        return 0;
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
          <div key={row.mint} className="flex items-center justify-between px-adaptive py-8 gmx-hover:bg-fill-surfaceElevated50">
            <div className="flex items-center gap-16">
              {row.symbol === "SOL" ? <TokenIcon symbol="SOL" displaySize={40} /> : null}
              <div>
                <div>{row.symbol === "SOL" ? row.symbol : shortenAddressOrEns(row.mint, 13)}</div>
                <div className="text-body-small text-typography-secondary">{row.name}</div>
              </div>
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
