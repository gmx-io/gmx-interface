import cx from "classnames";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { getChainIcon } from "config/icons";
import { MULTI_CHAIN_SUPPORTED_TOKEN_MAP } from "context/GmxAccountContext/config";
import { useGmxAccountDepositViewTokenAddress, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { TokenChainData } from "context/GmxAccountContext/types";
import { useChainId } from "lib/chains";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
import { switchNetwork } from "lib/wallets";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import Button from "components/Button/Button";
import SearchInput from "components/SearchInput/SearchInput";
import { useMultichainTokensRequest } from "components/Synthetics/GmxAccountModal/hooks";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

import InfoIconComponent from "img/ic_info.svg?react";

import { ModalShrinkingContent } from "./ModalShrinkingContent";

type TokenListItemProps = {
  tokenChainData: DisplayTokenChainData;
  onClick?: () => void;
  className?: string;
};

const TokenListItem = ({ tokenChainData, onClick, className }: TokenListItemProps) => {
  return (
    <div
      key={tokenChainData.symbol + "_" + tokenChainData.sourceChainId}
      className={cx("gmx-hover-gradient flex cursor-pointer items-center justify-between px-16 py-8", className)}
      onClick={onClick}
    >
      <div className="flex items-center gap-8">
        <TokenIcon
          symbol={tokenChainData.symbol}
          displaySize={40}
          importSize={40}
          chainIdBadge={tokenChainData.sourceChainId}
        />
        <div>
          <div>{tokenChainData.symbol}</div>
          <div className="text-body-small text-slate-100">{getChainName(tokenChainData.sourceChainId)}</div>
        </div>
      </div>
      <div className="text-right">
        <div>
          {formatBalanceAmount(
            tokenChainData.sourceChainBalance ?? 0n,
            tokenChainData.sourceChainDecimals,
            tokenChainData.symbol
          )}
        </div>
        <div className="text-body-small text-slate-100">
          {tokenChainData.sourceChainBalanceUsd > 0n ? formatUsd(tokenChainData.sourceChainBalanceUsd) : "-"}
        </div>
      </div>
    </div>
  );
};

type DisplayTokenChainData = TokenChainData & {
  sourceChainBalanceUsd: bigint;
};

export const SelectAssetToDepositView = () => {
  const { chainId } = useChainId();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  // const [, setDepositViewChain] = useGmxAccountDepositViewChain();
  const { isConnected } = useAccount();
  const [, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();

  const [selectedNetwork, setSelectedNetwork] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { tokenChainDataArray } = useMultichainTokensRequest();

  const NETWORKS_FILTER = useMemo(() => {
    const wildCard = { id: "all" as const, name: "All Networks" };

    const chainFilters = Object.keys(MULTI_CHAIN_SUPPORTED_TOKEN_MAP[chainId] ?? EMPTY_OBJECT).map((sourceChainId) => ({
      id: parseInt(sourceChainId),
      name: getChainName(parseInt(sourceChainId)),
    }));

    return [wildCard, ...chainFilters];
  }, [chainId]);

  const filteredBalances: DisplayTokenChainData[] = useMemo(() => {
    return tokenChainDataArray
      .filter((tokenChainData) => {
        const matchesSearch = tokenChainData.symbol.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesNetwork = selectedNetwork === "all" || tokenChainData.sourceChainId === selectedNetwork;
        return matchesSearch && matchesNetwork;
      })
      .map((tokenChainData) => {
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
      .sort((a, b) => {
        if (a.sourceChainBalanceUsd === b.sourceChainBalanceUsd) {
          return 0;
        }

        return a.sourceChainBalanceUsd > b.sourceChainBalanceUsd ? -1 : 1;
      });
  }, [tokenChainDataArray, searchQuery, selectedNetwork]);

  return (
    <ModalShrinkingContent className="gap-8 overflow-y-hidden">
      <div className="px-16 pt-16">
        <SearchInput
          placeholder="Search tokens..."
          value={searchQuery}
          setValue={(value) => setSearchQuery(value)}
          className="rounded-4 bg-slate-700"
          size="s"
          noBorder
        />
      </div>

      <div className="px-16 ">
        <ButtonRowScrollFadeContainer>
          <div className="flex gap-4">
            {NETWORKS_FILTER.map((network) => (
              <Button
                key={network.id}
                type="button"
                variant="secondary"
                slim
                className={cx("whitespace-nowrap", {
                  "!bg-cold-blue-500": selectedNetwork === network.id,
                  "!text-slate-100": selectedNetwork !== network.id,
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

      <div className="grow overflow-y-auto">
        {filteredBalances.map((tokenChainData) => (
          <TokenListItem
            key={tokenChainData.symbol + "_" + tokenChainData.sourceChainId}
            tokenChainData={tokenChainData}
            onClick={() => {
              switchNetwork(tokenChainData.sourceChainId, isConnected);
              setDepositViewTokenAddress(tokenChainData.address);
              setIsVisibleOrView("deposit");
            }}
          />
        ))}
        {filteredBalances.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-slate-100">
            <InfoIconComponent className="size-24" />
            No assets are available for deposit
          </div>
        )}
      </div>
    </ModalShrinkingContent>
  );
};
