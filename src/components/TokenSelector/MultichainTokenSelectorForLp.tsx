import cx from "classnames";
import { useMemo, useState } from "react";

import {
  GMX_ACCOUNT_PSEUDO_CHAIN_ID,
  type AnyChainId,
  type ContractsChainId,
  type GmxAccountPseudoChainId,
  type SourceChainId,
} from "config/chains";
import { isSourceChain } from "config/multichain";
import type { Token } from "domain/tokens";
import { searchBy } from "lib/searchBy";
import {
  getIsSpotOnlyMarket,
  getMarketIndexToken,
  getTokenSymbolByMarket,
  isMarketTokenAddress,
} from "sdk/configs/markets";
import { getToken, GM_STUB_ADDRESS } from "sdk/configs/tokens";
import { getMarketIndexName } from "sdk/utils/markets";

import { SlideModal } from "components/Modal/SlideModal";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { ConnectWalletModalContent } from "./ConnectWalletModalContent";
import { AvailableToTradeTokenList } from "./MultichainTokenSelector";
import type { DisplayToken } from "./types";

import "./TokenSelector.scss";

type Props = {
  chainId: ContractsChainId;

  label?: string;
  className?: string;

  tokenAddress: string;
  payChainId: AnyChainId | GmxAccountPseudoChainId | undefined;

  tokens: DisplayToken[];

  onSelectTokenAddress: (tokenAddress: string, isGmxAccount: boolean, srcChainId: SourceChainId | undefined) => void;

  isConnected?: boolean;
  walletIconUrls?: string[];
  openConnectModal?: () => void;
};

export function MultichainTokenSelectorForLp({
  chainId,
  tokens,
  onSelectTokenAddress: propsOnSelectTokenAddress,
  tokenAddress,
  payChainId,
  className,
  label,
  isConnected,
  walletIconUrls,
  openConnectModal,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  let token: Token | undefined = isMarketTokenAddress(chainId, tokenAddress)
    ? getToken(chainId, GM_STUB_ADDRESS)
    : getToken(chainId, tokenAddress);

  const onSelectTokenAddress = (tokenAddress: string, tokenChainId: AnyChainId | GmxAccountPseudoChainId) => {
    setIsModalVisible(false);
    const isGmxAccount = tokenChainId === GMX_ACCOUNT_PSEUDO_CHAIN_ID;
    const tokenSrcChainId =
      tokenChainId !== chainId && !isGmxAccount && isSourceChain(tokenChainId, chainId) ? tokenChainId : undefined;
    propsOnSelectTokenAddress(tokenAddress, isGmxAccount, tokenSrcChainId);
  };

  const availableToTradeTokenList = useMemo(() => {
    if (searchKeyword.trim()) {
      return searchBy(tokens, ["symbol", "name", "address"], searchKeyword);
    }

    return tokens;
  }, [tokens, searchKeyword]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (availableToTradeTokenList.length > 0) {
        onSelectTokenAddress(availableToTradeTokenList[0].address, availableToTradeTokenList[0].chainId);
      }
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className={cx("TokenSelector", className)} onClick={(event) => event.stopPropagation()}>
      <SlideModal
        className="TokenSelector-modal text-body-medium"
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        footerContent={null}
        headerContent={
          !isConnected && (
            <SearchInput
              value={searchKeyword}
              setValue={setSearchKeyword}
              className="mb-12"
              onKeyDown={handleKeyDown}
            />
          )
        }
        contentPadding={false}
        disableOverflowHandling={isConnected === false}
      >
        {isConnected === false ? (
          <ConnectWalletModalContent openConnectModal={openConnectModal} walletIconUrls={walletIconUrls} />
        ) : (
          <AvailableToTradeTokenList
            chainId={chainId}
            onSelectTokenAddress={onSelectTokenAddress}
            tokens={availableToTradeTokenList}
          />
        )}
      </SlideModal>
      <div
        className="group/hoverable group flex cursor-pointer items-center gap-5 whitespace-nowrap hover:text-blue-300"
        onClick={() => setIsModalVisible(true)}
      >
        {!token.isPlatformToken || token.isPlatformTradingToken ? (
          <span className="inline-flex items-center">
            <TokenIcon className="mr-4" symbol={token.symbol} displaySize={20} chainIdBadge={payChainId} />
            {token.symbol}
          </span>
        ) : (
          <span className="inline-flex items-center">
            <TokenIcon
              symbol={getTokenSymbolByMarket(chainId, tokenAddress, "index")}
              className="mr-4"
              displaySize={20}
              chainIdBadge={payChainId}
            />

            {getMarketIndexName({
              indexToken: getMarketIndexToken(chainId, tokenAddress)!,
              isSpotOnly: getIsSpotOnlyMarket(chainId, tokenAddress),
            })}
          </span>
        )}
        <ChevronDownIcon className="w-16 text-typography-secondary group-hover:text-[inherit]" />
      </div>
    </div>
  );
}
