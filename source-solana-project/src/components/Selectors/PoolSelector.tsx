import SearchInput from '@/components/Common/Input/SearchInput';
import {
  TableTd,
  TableTh,
  TableTheadTr,
} from '@/components/Common/Table/Table';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileList,
  useSelectorClose,
} from '@/components/Common/SelectorBase/SelectorBase';
import { BN_ZERO, GM_DECIMALS } from '@/config/constants';
import { GlvOrMarketInfo } from '@/selectors/glv/types';
import { TokensData } from '@/selectors/token/types';
import { getGlvDisplayName } from '@/utils/glv/getGlvDisplayName';
import { getGlvOrMarketAddress } from '@/utils/glv/getGlvOrMarketAddress';
import { isGlvInfo } from '@/utils/glv/isGlvInfo';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { formatTokenAmount, formatUsd } from '@/utils/legacy/format';
import { getByKey } from '@/utils/lib/object';
import { searchBy } from '@/utils/lib/searchBy';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { getNormalizedTokenSymbol } from '@/utils/token/getNormalizedTokenSymbol';
import { stripBlacklistedWords } from '@/utils/token/stripBlacklistedWords';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { useMemo, useState } from 'react';
import { useMedia } from 'react-use';

type Props = {
  label?: string;
  className?: string;
  selectedMarketAddress?: string;
  selectedIndexName?: string;
  markets: GlvOrMarketInfo[];
  marketTokensData?: TokensData;
  showBalances?: boolean;
  isSideMenu?: boolean;
  getMarketState?: (market: GlvOrMarketInfo) => MarketState | undefined;
  onSelectMarket: (market: GlvOrMarketInfo) => void;
  showAllPools?: boolean;
  showIndexIcon?: boolean;
  /**
   * @default true
   */
  withFilters?: boolean;
  size?: 'l' | 'm';
};

type MarketState = {
  disabled?: boolean;
  message?: string;
  warning?: string;
};

type MarketOption = {
  indexName: string;
  poolName: string;
  name: string;
  marketInfo: GlvOrMarketInfo;
  balance: BN;
  balanceUsd: BN;
  state?: MarketState;
};

