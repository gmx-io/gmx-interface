import "./GmAssetDropdown.scss";
import walletIcon from "img/ic_wallet_24.svg";
import { Menu } from "@headlessui/react";
import { FiChevronDown } from "react-icons/fi";
import cx from "classnames";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { TokenData, TokensData, getTokenData } from "domain/synthetics/tokens";
import { MarketInfo, MarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { getByKey } from "lib/objects";
import { Trans } from "@lingui/macro";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { getExplorerUrl } from "config/chains";
import { createBreakpoint } from "react-use";
import { Connector } from "wagmi";

type Props = {
  token?: TokenData;
  marketsInfoData?: MarketsInfoData;
  position?: "left" | "right";
  tokensData?: TokensData;
};

function renderMarketName(market: MarketInfo) {
  return market && market.isSpotOnly ? (
    <>
      GM: SWAP
      <span className="items-top">
        <span className="subtext">[{getMarketPoolName(market)}]</span>
      </span>
    </>
  ) : (
    <>
      GM:{" "}
      <span className="items-top">
        <span>{getMarketIndexName(market)}</span>
        <span className="subtext">[{getMarketPoolName(market)}]</span>
      </span>
    </>
  );
}

function addToWallet(active: boolean, connector?: Connector, token?: TokenData) {
  if (active && connector?.watchAsset && token) {
    const { address, decimals, imageUrl, symbol } = token;
    connector.watchAsset({
      address,
      decimals,
      image: imageUrl,
      symbol,
    });
  }
}

export default function GmAssetDropdown({ token, marketsInfoData, tokensData, position = "right" }: Props) {
  const { chainId } = useChainId();
  const { active, connector } = useWallet();
  const chainIcon = getIcon(chainId, "network");

  const market = getByKey(marketsInfoData, token?.address);
  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);
  const explorerUrl = getExplorerUrl(chainId);
  const useBreakpoint = createBreakpoint({ S: 0, M: 600 });
  const breakpoint = useBreakpoint();

  return (
    <div className="AssetDropdown-wrapper GmAssetDropdown">
      <Menu>
        <Menu.Button as="div" className="dropdown-arrow center-both">
          <FiChevronDown size={20} />
        </Menu.Button>
        <Menu.Items
          as="div"
          className={cx("asset-menu-items", breakpoint === "S" ? "center" : { left: position === "left" })}
        >
          <Menu.Item as="div">
            {market && (
              <ExternalLink href={`${explorerUrl}address/${token?.address}`} className="asset-item">
                <img className="asset-item-icon" src={chainIcon} alt="Open in explorer" />
                <p>
                  <Trans>Open {renderMarketName(market)} in Explorer</Trans>
                </p>
              </ExternalLink>
            )}
          </Menu.Item>
          <Menu.Item as="div">
            {active && market && (
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
                  <Trans>Add {renderMarketName(market)} to Wallet</Trans>
                </p>
              </div>
            )}
          </Menu.Item>
          {active && shortToken && connector && (
            <Menu.Item as="div">
              <div onClick={() => addToWallet(active, connector, longToken)} className="asset-item">
                <img src={walletIcon} className="wallet-icon" alt="Add to wallet" />
                <p>
                  <Trans>Add {longToken?.assetSymbol ?? longToken?.symbol} to Wallet</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {active && shortToken && connector && (
            <Menu.Item as="div">
              <div onClick={() => addToWallet(active, connector, shortToken)} className="asset-item">
                <img src={walletIcon} className="wallet-icon" alt="Add to wallet" />
                <p>
                  <Trans>Add {shortToken?.assetSymbol ?? shortToken?.symbol} to Wallet</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
        </Menu.Items>
      </Menu>
    </div>
  );
}
