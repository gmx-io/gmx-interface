import { t } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";

import { getChainName, type AnyChainId, type ContractsChainId, type SourceChainId } from "config/chains";
import { getChainIcon } from "config/icons";
import { MULTI_CHAIN_TOKEN_MAPPING } from "config/multichain";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { convertToUsd } from "domain/tokens";
import { formatAmount, formatBalanceAmount } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { USD_DECIMALS } from "sdk/configs/factors";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { getMarketPoolName } from "sdk/utils/markets";

import Button from "components/Button/Button";
import { GmPaySource } from "components/GmSwap/GmSwapBox/GmDepositWithdrawalBox/types";
import { SelectedPoolLabel } from "components/GmSwap/GmSwapBox/SelectedPool";
import { SlideModal } from "components/Modal/SlideModal";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import "./TokenSelector.scss";

type Props = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;

  label?: string;
  className?: string;

  paySource: GmPaySource;
  onSelectTokenAddress: (srcChainId: AnyChainId | 0) => void;

  marketInfo: GlvOrMarketInfo | undefined;
  marketTokenPrice: bigint | undefined;
  tokenBalancesData: Partial<Record<AnyChainId | 0, bigint>>;
};

export function MultichainMarketTokenSelector({
  chainId,
  srcChainId,
  onSelectTokenAddress: propsOnSelectTokenAddress,
  paySource,
  className,
  label,
  marketInfo,
  marketTokenPrice,
  tokenBalancesData,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | AnyChainId | 0>("all");

  const NETWORKS_FILTER = useMemo(() => {
    const wildCard = { id: "all" as const, name: t`All Networks` };
    const gmxAccount = { id: 0 as const, name: t`GMX Account` };
    const settlementChain = { id: chainId, name: getChainName(chainId) };

    const chainFilters = Object.keys(MULTI_CHAIN_TOKEN_MAPPING[chainId] ?? EMPTY_OBJECT).map((sourceChainId) => ({
      id: parseInt(sourceChainId) as AnyChainId | 0,
      name: getChainName(parseInt(sourceChainId)),
    }));

    return [wildCard, settlementChain, gmxAccount, ...chainFilters];
  }, [chainId]);

  const onSelectTokenAddress = (tokenChainId: AnyChainId | 0) => {
    setIsModalVisible(false);
    propsOnSelectTokenAddress(tokenChainId);
  };

  // useEffect(() => {
  //   if (isModalVisible) {
  //     setSearchKeyword("");
  //   }
  // }, [isModalVisible]);

  // TODO implement
  // const _handleKeyDown = (e) => {
  //   if (e.key === "Enter") {
  //     e.preventDefault();
  //     e.stopPropagation();
  //     if (filteredTokens.length > 0) {
  //       onSelectToken(filteredTokens[0]);
  //     }
  //   }
  // };

  // const isGmxAccountEmpty = useMemo(() => {
  //   if (!tokensData) return true;

  //   const allEmpty = Object.values(tokensData).every(
  //     (token) => token.gmxAccountBalance === undefined || token.gmxAccountBalance === 0n
  //   );

  //   return allEmpty;
  // }, [tokensData]);

  // useEffect(() => {
  //   if (isModalVisible) {
  //     setSearchKeyword("");

  //     if (srcChainId === undefined) {
  //       setActiveFilter("pay");
  //     } else {
  //       if (isGmxAccountEmpty) {
  //         setActiveFilter("deposit");
  //       } else {
  //         setActiveFilter("pay");
  //       }
  //     }
  //   }
  // }, [isGmxAccountEmpty, isModalVisible, setSearchKeyword, srcChainId]);

  // if (!token) {
  //   return null;
  // }

  return (
    <div className={cx("TokenSelector", "text-h2 -mr-5", className)} onClick={(event) => event.stopPropagation()}>
      <SlideModal
        qa={"market-token-selector-modal"}
        className="TokenSelector-modal text-body-medium text-white"
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        headerContent={
          <div className="mt-16">
            <ButtonRowScrollFadeContainer>
              <div className="flex gap-4">
                {NETWORKS_FILTER.map((network) => (
                  <Button
                    key={network.id}
                    type="button"
                    variant="secondary"
                    size="small"
                    className={cx(
                      "whitespace-nowrap",
                      activeFilter === network.id ? "!bg-cold-blue-500" : "!text-slate-100"
                    )}
                    onClick={() => setActiveFilter(network.id)}
                    imgSrc={network.id !== "all" ? getChainIcon(network.id) : undefined}
                    imgClassName="size-16 !mr-4"
                  >
                    {network.name}
                  </Button>
                ))}
              </div>
            </ButtonRowScrollFadeContainer>
          </div>
        }
        contentPadding={false}
      >
        <AvailableToTradeTokenList
          onSelectTokenAddress={onSelectTokenAddress}
          chainId={chainId}
          srcChainId={srcChainId}
          marketInfo={marketInfo}
          tokenBalancesData={tokenBalancesData}
          marketTokenPrice={marketTokenPrice}
          activeFilter={activeFilter}
        />
      </SlideModal>
      <div
        data-qa={"market-token-selector"}
        className="flex cursor-pointer items-center whitespace-nowrap hover:text-blue-300"
        onClick={() => setIsModalVisible(true)}
      >
        {marketInfo && (
          <span className="inline-flex items-center">
            <TokenIcon
              className="mr-5"
              symbol={isGlvInfo(marketInfo) ? marketInfo.glvToken.symbol : marketInfo.indexToken.symbol}
              importSize={24}
              displaySize={20}
              chainIdBadge={paySource === "sourceChain" ? srcChainId : paySource === "gmxAccount" ? 0 : undefined}
            />
            <SelectedPoolLabel glvOrMarketInfo={marketInfo} />
          </span>
        )}

        <ChevronDownIcon className="text-body-large" />
      </div>
    </div>
  );
}

type DisplayToken = {
  symbol: string;
  indexTokenAddress: string | undefined;
  longTokenAddress: string;
  shortTokenAddress: string;
  balance: bigint;
  balanceUsd: bigint;
  chainId: AnyChainId | 0;
};

function AvailableToTradeTokenList({
  chainId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  srcChainId,
  onSelectTokenAddress,
  marketInfo,
  tokenBalancesData,
  marketTokenPrice,
  activeFilter,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  onSelectTokenAddress: (tokenChainId: AnyChainId | 0) => void;
  marketInfo: GlvOrMarketInfo | undefined;
  tokenBalancesData: Partial<Record<AnyChainId | 0, bigint>>;
  marketTokenPrice: bigint | undefined;
  activeFilter: AnyChainId | 0 | "all";
}) {
  const { gmStubToken, glvStubToken } = useMemo(() => {
    return {
      gmStubToken: getTokenBySymbol(chainId, "GM"),
      glvStubToken: getTokenBySymbol(chainId, "GLV"),
    };
  }, [chainId]);

  const sortedFilteredTokens = useMemo((): DisplayToken[] => {
    if (!marketInfo) return EMPTY_ARRAY;
    // const concatenatedTokens: DisplayToken[] = [];

    // if (includeMultichainTokensInPay && multichainTokens) {
    //   for (const token of multichainTokens) {
    //     if (token.sourceChainBalance === undefined) {
    //       continue;
    //     }

    //     const balanceUsd =
    //       convertToUsd(token.sourceChainBalance, token.sourceChainDecimals, token.sourceChainPrices?.maxPrice) ?? 0n;
    //     concatenatedTokens.push({
    //       ...token,
    //       balance: token.sourceChainBalance,
    //       balanceUsd,
    //       chainId: token.sourceChainId,
    //     });
    //   }
    // }

    // let filteredTokens: DisplayToken[];
    // if (!searchKeyword.trim()) {
    //   filteredTokens = concatenatedTokens;
    // } else {
    //   filteredTokens = searchBy(
    //     concatenatedTokens,
    //     [
    //       (item) => {
    //         let name = item.name;

    //         return stripBlacklistedWords(name);
    //       },
    //       "symbol",
    //     ],
    //     searchKeyword
    //   );
    // }

    // const tokensWithBalance: DisplayToken[] = [];
    // const tokensWithoutBalance: DisplayToken[] = [];

    // for (const token of filteredTokens) {
    //   const balance = token.balance;

    //   if (balance !== undefined && balance > 0n) {
    //     tokensWithBalance.push(token);
    //   } else {
    //     tokensWithoutBalance.push(token);
    //   }
    // }

    // const sortedTokensWithBalance: DisplayToken[] = tokensWithBalance.sort((a, b) => {
    //   if (a.balanceUsd === b.balanceUsd) {
    //     return 0;
    //   }
    //   return b.balanceUsd - a.balanceUsd > 0n ? 1 : -1;
    // });

    // const sortedTokensWithoutBalance: DisplayToken[] = tokensWithoutBalance.sort((a, b) => {
    //   if (extendedSortSequence) {
    //     // making sure to use the wrapped address if it exists in the extended sort sequence
    //     const aAddress =
    //       a.wrappedAddress && extendedSortSequence.includes(a.wrappedAddress) ? a.wrappedAddress : a.address;

    //     const bAddress =
    //       b.wrappedAddress && extendedSortSequence.includes(b.wrappedAddress) ? b.wrappedAddress : b.address;

    //     return extendedSortSequence.indexOf(aAddress) - extendedSortSequence.indexOf(bAddress);
    //   }

    //   return 0;
    // });

    // return [...sortedTokensWithBalance, ...sortedTokensWithoutBalance];
    return Object.entries(tokenBalancesData)
      .filter(([chainId]) => {
        if (activeFilter === "all") {
          return true;
        }
        return parseInt(chainId) === activeFilter;
      })
      .map(([chainId, balance]: [string, bigint | undefined]): DisplayToken | undefined => {
        if (balance === undefined) {
          return undefined;
        }
        const symbol = isGlvInfo(marketInfo) ? marketInfo.glvToken.symbol : marketInfo.indexToken.symbol;
        const indexTokenAddress = isGlvInfo(marketInfo) ? marketInfo.glvToken.address : marketInfo.indexToken.address;

        return {
          balance,
          balanceUsd:
            convertToUsd(
              balance,
              isGlvInfo(marketInfo) ? glvStubToken.decimals : gmStubToken.decimals,
              marketTokenPrice
            ) ?? 0n,
          chainId: parseInt(chainId) as AnyChainId | 0,
          symbol,
          indexTokenAddress,
          longTokenAddress: marketInfo.longToken.address,
          shortTokenAddress: marketInfo.shortToken.address,
        };
      })
      .filter((token): token is DisplayToken => token !== undefined);
  }, [activeFilter, glvStubToken.decimals, gmStubToken.decimals, marketInfo, marketTokenPrice, tokenBalancesData]);

  return (
    <div>
      {sortedFilteredTokens.map((token) => {
        return (
          <div
            key={token.chainId ?? "settlement-chain"}
            className="gmx-hover-gradient flex cursor-pointer items-center justify-between px-16 py-8"
            onClick={() => onSelectTokenAddress(token.chainId)}
          >
            <div className="text-body-large flex items-center gap-8">
              <TokenIcon
                symbol={token.symbol}
                className="size-40"
                displaySize={40}
                importSize={40}
                chainIdBadge={token.chainId}
              />

              {/* <SelectedPoolLabel glvOrMarketInfo={marketInfo} /> */}
              {marketInfo && (
                <div>
                  <div>
                    {isGlvInfo(marketInfo) ? (
                      marketInfo.name
                    ) : (
                      <>
                        {marketInfo?.indexToken.symbol}
                        <span className="text-slate-100">/USD</span>
                      </>
                    )}
                  </div>
                  <div className="text-body-small text-slate-100">[{getMarketPoolName(marketInfo)}]</div>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-body-large">
                {token.balance > 0n &&
                  formatBalanceAmount(
                    token.balance,
                    isGlvInfo(marketInfo) ? glvStubToken.decimals : gmStubToken.decimals,
                    isGlvInfo(marketInfo) ? "GLV" : "GM",
                    {
                      isStable: false,
                    }
                  )}
                {token.balance == 0n && "-"}
              </div>

              <span className="text-body-small text-slate-100">
                {token.balanceUsd > 0n && <div>(${formatAmount(token.balanceUsd, USD_DECIMALS, 2, true)})</div>}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
