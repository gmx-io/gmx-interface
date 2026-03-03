import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { AnyChainId, getChainName, SourceChainId } from "config/chains";
import { getChainIcon } from "config/icons";
import { MULTI_CHAIN_TOKEN_MAPPING } from "config/multichain";
import {
  useGmxAccountDepositViewChain,
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountModalOpen,
} from "context/GmxAccountContext/hooks";
import { TokenChainData } from "domain/multichain/types";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { TokenData, TokensData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { Amount } from "components/Amount/Amount";
import Button from "components/Button/Button";
import { useMultichainTradeTokensRequest } from "components/GmxAccountModal/hooks";
import SearchInput from "components/SearchInput/SearchInput";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

type TokenListItemProps = {
  tokenChainData: DisplayTokenChainData;
  onClick?: () => void;
  className?: string;
};

const TokenListItem = ({ tokenChainData, onClick, className }: TokenListItemProps) => {
  return (
    <div
      key={tokenChainData.symbol + "_" + tokenChainData.sourceChainId}
      className={cx(
        "flex cursor-pointer items-center justify-between px-adaptive py-8 gmx-hover:bg-fill-surfaceElevated50",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-16">
        <TokenIcon symbol={tokenChainData.symbol} displaySize={40} chainIdBadge={tokenChainData.sourceChainId} />
        <div>
          <div className="text-body-large">{tokenChainData.symbol}</div>
          <div className="text-body-small text-typography-secondary">{getChainName(tokenChainData.sourceChainId)}</div>
        </div>
      </div>
      <div className="text-right">
        <Amount
          className="text-body-large"
          amount={tokenChainData.sourceChainBalance}
          decimals={tokenChainData.sourceChainDecimals}
          isStable={tokenChainData.isStable}
        />
        <div className="text-body-small text-typography-secondary">
          {tokenChainData.sourceChainBalanceUsd > 0n ? formatUsd(tokenChainData.sourceChainBalanceUsd) : "-"}
        </div>
      </div>
    </div>
  );
};

type DisplayTokenChainData = TokenChainData & {
  sourceChainBalanceUsd: bigint;
};

function sortByBalanceUsd(a: DisplayTokenChainData, b: DisplayTokenChainData): number {
  if (a.sourceChainBalanceUsd === b.sourceChainBalanceUsd) {
    return 0;
  }
  return a.sourceChainBalanceUsd > b.sourceChainBalanceUsd ? -1 : 1;
}

function getMultichainTokens({
  tokenChainDataArray,
  searchQuery,
  selectedNetwork,
}: {
  tokenChainDataArray: TokenChainData[];
  searchQuery: string;
  selectedNetwork: number | "all";
}): DisplayTokenChainData[] {
  return tokenChainDataArray
    .filter((tokenChainData) => {
      const matchesSearch = tokenChainData.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesNetwork = selectedNetwork === "all" || tokenChainData.sourceChainId === selectedNetwork;
      return matchesSearch && matchesNetwork;
    })
    .map((tokenChainData): DisplayTokenChainData => {
      let balanceUsd = 0n;

      if (tokenChainData.sourceChainPrices) {
        balanceUsd =
          convertToUsd(
            tokenChainData.sourceChainBalance,
            tokenChainData.sourceChainDecimals,
            getMidPrice(tokenChainData.sourceChainPrices)
          ) ?? 0n;
      }

      return {
        ...tokenChainData,
        sourceChainBalanceUsd: balanceUsd,
      };
    })
    .sort(sortByBalanceUsd);
}

function getSettlementChainTokens({
  settlementChainTokensData,
  searchQuery,
  selectedNetwork,
  chainId,
}: {
  settlementChainTokensData: TokensData | undefined;
  searchQuery: string;
  selectedNetwork: number | "all";
  chainId: AnyChainId;
}): DisplayTokenChainData[] {
  return Object.values(settlementChainTokensData || (EMPTY_OBJECT as TokensData))
    .filter((token: TokenData) => {
      const matchesSearch = token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesNetwork = selectedNetwork === "all" || chainId === selectedNetwork;
      const hasBalance = token.walletBalance !== undefined && token.walletBalance > 0n;
      return matchesSearch && matchesNetwork && hasBalance;
    })
    .map((token: TokenData): DisplayTokenChainData => {
      const balanceUsd = convertToUsd(token.walletBalance, token.decimals, getMidPrice(token.prices)) ?? 0n;
      return {
        ...token,
        sourceChainId: chainId as SourceChainId,
        sourceChainDecimals: token.decimals,
        sourceChainPrices: token.prices,
        sourceChainBalance: token.walletBalance,
        sourceChainBalanceUsd: balanceUsd,
      };
    })
    .sort(sortByBalanceUsd);
}

function getFilteredTokens({
  tokenChainDataArray,
  settlementChainTokensData,
  searchQuery,
  selectedNetwork,
  chainId,
}: {
  chainId: AnyChainId;
  selectedNetwork: number | "all";
  tokenChainDataArray: TokenChainData[];
  settlementChainTokensData: TokensData | undefined;
  searchQuery: string;
}): DisplayTokenChainData[] {
  const multichainTokens = getMultichainTokens({
    tokenChainDataArray,
    searchQuery,
    selectedNetwork,
  });

  const settlementChainTokens = getSettlementChainTokens({
    settlementChainTokensData,
    searchQuery,
    selectedNetwork,
    chainId,
  });

  return multichainTokens.concat(settlementChainTokens);
}

export const SelectAssetToDepositView = () => {
  const { chainId, srcChainId } = useChainId();
  const { address: account } = useAccount();

  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [, setDepositViewChain] = useGmxAccountDepositViewChain();
  const [, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();

  const [selectedNetwork, setSelectedNetwork] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { tokenChainDataArray } = useMultichainTradeTokensRequest(chainId, account);
  const { tokensData: settlementChainTokensData } = useTokensDataRequest(chainId, srcChainId);

  const networksFilter = useMemo(() => {
    const wildCard = { id: "all" as const, name: t`All networks` };

    const chainFilters = Object.keys(MULTI_CHAIN_TOKEN_MAPPING[chainId] ?? EMPTY_OBJECT)
      .map((sourceChainId) => ({
        id: parseInt(sourceChainId),
        name: getChainName(parseInt(sourceChainId)),
      }))
      .concat({
        id: chainId,
        name: getChainName(chainId),
      });

    return [wildCard, ...chainFilters];
  }, [chainId]);

  const filteredTokens: DisplayTokenChainData[] = useMemo(
    () =>
      getFilteredTokens({
        tokenChainDataArray,
        settlementChainTokensData,
        searchQuery,
        selectedNetwork,
        chainId,
      }),
    [tokenChainDataArray, settlementChainTokensData, searchQuery, selectedNetwork, chainId]
  );

  return (
    <div className="flex grow flex-col overflow-y-hidden">
      <div className="mb-16 px-adaptive pt-adaptive">
        <SearchInput value={searchQuery} setValue={(value) => setSearchQuery(value)} noBorder />
      </div>

      <div className="mb-12 px-adaptive">
        <ButtonRowScrollFadeContainer>
          <div className="flex gap-4">
            {networksFilter.map((network) => (
              <Button
                key={network.id}
                type="button"
                variant={selectedNetwork === network.id ? "secondary" : "ghost"}
                size="small"
                className={cx("whitespace-nowrap", {
                  "!text-typography-primary": selectedNetwork === network.id,
                })}
                onClick={() => setSelectedNetwork(network.id as number | "all")}
                imgSrc={network.id !== "all" ? getChainIcon(network.id) : undefined}
                imgClassName="size-16 !mr-4"
              >
                {network.name}
              </Button>
            ))}
          </div>
        </ButtonRowScrollFadeContainer>
      </div>

      <VerticalScrollFadeContainer className="flex grow flex-col overflow-y-auto">
        {filteredTokens.map((tokenChainData) => (
          <TokenListItem
            key={tokenChainData.symbol + "_" + tokenChainData.sourceChainId}
            tokenChainData={tokenChainData}
            onClick={() => {
              setDepositViewChain(tokenChainData.sourceChainId);
              setDepositViewTokenAddress(tokenChainData.address);
              setIsVisibleOrView("deposit");
            }}
          />
        ))}
        {filteredTokens.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 p-adaptive text-typography-secondary">
            {selectedNetwork === "all" ? (
              <Trans>No assets available for deposit</Trans>
            ) : (
              <Trans>No tokens on {getChainName(selectedNetwork)} for deposit</Trans>
            )}
          </div>
        )}
      </VerticalScrollFadeContainer>
    </div>
  );
};
