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
import { isAddress } from "ethers/lib/utils.js";
import { getTokenExplorerUrl } from "config/chains";

type Props = {
  assetSymbol: string;
  token?: Token;
  position?: "left" | "right";
};

function AssetDropdown({ assetSymbol, token: propsToken, position = "right" }: Props) {
  const { active, connector } = useWallet();
  const { chainId } = useChainId();

  let token: Token;

  if (propsToken) {
    token = propsToken;
  } else {
    try {
      token = getTokenBySymbol(chainId, assetSymbol);
    } catch (e) {
      return null;
    }
  }

  const chainIcon = getIcon(chainId, "network");

  return (
    <div className="AssetDropdown-wrapper">
      <Menu>
        <Menu.Button as="div" className="dropdown-arrow center-both">
          <FiChevronDown size={20} />
        </Menu.Button>
        <Menu.Items as="div" className={cx("asset-menu-items", { left: position === "left" })}>
          <Menu.Item as="div">
            {token.reservesUrl && (
              <ExternalLink href={token.reservesUrl} className="asset-item">
                <img className="asset-item-icon" src={nansenPortfolioIcon} alt="Proof of Reserves" />
                <p>
                  <Trans>Proof of Reserves</Trans>
                </p>
              </ExternalLink>
            )}
          </Menu.Item>
          <Menu.Item as="div">
            {token.coingeckoUrl && (
              <ExternalLink href={token.coingeckoUrl} className="asset-item">
                <img className="asset-item-icon" src={coingeckoIcon} alt="Open in Coingecko" />
                <p>
                  <Trans>Open {token.coingeckoSymbol ?? token.assetSymbol ?? token.symbol} in Coingecko</Trans>
                </p>
              </ExternalLink>
            )}
          </Menu.Item>
          <Menu.Item as="div">
            {!token.isNative && !token.isSynthetic && token.address && isAddress(token.address) && (
              <ExternalLink href={getTokenExplorerUrl(chainId, token.address)} className="asset-item">
                <img className="asset-item-icon" src={chainIcon} alt="Open in explorer" />
                <p>
                  <Trans>Open {token.assetSymbol ?? token.symbol} in Explorer</Trans>
                </p>
              </ExternalLink>
            )}
          </Menu.Item>
          <Menu.Item as="div">
            {active && !token.isNative && !token.isSynthetic && (
              <div
                onClick={() => {
                  if (connector?.watchAsset && token) {
                    const { address, decimals, imageUrl, metamaskSymbol, assetSymbol, symbol } = token;
                    connector.watchAsset?.({
                      address: address,
                      decimals: decimals,
                      image: imageUrl,
                      symbol: assetSymbol ?? metamaskSymbol ?? symbol,
                    });
                  }
                }}
                className="asset-item"
              >
                <img className="asset-item-icon" src={metamaskIcon} alt={t`Add to Metamask`} />
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
