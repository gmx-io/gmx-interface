import "./GmAssetDropdown.scss";
import { Menu } from "@headlessui/react";
import { FiChevronDown } from "react-icons/fi";
import cx from "classnames";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { TokenData, TokensData, getTokenData } from "domain/synthetics/tokens";
import { MarketsInfoData, getMarketPoolName } from "domain/synthetics/markets";
import { getByKey } from "lib/objects";
import { Trans } from "@lingui/macro";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { getExplorerUrl } from "config/chains";
import { createBreakpoint } from "react-use";
import walletIcon from "img/ic_wallet_24.svg";

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
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const marketName = market?.isSpotOnly
    ? `GM: SWAP [${getMarketPoolName(market)}]`
    : `GM: ${indexToken?.symbol} [${market && getMarketPoolName(market)}]`;
  const explorerUrl = getExplorerUrl(chainId);
  const useBreakpoint = createBreakpoint({ S: 500 });
  const breakpoint = useBreakpoint();

  return (
    <div className="AssetDropdown-wrapper GmAssetDropdown">
      <Menu>
        <Menu.Button as="div" className="dropdown-arrow center-both">
          <FiChevronDown size={20} />
        </Menu.Button>
        <Menu.Items as="div" className={cx("asset-menu-items", { center: breakpoint === "S" })}>
          <Menu.Item as="div">
            {marketName && (
              <ExternalLink href={`${explorerUrl}address/${token?.address}`} className="asset-item">
                <img className="asset-item-icon" src={chainIcon} alt="Open in explorer" />
                <p>
                  <Trans>Open {marketName} in Explorer</Trans>
                </p>
              </ExternalLink>
            )}
          </Menu.Item>
          <Menu.Item as="div">
            {active && marketName && (
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
                <img src={walletIcon} className="wallet-icon" alt="Add to wallet" />
                <p>
                  <Trans>Add {marketName} to Wallet</Trans>
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
                <img src={walletIcon} className="wallet-icon" alt="Add to wallet" />
                <p>
                  <Trans>Add {longToken?.assetSymbol ?? longToken?.symbol} to Wallet</Trans>
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
                <img src={walletIcon} className="wallet-icon" alt="Add to wallet" />
                <p>
                  <Trans>Add {shortToken?.assetSymbol ?? shortToken?.symbol} to Wallet</Trans>
                </p>
              </div>
            )}
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
}
