import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";

import { getChainName, type AnyChainId, type ContractsChainId, type SourceChainId } from "config/chains";
import { getChainIcon } from "config/icons";
import { MULTI_CHAIN_TOKEN_MAPPING } from "config/multichain";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { GmPaySource } from "domain/synthetics/markets/types";
import { convertToUsd } from "domain/tokens";
import { formatAmount, formatBalanceAmount } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { USD_DECIMALS } from "sdk/configs/factors";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { getMarketPoolName } from "sdk/utils/markets";

import { SelectedPoolLabel } from "components/GmSwap/GmSwapBox/SelectedPool";
import { SlideModal } from "components/Modal/SlideModal";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";
import type { RegularOption } from "components/Tabs/types";
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

  const NETWORKS_FILTER = useMemo<RegularOption<"all" | AnyChainId | 0>[]>(() => {
    const wildCard: RegularOption<"all"> = {
      value: "all",
      label: (
        <span className="whitespace-nowrap">
          <Trans>All Networks</Trans>
        </span>
      ),
    };
    const gmxAccount: RegularOption<0> = {
      value: 0,
      label: (
        <span className="whitespace-nowrap">
          <Trans>GMX Account</Trans>
        </span>
      ),
      icon: <img src={getChainIcon(0)} alt="GMX Account" className="size-24 shrink-0" />,
    };
    const settlementChain: RegularOption<ContractsChainId> = {
      value: chainId,
      label: (
        <span className="whitespace-nowrap">
          <Trans>{getChainName(chainId)}</Trans>
        </span>
      ),
      icon: <img src={getChainIcon(chainId)} alt={getChainName(chainId)} className="size-24 shrink-0" />,
    };

    const chainFilters = Object.keys(MULTI_CHAIN_TOKEN_MAPPING[chainId] ?? EMPTY_OBJECT).map((sourceChainId) => {
      const chainIdNum = parseInt(sourceChainId) as AnyChainId | 0;
      return {
        value: chainIdNum,
        label: (
          <span className="whitespace-nowrap">
            <Trans>{getChainName(chainIdNum)}</Trans>
          </span>
        ),
        icon: <img src={getChainIcon(chainIdNum)} alt={getChainName(chainIdNum)} className="size-24 shrink-0" />,
      };
    });

    return [wildCard, settlementChain, gmxAccount, ...chainFilters];
  }, [chainId]);

  const onSelectTokenAddress = (tokenChainId: AnyChainId | 0) => {
    setIsModalVisible(false);
    propsOnSelectTokenAddress(tokenChainId);
  };

  return (
    <div
      className={cx("TokenSelector text-20 leading-1 tracking-wide", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <SlideModal
        qa={"market-token-selector-modal"}
        className="TokenSelector-modal text-body-medium text-white"
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        headerContent={
          <div className="mt-16">
            <ButtonRowScrollFadeContainer>
              <Tabs
                options={NETWORKS_FILTER}
                selectedValue={activeFilter}
                onChange={(value) => setActiveFilter(value)}
                type="inline"
                qa="network-filter"
                regularOptionClassname="shrink-0"
              />
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
        className="group/hoverable flex cursor-pointer items-center whitespace-nowrap hover:text-blue-300"
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

        <ChevronDownIcon className="text-body-large size-16 text-typography-secondary group-hover/hoverable:text-blue-300" />
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