export function PoolSelector({
  selectedMarketAddress,
  selectedIndexName,
  label,
  markets,
  marketTokensData,
  showBalances,
  onSelectMarket,
  getMarketState,
  showAllPools = false,
  showIndexIcon = false,
  size = 'm',
  className,
}: Omit<Props, 'isSideMenu' | 'withFilters'>) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);

  const marketsOptions: MarketOption[] = useMemo(() => {
    const allMarkets = markets
      .filter(
        (market) =>
          !market.isDisabled &&
          (isGlvInfo(market) ? true : market.indexToken) &&
          (showAllPools || getMarketIndexName(market) === selectedIndexName)
      )
      .map((marketInfo) => {
        const indexName = getMarketIndexName(marketInfo);
        const poolName = getMarketPoolName(marketInfo);
        const marketToken = getByKey(
          marketTokensData,
          getGlvOrMarketAddress(marketInfo)
        );
        const gmBalance = marketToken?.balance;
        const gmBalanceUsd = convertTokenAmountToUsd(
          marketToken?.balance,
          marketToken?.decimals,
          marketToken?.prices.minPrice
        );
        const state = getMarketState?.(marketInfo);

        return {
          indexName,
          poolName,
          name: isGlvInfo(marketInfo)
            ? (marketInfo.name ?? 'GLV')
            : marketInfo.name,
          marketInfo,
          balance: gmBalance ?? BN_ZERO,
          balanceUsd: gmBalanceUsd ?? BN_ZERO,
          state,
        };
      });

    // Separate GLV and GM markets
    const glvMarkets: MarketOption[] = [];
    const gmMarketsByIndex: { [key: string]: MarketOption[] } = {};

    for (const market of allMarkets) {
      if (isGlvInfo(market.marketInfo)) {
        glvMarkets.push(market);
      } else {
        const indexName = market.indexName;
        gmMarketsByIndex[indexName] = gmMarketsByIndex[indexName] || [];
        gmMarketsByIndex[indexName].push(market);
      }
    }

    // Sort GLV markets by balance
    glvMarkets.sort((a, b) => (b.balanceUsd.gt(a.balanceUsd) ? 1 : -1));

    // Sort GM markets by total value within each index
    const sortedGmMarkets = Object.entries(gmMarketsByIndex)
      .map(([, markets]) => {
        // Calculate total value for the market group
        const totalValue = markets.reduce(
          (sum, market) => sum.add(market.balanceUsd),
          BN_ZERO
        );
        return { markets, totalValue };
      })
      .sort((a, b) => (b.totalValue.gt(a.totalValue) ? 1 : -1))
      .flatMap(({ markets }) =>
        // Sort markets within each group by balance
        markets.sort((a, b) => (b.balanceUsd.gt(a.balanceUsd) ? 1 : -1))
      );

    // Combine GLV markets and sorted GM markets
    return [...glvMarkets, ...sortedGmMarkets];
  }, [
    getMarketState,
    marketTokensData,
    markets,
    selectedIndexName,
    showAllPools,
  ]);

  const marketInfo = useMemo(
    () =>
      marketsOptions.find(
        (option) =>
          getGlvOrMarketAddress(option.marketInfo) === selectedMarketAddress
      )?.marketInfo,
    [marketsOptions, selectedMarketAddress]
  );

  const filteredOptions = useMemo(() => {
    return searchKeyword.trim()
      ? searchBy(
          marketsOptions,
          [
            (item) =>
              isGlvInfo(item.marketInfo)
                ? getGlvDisplayName(item.marketInfo)
                : item.name,
            (item) => stripBlacklistedWords(item.marketInfo.longToken.symbol),
            (item) => stripBlacklistedWords(item.marketInfo.shortToken.symbol),
          ],
          searchKeyword
        )
      : marketsOptions;
  }, [marketsOptions, searchKeyword]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredOptions.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      onSelectMarket(filteredOptions[0].marketInfo);
    }
  };

  const getTokenSymbol = (marketInfo: GlvOrMarketInfo) => {
    if (marketInfo.isSpotOnly) {
      return (
        getNormalizedTokenSymbol(marketInfo.longToken.symbol) +
        getNormalizedTokenSymbol(marketInfo.shortToken.symbol)
      );
    }
    return isGlvInfo(marketInfo)
      ? getNormalizedTokenSymbol(marketInfo.glvToken.symbol)
      : getNormalizedTokenSymbol(marketInfo.indexToken.symbol);
  };

  return (
    <SelectorBase
      label={
        <div className="flex items-center gap-2">
          {marketInfo && showIndexIcon && (
            <TokenIcon
              className="relative overflow-hidden rounded-full"
              symbol={getTokenSymbol(marketInfo)}
              importSize={40}
              displaySize={20}
            />
          )}
          {marketInfo && (
            <div className={size === 'l' ? 'text-body-large' : ''}>
              {isGlvInfo(marketInfo)
                ? 'GLV: ' + getMarketIndexName(marketInfo)
                : showAllPools
                  ? `${getMarketIndexName(marketInfo)}`
                  : getMarketPoolName(marketInfo)}
            </div>
          )}
        </div>
      }
      modalLabel={label || t`Select Pool`}
      qa="pool-selector"
      popoverXOffset={10}
      popoverYOffset={5}
      chevronStyle="compact"
      chevronSize={20}
      handleClassName={className}
    >
      <div className={`${isMobile ? 'px-5 pt-0' : 'px-10 pt-10'}`}>
        <SearchInput
          className="*:!text-body-medium mb-0"
          value={searchKeyword}
          setValue={setSearchKeyword}
          placeholder={t`Search Pool`}
          onKeyDown={handleKeyDown}
        />
      </div>
      {isMobile ? (
        <PoolSelectorMobile
          options={filteredOptions}
          showBalances={showBalances}
          onSelectOption={onSelectMarket}
        />
      ) : (
        <PoolSelectorDesktop
          options={filteredOptions}
          showBalances={showBalances}
          onSelectOption={onSelectMarket}
        />
      )}
    </SelectorBase>
  );
}

function PoolSelectorDesktop({
  options,
  showBalances,
  onSelectOption,
}: {
  options: MarketOption[];
  showBalances?: boolean;
  onSelectOption: (market: GlvOrMarketInfo) => void;
}) {
  const close = useSelectorClose();

  return (
    <table className="text-body-medium w-full" data-qa="pool-selector-table">
      <thead>
        <TableTheadTr>
          <TableTh className="text-body-medium flex items-center gap-2">
            {t`Market`}
          </TableTh>
          <TableTh className="text-body-medium text-left">{t`Pool`}</TableTh>
          <TableTh className="text-body-medium text-left">
            {showBalances && t`Amount`}
          </TableTh>
          <TableTh className="text-body-medium text-right">
            {showBalances && t`Value`}
          </TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {options.map((option) => (
          <PoolListItemDesktop
            key={getGlvOrMarketAddress(option.marketInfo)}
            option={option}
            showBalances={showBalances}
            onSelect={() => {
              onSelectOption(option.marketInfo);
              close();
            }}
          />
        ))}
      </tbody>
    </table>
  );
}

