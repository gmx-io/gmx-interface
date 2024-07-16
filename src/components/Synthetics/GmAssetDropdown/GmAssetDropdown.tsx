import { ReactNode } from "react";
import cx from "classnames";
import "./GmAssetDropdown.scss";
import walletIcon from "img/ic_wallet_24.svg";
import { Menu } from "@headlessui/react";
import { FiChevronDown } from "react-icons/fi";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { TokenData, TokensData, getTokenData } from "domain/synthetics/tokens";
import { MarketInfo, MarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { getByKey } from "lib/objects";
import { Trans } from "@lingui/macro";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import useWallet, { WalletClient } from "lib/wallets/useWallet";
import { getExplorerUrl } from "config/chains";
import { createBreakpoint } from "react-use";

type Props = {
  token?: TokenData;
  marketsInfoData?: MarketsInfoData;
  position?: "left" | "right";
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

export default function GmAssetDropdown({ token, marketsInfoData, tokensData, position = "right" }: Props) {
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
