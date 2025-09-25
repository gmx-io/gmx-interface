import { Placement, autoUpdate, flip, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import React, { useCallback, type ReactNode } from "react";
import { createBreakpoint } from "react-use";

import { getExplorerUrl } from "config/chains";
import { getIcon } from "config/icons";
import {
  GlvAndGmMarketsInfoData,
  GlvOrMarketInfo,
  getGlvDisplayName,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData, TokensData, getTokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { isMobile as headlessUiIsMobile } from "lib/headlessUiIsMobile";
import { getByKey } from "lib/objects";
import useWallet, { WalletClient } from "lib/wallets/useWallet";

import ExternalLink from "components/ExternalLink/ExternalLink";

import MenuDotsIcon from "img/ic_menu_dots.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";

import "./GmAssetDropdown.scss";

type Props = {
  token?: TokenData;
  marketsInfoData?: GlvAndGmMarketsInfoData;
  position?: Placement;
  tokensData?: TokensData;
};

function renderMarketName(market?: GlvOrMarketInfo) {
  if (!market) {
    return null;
  }

  const isGlv = isGlvInfo(market);

  const marketName = market.isSpotOnly ? "SWAP" : isGlv ? market.name : getMarketIndexName(market);
  const poolName = getMarketPoolName(market);

  return (
    <>
      {isGlv ? getGlvDisplayName(market) : "GM"}
      {marketName ? <>: {marketName}</> : null}
      <span className="inline-flex items-start">
        <span className="subtext">[{poolName}]</span>
      </span>
    </>
  );
}

const handleMenuItemsClick = (e: React.MouseEvent) => {
  e.stopPropagation();
};

export default function GmAssetDropdown({ token, marketsInfoData, tokensData, position }: Props) {
  const { chainId } = useChainId();
  const { active, walletClient } = useWallet();
  const chainIcon = getIcon(chainId, "network");

  const market = getByKey(marketsInfoData, token?.address);
  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);
  const explorerUrl = getExplorerUrl(chainId);
  const useBreakpoint = createBreakpoint({ S: 0, M: 600 });
  const breakpoint = useBreakpoint();
  const marketName = renderMarketName(market);
  const isSameCollaterals = market?.isSameCollaterals;

  const { refs, floatingStyles } = useFloating({
    middleware: [flip(), shift()],
    strategy: "fixed",
    placement: breakpoint === "S" ? "bottom" : position ?? "bottom-start",
    whileElementsMounted: autoUpdate,
  });

  const handleMenuButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Somehow headless ui prevents the touchend event before it can trigger the closure of already opened dropdowns
    if (headlessUiIsMobile()) {
      const parent = e.currentTarget.parentElement;

      if (parent) {
        const event = new TouchEvent("touchend");
        parent.dispatchEvent(event);
      }
    }
  }, []);

  const contractSymbol = market && isGlvInfo(market) ? `${market.glvToken.contractSymbol}` : undefined;

  return (
    <div className="AssetDropdown-wrapper GmAssetDropdown">
      <Menu>
        <Menu.Button
          as="div"
          onClick={handleMenuButtonClick}
          ref={refs.setReference}
          className="dropdown-arrow center-both"
        >
          <MenuDotsIcon className="size-14" />
        </Menu.Button>
        <Menu.Items
          as="div"
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-30 rounded-8 border-1/2 border-slate-600 bg-slate-900 outline-none"
          onClick={handleMenuItemsClick}
        >
          {market && (
            <Menu.Item as="div">
              <ExternalLink href={`${explorerUrl}address/${token?.address}`} className="asset-item">
                <img className="asset-item-icon" src={chainIcon} alt="Open in explorer" />
                <p>
                  <Trans>Open {marketName} in Explorer</Trans>
                </p>
              </ExternalLink>
            </Menu.Item>
          )}
          <AddToWalletButton
            contractSymbol={contractSymbol}
            active={active}
            walletClient={walletClient}
            token={token}
            marketName={marketName}
          />
          {active && shortToken && walletClient && (
            <AddToWalletButton
              active={active}
              walletClient={walletClient}
              token={longToken}
              marketName={longToken?.assetSymbol ?? longToken?.symbol}
            />
          )}
          {!isSameCollaterals && active && shortToken && walletClient && (
            <AddToWalletButton
              active={active}
              walletClient={walletClient}
              token={shortToken}
              marketName={shortToken?.assetSymbol ?? shortToken?.symbol}
            />
          )}
        </Menu.Items>
      </Menu>
    </div>
  );
}

function AddToWalletButton({
  active,
  walletClient,
  token,
  marketName,
  contractSymbol,
}: {
  active?: boolean;
  walletClient: WalletClient;
  token?: TokenData;
  marketName: ReactNode;
  contractSymbol?: string;
}) {
  if (!active || !walletClient?.watchAsset || !token) {
    return null;
  }

  const { address, decimals, imageUrl, symbol, metamaskSymbol, explorerSymbol, assetSymbol } = token;

  return (
    <Menu.Item as="div">
      <div
        onClick={() => {
          walletClient.watchAsset({
            type: "ERC20",
            options: {
              address,
              symbol: contractSymbol ?? explorerSymbol ?? assetSymbol ?? metamaskSymbol ?? symbol,
              decimals,
              image: imageUrl,
            },
          });
        }}
        className="asset-item group"
      >
        <WalletIcon className="size-16 text-typography-secondary group-hover:text-typography-primary" />
        <p>
          <Trans>Add {marketName} to Wallet</Trans>
        </p>
      </div>
    </Menu.Item>
  );
}
