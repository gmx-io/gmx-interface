import { Menu } from "@headlessui/react";
import cx from "classnames";
import coingeckoIcon from "img/ic_coingecko_16.svg";
import metamaskIcon from "img/ic_metamask_16.svg";
import nansenPortfolioIcon from "img/nansen_portfolio.svg";
import { FiChevronDown } from "react-icons/fi";
import "./AssetDropdown.scss";

import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getIcon } from "config/icons";
import { getTokenBySymbol } from "config/tokens";
import { Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { Link } from "react-router-dom";
import { ethers, isAddress } from "ethers";
import { getTokenExplorerUrl } from "config/chains";

const PLATFORM_TOKEN_ROUTES = {
  GMX: "/buy_gmx",
  GLP: "/buy_glp",
  GM: "/pools",
};

type Props = {
  assetSymbol?: string;
  token?: Token;
  position?: "left" | "right";
};

function AssetDropdown({ assetSymbol, token: propsToken, position = "right" }: Props) {
  const { active, walletClient } = useWallet();
  const { chainId } = useChainId();

  const token = propsToken ? propsToken : assetSymbol && getTokenBySymbol(chainId, assetSymbol);
  const chainIcon = getIcon(chainId, "network");

  if (!token) {
    return null;
  }

  return (
    <div className="AssetDropdown-wrapper">
      <Menu>
        <Menu.Button as="div" className="dropdown-arrow center-both">
          <FiChevronDown size={20} />
        </Menu.Button>
        <Menu.Items as="div" className={cx("asset-menu-items", { left: position === "left" })}>
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
          <Menu.Item as="div">
            {token.coingeckoUrl && (
              <ExternalLink href={token.coingeckoUrl} className="asset-item">
                <img className="asset-item-icon" width={16} height={16} src={coingeckoIcon} alt="Open in Coingecko" />
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
                <img className="asset-item-icon" width={16} height={16} src={metamaskIcon} alt={t`Add to Metamask`} />
                <p>
                  <Trans>Add {token.assetSymbol ?? token.symbol} to Metamask</Trans>
                </p>
              </div>
            )}
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
}

export default AssetDropdown;
