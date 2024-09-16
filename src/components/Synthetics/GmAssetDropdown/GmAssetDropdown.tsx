import { Placement, autoUpdate, flip, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";

import { Trans } from "@lingui/macro";
import React, { useCallback, type ReactNode } from "react";
import { FiChevronDown } from "react-icons/fi";
import { createBreakpoint } from "react-use";

import { getExplorerUrl } from "config/chains";
import { getIcon } from "config/icons";
import {
  MarketInfo,
  GlvAndGmMarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getGlvDisplayName,
} from "domain/synthetics/markets";
import { isGlv } from "domain/synthetics/markets/glv";
import { GlvMarketInfo } from "domain/synthetics/markets/useGlvMarkets";
import { TokenData, TokensData, getTokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { isMobile as headlessUiIsMobile } from "lib/headlessUiIsMobile";
import { getByKey } from "lib/objects";
import useWallet, { WalletClient } from "lib/wallets/useWallet";

import ExternalLink from "components/ExternalLink/ExternalLink";

import walletIcon from "img/ic_wallet_24.svg";

import "./GmAssetDropdown.scss";

type Props = {
  token?: TokenData;
  marketsInfoData?: GlvAndGmMarketsInfoData;
  position?: Placement;
  tokensData?: TokensData;
};

function renderMarketName(market?: MarketInfo | GlvMarketInfo) {
  if (!market) {
    return null;
  }

  const isGlvMarket = isGlv(market);

  const marketName = market.isSpotOnly ? "SWAP" : isGlvMarket ? market.name : getMarketIndexName(market);
  const poolName = getMarketPoolName(market);

  return (
    <>
      {isGlvMarket ? getGlvDisplayName(market) : "GM"}
      {marketName ? <>: {marketName}</> : null}
      <span className="inline-flex items-start">
        <span className="subtext">[{poolName}]</span>
      </span>
    </>
  );
}

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
    // Somehow headless ui prevents the touchend event before it can trigger the closure of already opened dropdowns
    if (headlessUiIsMobile()) {
      const parent = e.currentTarget.parentElement;

      if (parent) {
        const event = new TouchEvent("touchend");
        parent.dispatchEvent(event);
      }
    }
  }, []);

  const contractSymbol = market && isGlv(market) ? `${market.indexToken.contractSymbol}` : undefined;

  return (
    <div className="AssetDropdown-wrapper GmAssetDropdown">
      <Menu>
        <Menu.Button
          as="div"
          onClick={handleMenuButtonClick}
          ref={refs.setReference}
          className="dropdown-arrow center-both"
        >
          <FiChevronDown size={20} />
        </Menu.Button>
        <Menu.Items
          as="div"
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-30 rounded-4 border border-gray-800 bg-slate-800 outline-none"
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
        className="asset-item"
      >
        <img src={walletIcon} className="wallet-icon" alt="Add to wallet" />
        <p>
          <Trans>Add {marketName} to Wallet</Trans>
        </p>
      </div>
    </Menu.Item>
  );
}
