import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";

import {
  GMX_ACCOUNT_PSEUDO_CHAIN_ID,
  type AnyChainId,
  type ContractsChainId,
  type GmxAccountPseudoChainId,
  type SourceChainId,
} from "config/chains";
import { PLATFORM_TOKEN_DECIMALS } from "context/PoolsDetailsContext/selectors";
import { getGlvOrMarketAddress } from "domain/synthetics/markets";
import { isGlvAddress, isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvOrMarketInfo, GmPaySource } from "domain/synthetics/markets/types";
import { convertToUsd } from "domain/tokens";
import { formatAmount, formatBalanceAmount } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { USD_DECIMALS } from "sdk/configs/factors";
import { getTokenSymbolByMarket } from "sdk/configs/markets";
import { getToken } from "sdk/configs/tokens";
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
  onSelectTokenAddress: (srcChainId: AnyChainId | GmxAccountPseudoChainId) => void;

  marketInfo: GlvOrMarketInfo | undefined;
  marketTokenPrice: bigint | undefined;
  tokenBalancesData: Partial<Record<AnyChainId | GmxAccountPseudoChainId, bigint>>;
  hideTabs?: boolean;
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
  hideTabs,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "wallet" | "gmxAccount">("all");

  const { tokens, hasGmxAccountBalance, hasWalletBalance } = useMemo((): {
    tokens: DisplayToken[];
    hasGmxAccountBalance: boolean;
    hasWalletBalance: boolean;
  } => {
    let tokens: DisplayToken[] = EMPTY_ARRAY;
    let hasGmxAccountBalance = false;
    let hasWalletBalance = false;

    if (!marketInfo) {
      return { tokens, hasGmxAccountBalance, hasWalletBalance };
    }

    tokens = Object.entries(tokenBalancesData)
      .filter(([tokenChainIdRaw, balance]) => {
        const tokenChainId = parseInt(tokenChainIdRaw);

        if (balance === 0n) {
          return false;
        }

        if (tokenChainId === GMX_ACCOUNT_PSEUDO_CHAIN_ID) {
          hasGmxAccountBalance = true;
        } else {
          hasWalletBalance = true;
        }

        if (activeFilter === "all") {
          return true;
        }

        if (activeFilter === "gmxAccount" && tokenChainId === GMX_ACCOUNT_PSEUDO_CHAIN_ID) {
          return true;
        }

        if (activeFilter === "wallet" && tokenChainId !== GMX_ACCOUNT_PSEUDO_CHAIN_ID) {
          return true;
        }

        return false;
      })
      .map(([chainId, balance]: [string, bigint | undefined]): DisplayToken | undefined => {
        if (balance === undefined) {
          return undefined;
        }
        const symbol = isGlvInfo(marketInfo) ? marketInfo.glvToken.symbol : marketInfo.indexToken.symbol;
        const indexTokenAddress = isGlvInfo(marketInfo) ? marketInfo.glvToken.address : marketInfo.indexToken.address;

        return {
          address: getGlvOrMarketAddress(marketInfo),
          balance,
          balanceUsd: convertToUsd(balance, PLATFORM_TOKEN_DECIMALS, marketTokenPrice) ?? 0n,
          chainId: parseInt(chainId) as AnyChainId | GmxAccountPseudoChainId,
          symbol,
          indexTokenAddress,
          longTokenAddress: marketInfo.longToken.address,
          shortTokenAddress: marketInfo.shortToken.address,
        };
      })
      .filter((token): token is DisplayToken => token !== undefined);

    return { tokens, hasGmxAccountBalance, hasWalletBalance };
  }, [activeFilter, marketInfo, marketTokenPrice, tokenBalancesData]);

  const NETWORKS_FILTER = useMemo<RegularOption<"all" | "wallet" | "gmxAccount">[]>(() => {
    const wildCard: RegularOption<"all"> = {
      value: "all",
      label: (
        <span className="whitespace-nowrap">
          <Trans>All</Trans>
        </span>
      ),
    };

    const wallet: RegularOption<"wallet"> = {
      value: "wallet",
      label: (
        <span className="whitespace-nowrap">
          <Trans>Wallet Balance</Trans>
        </span>
      ),
    };

    const gmxAccount: RegularOption<"gmxAccount"> = {
      value: "gmxAccount",
      label: (
        <span className="whitespace-nowrap">
          <Trans>GMX Account Balance</Trans>
        </span>
      ),
    };

    return [wildCard, wallet, gmxAccount];
  }, []);

  const onSelectTokenAddress = (tokenChainId: AnyChainId | GmxAccountPseudoChainId) => {
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
          hideTabs || hasGmxAccountBalance !== hasWalletBalance ? null : (
            <div className="pb-12">
              <ButtonRowScrollFadeContainer>
                <Tabs
                  options={NETWORKS_FILTER}
                  selectedValue={activeFilter}
                  onChange={setActiveFilter}
                  type="inline"
                  qa="network-filter"
                  regularOptionClassname="shrink-0"
                />
              </ButtonRowScrollFadeContainer>
            </div>
          )
        }
        contentPadding={false}
      >
        <AvailableToTradeTokenList chainId={chainId} onSelectTokenAddress={onSelectTokenAddress} tokens={tokens} />
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
              displaySize={20}
              chainIdBadge={
                paySource === "sourceChain"
                  ? srcChainId
                  : paySource === "gmxAccount"
                    ? GMX_ACCOUNT_PSEUDO_CHAIN_ID
                    : undefined
              }
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
  address: string;
  symbol: string;
  indexTokenAddress: string | undefined;
  longTokenAddress: string;
  shortTokenAddress: string;
  balance: bigint;
  balanceUsd: bigint;
  chainId: AnyChainId | GmxAccountPseudoChainId;
};

function AvailableToTradeTokenList({
  chainId,
  onSelectTokenAddress,
  tokens,
}: {
  chainId: ContractsChainId;
  onSelectTokenAddress: (tokenChainId: AnyChainId | GmxAccountPseudoChainId) => void;
  tokens: DisplayToken[];
}) {
  return (
    <div>
      {tokens.map((token) => {
        return (
          <div
            key={token.chainId ?? "settlement-chain"}
            className="gmx-hover-gradient flex cursor-pointer items-center justify-between px-adaptive py-8"
            onClick={() => onSelectTokenAddress(token.chainId)}
          >
            <div className="text-body-large flex items-center gap-8">
              <TokenIcon symbol={token.symbol} className="size-40" displaySize={40} chainIdBadge={token.chainId} />

              <div>
                <div>
                  {isGlvAddress(chainId, token.address) ? (
                    "GLV"
                  ) : (
                    <>
                      {getTokenSymbolByMarket(chainId, token.address, "index")}
                      <span className="text-slate-100">/USD</span>
                    </>
                  )}
                </div>
                <div className="text-body-small text-slate-100">
                  [
                  {getMarketPoolName({
                    longToken: getToken(chainId, token.longTokenAddress),
                    shortToken: getToken(chainId, token.shortTokenAddress),
                  })}
                  ]
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-body-large">
                {token.balance > 0n &&
                  formatBalanceAmount(
                    token.balance,
                    PLATFORM_TOKEN_DECIMALS,
                    isGlvAddress(chainId, token.address) ? "GLV" : "GM",
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
