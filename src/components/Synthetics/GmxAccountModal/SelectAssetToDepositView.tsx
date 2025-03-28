import cx from "classnames";
import Button from "components/Button/Button";
import { useMultichainTokens } from "components/Synthetics/GmxAccountModal/hooks";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ARBITRUM, AVALANCHE, BASE_MAINNET, SONIC_MAINNET, getChainName } from "config/chains";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { TokenChainData } from "context/GmxAccountContext/types";
import InfoIconComponent from "img/ic_info.svg?react";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { useState } from "react";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

const NETWORKS_FILTER = [
  { id: "all", name: "All Networks" },
  { id: ARBITRUM, name: "Arbitrum" },
  { id: AVALANCHE, name: "Avalanche" },
  { id: BASE_MAINNET, name: "Base" },
  { id: SONIC_MAINNET, name: "Sonic" },
];

type TokenListItemProps = {
  tokenChainData: TokenChainData;
  onClick?: () => void;
  className?: string;
};

const TokenListItem = ({ tokenChainData, onClick, className }: TokenListItemProps) => {
  return (
    <div
      key={tokenChainData.symbol + "_" + tokenChainData.sourceChainId}
      className={cx("flex cursor-pointer items-center justify-between px-16 py-8 gmx-hover:bg-slate-700", className)}
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
          {formatUsd(
            convertToUsd(
              tokenChainData.sourceChainBalance,
              tokenChainData.sourceChainDecimals,
              getMidPrice(tokenChainData.sourceChainPrices)
            )
          )}
        </div>
      </div>
    </div>
  );
};

export const SelectAssetToDepositView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [selectedNetwork, setSelectedNetwork] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const balances = useMultichainTokens();

  const filteredBalances = balances.filter((balance) => {
    const matchesSearch = balance.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNetwork = selectedNetwork === "all" || balance.sourceChainId === selectedNetwork;
    return matchesSearch && matchesNetwork;
  });

  return (
    <div className="flex grow flex-col gap-8 overflow-y-hidden">
      <div className="px-16 pt-16">
        <ButtonRowScrollFadeContainer>
          <div className="flex gap-4">
            {NETWORKS_FILTER.map((network) => (
              <Button
                key={network.id}
                type="button"
                variant="ghost"
                slim
                className={cx("whitespace-nowrap", {
                  "!bg-cold-blue-500": selectedNetwork === network.id,
                })}
                onClick={() => setSelectedNetwork(network.id as number | "all")}
              >
                {network.name}
              </Button>
            ))}
          </div>
        </ButtonRowScrollFadeContainer>
      </div>

      <div className="px-16">
        <input
          type="text"
          placeholder="Search tokens..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-4 bg-slate-700 px-12 py-8 text-white placeholder:text-slate-100"
        />
      </div>

      <div className="grow overflow-y-auto">
        {filteredBalances.map((tokenChainData) => (
          <TokenListItem
            key={tokenChainData.symbol + "_" + tokenChainData.sourceChainId}
            tokenChainData={tokenChainData}
            onClick={() => setIsVisibleOrView("deposit")}
          />
        ))}
        {filteredBalances.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-slate-100">
            <InfoIconComponent className="size-24" />
            No assets are available for deposit
          </div>
        )}
      </div>
    </div>
  );
};