function PoolListItemDesktop({
  option,
  showBalances,
  onSelect,
}: {
  option: MarketOption;
  showBalances?: boolean;
  onSelect: () => void;
}) {
  const getTokenSymbol = (marketInfo: GlvOrMarketInfo) => {
    if (marketInfo.isSpotOnly) {
      return (
        getNormalizedTokenSymbol(marketInfo.longToken.symbol) +
        getNormalizedTokenSymbol(marketInfo.shortToken.symbol)
      );
    }
    return isGlvInfo(marketInfo)
      ? getNormalizedTokenSymbol(marketInfo.glvToken.symbol)
      : getNormalizedTokenSymbol(marketInfo.indexToken.symbol);
  };

  const getPoolName = (marketInfo: GlvOrMarketInfo) => {
    if (isGlvInfo(marketInfo)) {
      return `[${marketInfo.longToken.symbol}-${marketInfo.shortToken.symbol}]`;
    }
    if (marketInfo.longToken.address.equals(marketInfo.shortToken.address)) {
      return `[${marketInfo.longToken.symbol}]`;
    } else {
      return `[${marketInfo.longToken.symbol}-${marketInfo.shortToken.symbol}]`;
    }
  };

  const getMarketName = (marketInfo: GlvOrMarketInfo) => {
    if (isGlvInfo(marketInfo)) {
      return marketInfo.isSpotOnly ? 'SWAP-ONLY' : getGlvDisplayName(marketInfo);
    }
    return `${option.indexName}`;
  };

  return (
    <SelectorBaseDesktopRow
      onClick={onSelect}
      className="hover:bg-dark-blue-100 active:bg-dark-blue-200"
      disabled={option.state?.disabled}
      disabledMessage={option.state?.message}
    >
      <TableTd className="text-body-medium flex items-center gap-2">
        <TokenIcon
          symbol={getTokenSymbol(option.marketInfo)}
          displaySize={20}
          importSize={40}
          className="relative overflow-hidden rounded-full"
        />
        <div>{getMarketName(option.marketInfo)}</div>
      </TableTd>
      <TableTd className="text-body-medium text-left">
        {getPoolName(option.marketInfo)}
      </TableTd>
      <TableTd className="text-body-medium text-left">
        {showBalances && formatTokenAmount(option.balance, GM_DECIMALS)}
      </TableTd>
      <TableTd className="text-body-medium text-right">
        {showBalances && formatUsd(option.balanceUsd)}
      </TableTd>
    </SelectorBaseDesktopRow>
  );
}

function PoolSelectorMobile({
  options,
  showBalances,
  onSelectOption,
}: {
  options: MarketOption[];
  showBalances?: boolean;
  onSelectOption: (market: GlvOrMarketInfo) => void;
}) {
  const close = useSelectorClose();
  const isSmallMobile = useMedia('(max-width: 600px)');

  const getPoolName = (marketInfo: GlvOrMarketInfo) => {
    if (isGlvInfo(marketInfo)) {
      return `[${marketInfo.longToken.symbol}-${marketInfo.shortToken.symbol}]`;
    }
    if (marketInfo.longToken.address.equals(marketInfo.shortToken.address)) {
      return `[${marketInfo.longToken.symbol}]`;
    } else {
      return `[${marketInfo.longToken.symbol}-${marketInfo.shortToken.symbol}]`;
    }
  };

  const getMarketName = (marketInfo: GlvOrMarketInfo) => {
    if (isGlvInfo(marketInfo)) {
      return marketInfo.isSpotOnly ? 'SWAP-ONLY' : getGlvDisplayName(marketInfo);
    }
    return `${getMarketIndexName(marketInfo)}`;
  };

  const getTokenSymbol = (marketInfo: GlvOrMarketInfo) => {
    if (marketInfo.isSpotOnly) {
      return (
        getNormalizedTokenSymbol(marketInfo.longToken.symbol) +
        getNormalizedTokenSymbol(marketInfo.shortToken.symbol)
      );
    }
    return isGlvInfo(marketInfo)
      ? getNormalizedTokenSymbol(marketInfo.glvToken.symbol)
      : getNormalizedTokenSymbol(marketInfo.indexToken.symbol);
  };

  return (
    <SelectorBaseMobileList>
      <div
        className={`text-body-medium mt-5 grid h-[30px] items-center gap-2 px-5 text-slate-300 ${isSmallMobile ? 'grid-cols-[2fr_2fr_1fr]' : 'grid-cols-[2fr_2fr_1fr_1fr]'}`}
      >
        <div className="text-left">{t`Market`}</div>
        <div className="text-left">{t`Pool`}</div>
        <div className="text-left">{showBalances && t`Amount`}</div>
        {!isSmallMobile && (
          <div className="text-right">{showBalances && t`Value`}</div>
        )}
      </div>
      {options.map((option) => (
        <div
          key={getGlvOrMarketAddress(option.marketInfo)}
          className={`text-body-medium hover:bg-dark-blue-100 active:bg-dark-blue-200 rounded-4 grid cursor-pointer items-center gap-2 p-5 ${isSmallMobile ? 'grid-cols-[2fr_2fr_1fr]' : 'grid-cols-[2fr_2fr_1fr_1fr]'}`}
          onClick={() => {
            if (!option.state?.disabled) {
              onSelectOption(option.marketInfo);
              close();
            }
          }}
        >
          <div className="flex items-center gap-2">
            <TokenIcon
              symbol={getTokenSymbol(option.marketInfo)}
              displaySize={20}
              importSize={40}
              className="relative overflow-hidden rounded-full"
            />
            <div>{getMarketName(option.marketInfo)}</div>
          </div>
          <div className="text-left">{getPoolName(option.marketInfo)}</div>
          <div className="text-left">
            {showBalances && formatTokenAmount(option.balance, GM_DECIMALS)}
          </div>
          {!isSmallMobile && (
            <div className="text-right">
              {showBalances && formatUsd(option.balanceUsd)}
            </div>
          )}
        </div>
      ))}
    </SelectorBaseMobileList>
  );
}
