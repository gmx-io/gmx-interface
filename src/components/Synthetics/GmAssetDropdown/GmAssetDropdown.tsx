import "./GmAssetDropdown.scss";
import { Menu } from "@headlessui/react";
import { FiChevronDown } from "react-icons/fi";
import cx from "classnames";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { TokenData, TokensData, getTokenData } from "domain/synthetics/tokens";
import { MarketsInfoData } from "domain/synthetics/markets";
import { getByKey } from "lib/objects";
import { Trans } from "@lingui/macro";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { getExplorerUrl } from "config/chains";
import { IoWalletOutline } from "react-icons/io5";

type Props = {
  token?: TokenData;
  marketsInfoData?: MarketsInfoData;
  position?: "left" | "right";
  tokensData?: TokensData;
};

export default function GmAssetDropdown({ token, marketsInfoData, tokensData, position = "right" }: Props) {
  const { chainId } = useChainId();
  const { active, connector } = useWallet();
  const chainIcon = getIcon(chainId, "network");

  const market = getByKey(marketsInfoData, token?.address);
  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);
  const explorerUrl = getExplorerUrl(chainId);

  return (
    <div className="AssetDropdown-wrapper GmAssetDropdown">
      <Menu>
        <Menu.Button as="div" className="dropdown-arrow center-both">
          <FiChevronDown size={20} />
        </Menu.Button>
        <Menu.Items as="div" className={cx("asset-menu-items", { "position-left": position === "left" })}>
          <Menu.Item as="div">
            {market?.name && (
              <ExternalLink href={`${explorerUrl}address/${token?.address}`} className="asset-item">
                <img className="asset-item-icon" src={chainIcon} alt="Open in explorer" />
                <p>
                  <Trans>Open {market?.name} in Explorer</Trans>
                </p>
              </ExternalLink>
            )}
          </Menu.Item>
          <Menu.Item as="div">
            {active && market?.name && (
              <div
                onClick={() => {
                  if (connector?.watchAsset && token) {
                    const { address, decimals, imageUrl, symbol } = token;
                    connector.watchAsset?.({
                      address: address,
                      decimals: decimals,
                      image: imageUrl,
                      symbol: symbol,
                    });
                  }
                }}
                className="asset-item"
              >
                <IoWalletOutline fontSize={16} />
                <p>
                  <Trans>Add {market?.name} to Wallet</Trans>
                </p>
              </div>
            )}
          </Menu.Item>
          <Menu.Item as="div">
            {active && longToken && (
              <div
                onClick={() => {
                  if (connector?.watchAsset && longToken) {
                    const { address, decimals, imageUrl, symbol } = longToken;
                    connector.watchAsset?.({
                      address: address,
                      decimals: decimals,
                      image: imageUrl,
                      symbol: symbol,
                    });
                  }
                }}
                className="asset-item"
              >
                <IoWalletOutline fontSize={16} />
                <p>
                  <Trans>Add {longToken?.symbol} to Wallet</Trans>
                </p>
              </div>
            )}
          </Menu.Item>
          <Menu.Item as="div">
            {active && shortToken && (
              <div
                onClick={() => {
                  if (connector?.watchAsset && shortToken) {
                    const { address, decimals, imageUrl, symbol } = shortToken;
                    connector.watchAsset?.({
                      address: address,
                      decimals: decimals,
                      image: imageUrl,
                      symbol: symbol,
                    });
                  }
                }}
                className="asset-item"
              >
                <IoWalletOutline fontSize={16} />
                <p>
                  <Trans>Add {shortToken?.symbol} to Wallet</Trans>
                </p>
              </div>
            )}
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
}
