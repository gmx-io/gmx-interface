import { Placement, autoUpdate, flip, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import type { ReactNode } from "react";
import { FiChevronDown } from "react-icons/fi";
import { createBreakpoint } from "react-use";

import { getExplorerUrl } from "config/chains";
import { getIcon } from "config/icons";
import { MarketInfo, MarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { TokenData, TokensData, getTokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import useWallet, { WalletClient } from "lib/wallets/useWallet";

import ExternalLink from "components/ExternalLink/ExternalLink";

import walletIcon from "img/ic_wallet_24.svg";

import "./GmAssetDropdown.scss";

type Props = {
  token?: TokenData;
  marketsInfoData?: MarketsInfoData;
  position?: Placement;
  tokensData?: TokensData;
};

function renderMarketName(market?: MarketInfo) {
  if (!market) {
    return null;
  }

  const marketName = market.isSpotOnly ? "SWAP" : getMarketIndexName(market);
  const poolName = getMarketPoolName(market);

  return (
    <>
      GM: {marketName}
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

  return (
    <div className="AssetDropdown-wrapper GmAssetDropdown">
      <Menu>
        <Menu.Button as="div" ref={refs.setReference} className="dropdown-arrow center-both">
          <FiChevronDown size={20} />
        </Menu.Button>
        <Menu.Items
          as="div"
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-10 rounded-4 border border-gray-800 bg-slate-800 outline-none"
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
          <AddToWalletButton active={active} walletClient={walletClient} token={token} marketName={marketName} />
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
}: {
  active?: boolean;
  walletClient: WalletClient;
  token?: TokenData;
  marketName: ReactNode;
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
              symbol: explorerSymbol ?? assetSymbol ?? metamaskSymbol ?? symbol,
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
