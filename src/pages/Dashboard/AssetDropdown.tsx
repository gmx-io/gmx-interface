import { autoUpdate, flip, FloatingPortal, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import { ethers, isAddress } from "ethers";
import { useCallback } from "react";
import { FiChevronDown } from "react-icons/fi";
import { Link } from "react-router-dom";

import { getTokenExplorerUrl } from "config/chains";
import { getIcon } from "config/icons";
import { getMarketBadge } from "domain/synthetics/markets";
import { MarketStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { isMobile as headlessUiIsMobile } from "lib/headlessUiIsMobile";
import { useTradePageVersion } from "lib/useTradePageVersion";
import useWallet from "lib/wallets/useWallet";
import { getNormalizedTokenSymbol, getTokenBySymbol } from "sdk/configs/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";
import TokenIcon from "components/TokenIcon/TokenIcon";

import coingeckoIcon from "img/ic_coingecko_16.svg";
import metamaskIcon from "img/ic_metamask_16.svg";
import nansenPortfolioIcon from "img/nansen_portfolio.svg";

import "./AssetDropdown.scss";

const PLATFORM_TOKEN_ROUTES = {
  GMX: "/buy_gmx",
  GLP: "/buy_glp",
  GM: "/pools",
};

type Props = {
  assetSymbol?: string;
  token?: Token;
  position?: "left" | "right";
  marketsStats?: MarketStat[];
};

function AssetDropdown({ assetSymbol, token: propsToken, position = "right", marketsStats }: Props) {
  const { active, walletClient } = useWallet();
  const { chainId } = useChainId();
  const [currentVersion] = useTradePageVersion();

  const isV1 = currentVersion === 1;

  const token = propsToken ? propsToken : assetSymbol && getTokenBySymbol(chainId, assetSymbol);
  const chainIcon = getIcon(chainId, "network");

  const { refs, floatingStyles } = useFloating({
    middleware: [flip(), shift()],
    placement: position === "right" ? "bottom-start" : "bottom-end",
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

  if (!token) {
    return null;
  }

  return (
    <div className="AssetDropdown-wrapper">
      <Menu>
        <Menu.Button
          as="div"
          onClick={handleMenuButtonClick}
          ref={refs.setReference}
          className="dropdown-arrow center-both"
        >
          <FiChevronDown size={20} />
        </Menu.Button>
        <FloatingPortal>
          <Menu.Items
            as="div"
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-10 rounded-4 border border-gray-800 bg-slate-800 outline-none"
          >
            <Menu.Item as="div">
              {token.isPlatformToken && (
                <Link to={PLATFORM_TOKEN_ROUTES[token.symbol]} className="asset-item">
                  <img className="asset-item-icon" width={16} height={16} src={token.imageUrl} alt={token.symbol} />
                  <p>
                    <Trans>Buy {token.symbol}</Trans>
                  </p>
                </Link>
              )}
            </Menu.Item>
            <Menu.Item as="div">
              {token.reservesUrl && (
                <ExternalLink href={token.reservesUrl} className="asset-item">
                  <img
                    className="asset-item-icon"
                    width={16}
                    height={16}
                    src={nansenPortfolioIcon}
                    alt="Proof of Reserves"
                  />
                  <p>
                    <Trans>Proof of Reserves</Trans>
                  </p>
                </ExternalLink>
              )}
            </Menu.Item>
            {isV1 && (
              <>
                <Menu.Item as="div">
                  {token.coingeckoUrl && (
                    <ExternalLink href={token.coingeckoUrl} className="asset-item">
                      <img
                        className="asset-item-icon"
                        width={16}
                        height={16}
                        src={coingeckoIcon}
                        alt="Open in Coingecko"
                      />
                      <p>
                        <Trans>Open {token.coingeckoSymbol ?? token.assetSymbol ?? token.symbol} in Coingecko</Trans>
                      </p>
                    </ExternalLink>
                  )}
                </Menu.Item>
                <Menu.Item as="div">
                  {!token.isNative && !token.isSynthetic && token.address && isAddress(token.address) && (
                    <ExternalLink href={getTokenExplorerUrl(chainId, token.address)} className="asset-item">
                      <img className="asset-item-icon" width={16} height={16} src={chainIcon} alt="Open in explorer" />
                      <p>
                        <Trans>Open {token.assetSymbol ?? token.symbol} in Explorer</Trans>
                      </p>
                    </ExternalLink>
                  )}
                </Menu.Item>
                <Menu.Item as="div">
                  {active && !token.isNative && !token.isSynthetic && ethers.isAddress(token.address) && (
                    <div
                      onClick={() => {
                        if (walletClient?.watchAsset && token) {
                          const { address, decimals, imageUrl, metamaskSymbol, assetSymbol, symbol } = token;
                          walletClient.watchAsset({
                            type: "ERC20",
                            options: {
                              address: address,
                              decimals: decimals,
                              image: imageUrl,
                              symbol: assetSymbol ?? metamaskSymbol ?? symbol,
                            },
                          });
                        }
                      }}
                      className="asset-item"
                    >
                      <img
                        className="asset-item-icon"
                        width={16}
                        height={16}
                        src={metamaskIcon}
                        alt={t`Add to Metamask`}
                      />
                      <p>
                        <Trans>Add {token.assetSymbol ?? token.symbol} to Metamask</Trans>
                      </p>
                    </div>
                  )}
                </Menu.Item>
              </>
            )}
            <Menu.Item as="div">
              {(marketsStats ?? []).map((stat) => (
                <AssetDropdownMarketItem marketStat={stat} chainId={chainId} key={stat.marketInfo.marketTokenAddress} />
              ))}
            </Menu.Item>
          </Menu.Items>
        </FloatingPortal>
      </Menu>
    </div>
  );
}

const AssetDropdownMarketItem = ({ marketStat, chainId }: { marketStat: MarketStat; chainId }) => {
  const tokenIconName = marketStat.marketInfo.isSpotOnly
    ? getNormalizedTokenSymbol(marketStat.marketInfo.longToken.symbol) +
      getNormalizedTokenSymbol(marketStat.marketInfo.shortToken.symbol)
    : getNormalizedTokenSymbol(marketStat.marketInfo.indexToken.symbol);

  const tokenIconBadge = getMarketBadge(chainId, marketStat.marketInfo);

  return (
    <Link to={`/pools/?market=${marketStat.marketInfo.marketTokenAddress}&operation=buy`} className="asset-item">
      <div className="mr-12">
        <TokenIcon symbol={tokenIconName} badge={tokenIconBadge} displaySize={32} />
      </div>

      <p>
        <Trans>Buy GM: {marketStat.marketInfo.name}</Trans>
      </p>
    </Link>
  );
};

export default AssetDropdown;
