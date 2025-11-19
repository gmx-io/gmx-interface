import cx from "classnames";
import { useState } from "react";

import { type AnyChainId, type ContractsChainId, type SourceChainId } from "config/chains";
import { isSourceChain } from "config/multichain";
import type { TokenChainData } from "domain/multichain/types";
import { type Token, type TokensData } from "domain/tokens";
import { getToken, GM_STUB_ADDRESS } from "sdk/configs/tokens";
import {
  getIsSpotOnlyMarket,
  getMarketIndexName,
  getMarketIndexToken,
  getMarketIndexTokenSymbol,
  isMarketTokenAddress,
} from "sdk/utils/markets";

import { SlideModal } from "components/Modal/SlideModal";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { ConnectWalletModalContent } from "./ConnectWalletModalContent";
import { AvailableToTradeTokenList, useAvailableToTradeTokenList } from "./MultichainTokenSelector";

import "./TokenSelector.scss";

type Props = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;

  label?: string;
  className?: string;

  tokenAddress: string;
  payChainId: AnyChainId | 0 | undefined;

  tokensData: TokensData | undefined;

  onSelectTokenAddress: (tokenAddress: string, isGmxAccount: boolean, srcChainId: SourceChainId | undefined) => void;
  extendedSortSequence?: string[] | undefined;

  multichainTokens: TokenChainData[] | undefined;
  includeMultichainTokensInPay?: boolean;

  isConnected?: boolean;
  walletIconUrls?: string[];
  openConnectModal?: () => void;
};

export function MultichainTokenSelectorForLp({
  chainId,
  srcChainId,
  tokensData,
  extendedSortSequence,
  onSelectTokenAddress: propsOnSelectTokenAddress,
  tokenAddress,
  payChainId,
  className,
  label,
  multichainTokens,
  includeMultichainTokensInPay,
  isConnected,
  walletIconUrls,
  openConnectModal,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  let token: Token | undefined = isMarketTokenAddress(chainId, tokenAddress)
    ? getToken(chainId, GM_STUB_ADDRESS)
    : getToken(chainId, tokenAddress);

  const onSelectTokenAddress = (tokenAddress: string, _chainId: AnyChainId | 0) => {
    setIsModalVisible(false);
    // TODO MLTCH: bad readability
    propsOnSelectTokenAddress(
      tokenAddress,
      _chainId === 0,
      _chainId !== chainId && _chainId !== 0 && isSourceChain(_chainId) ? _chainId : undefined
    );
  };

  const availableToTradeTokenList = useAvailableToTradeTokenList({
    activeFilter: "pay",
    srcChainId,
    searchKeyword,
    tokensData,
    extendedSortSequence,
    chainId,
    multichainTokens,
    includeMultichainTokensInPay,
    includeSettlementChainTokens: true,
  });

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
              symbol={getMarketIndexTokenSymbol(chainId, tokenAddress)}
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
