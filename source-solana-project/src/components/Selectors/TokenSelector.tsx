import SearchInput from '@/components/Common/Input/SearchInput';
import { TableTd, TableTh } from '@/components/Common/Table/Table';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileList,
  useSelectorClose,
} from '@/components/Common/SelectorBase/SelectorBase';
import { BN_ZERO } from '@/config/constants';
import { MarketsInfo } from '@/selectors/market/types';
import { Token, TokenInfo, TokensData } from '@/selectors/token/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { formatAmount, formatUsd } from '@/utils/legacy/format';
import { getByKey } from '@/utils/lib/object';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { isMarketToken } from '@/utils/token/isMarketToken';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { useCallback, useState } from 'react';
import { useMedia } from 'react-use';

type Props = {
  label?: string;
  className?: string;
  size?: 'm' | 'l';
  token?: Token;
  tokens: Token[];
  infoTokens?: TokensData;
  tokenInfo?: TokenInfo;
  showBalances: boolean;
  showTokenImgInDropdown?: boolean;
  showSymbolImage?: boolean;
  onSelectToken: (token: Token) => void;
  qa?: string;
  marketsInfoData?: MarketsInfo;
  marketTokensData?: TokensData;
};

export default function TokenSelector(props: Props) {
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);
  const [searchKeyword, setSearchKeyword] = useState('');

  // Get token display name based on whether it's a market token
  const getTokenDisplayName = (token: Token) => {
    if (isMarketToken(token, props.marketTokensData)) {
      const market = getByKey(props.marketsInfoData, token.address.toBase58());
      return market ? `GM: ${getMarketIndexName(market)}` : token.symbol;
    }
    return token.symbol;
  };

  // Get token symbol for icon display
  const getTokenIconSymbol = (token: Token) => {
    if (isMarketToken(token, props.marketTokensData)) {
      const market = getByKey(props.marketsInfoData, token.address.toBase58());
      if (market) {
        // For GM tokens, use the indexToken symbol
        return market.indexToken.symbol;
      }
      return token.symbol;
    }
    return token.symbol;
  };

  // Filter and sort tokens
  const filteredAndSortedTokens = [...props.tokens]
    .filter((token) => {
      if (!searchKeyword.trim()) return true;
      return getTokenDisplayName(token)
        .toLowerCase()
        .includes(searchKeyword.toLowerCase().trim());
    })
    .sort((a, b) => {
      const aInfo = props.infoTokens?.[a.address.toBase58()];
      const bInfo = props.infoTokens?.[b.address.toBase58()];
      const aBalanceUsd = aInfo
        ? convertTokenAmountToUsd(
            aInfo.balance || BN_ZERO,
            a.decimals,
            aInfo.prices.minPrice
          )
        : BN_ZERO;
      const bBalanceUsd = bInfo
        ? convertTokenAmountToUsd(
            bInfo.balance || BN_ZERO,
            b.decimals,
            bInfo.prices.minPrice
          )
        : BN_ZERO;

      // If both values are 0, sort by name
      if (aBalanceUsd.eq(BN_ZERO) && bBalanceUsd.eq(BN_ZERO)) {
        return getTokenDisplayName(a).localeCompare(getTokenDisplayName(b));
      }
      // Otherwise sort by USD value
      return bBalanceUsd.cmp(aBalanceUsd);
    });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && filteredAndSortedTokens.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        props.onSelectToken(filteredAndSortedTokens[0]);
      }
    },
    [filteredAndSortedTokens, props]
  );

  return (
    <SelectorBase
      label={
        <div className="flex items-center gap-2">
          {props.token && (
            <TokenIcon
              symbol={getTokenIconSymbol(props.token)}
              displaySize={20}
              importSize={40}
              className="relative overflow-hidden rounded-full"
            />
          )}
          <span>
            {props.token ? getTokenDisplayName(props.token) : props.label}
          </span>
        </div>
      }
      modalLabel={t`Select Token`}
      qa={props.qa || 'token-selector'}
      popoverYOffset={10}
      popoverXOffset={10}
      chevronStyle="compact"
      chevronSize={20}
    >
      <div className={`${isMobile ? 'px-5 pt-0' : 'px-10 pt-10'}`}>
        <SearchInput
          className="*:!text-body-medium mb-0"
          value={searchKeyword}
          setValue={setSearchKeyword}
          placeholder={t`Search Token`}
          onKeyDown={handleKeyDown}
        />
      </div>
      {isMobile ? (
        <TokenSelectorMobile
          {...props}
          sortedTokens={filteredAndSortedTokens}
          getTokenDisplayName={getTokenDisplayName}
          getTokenIconSymbol={getTokenIconSymbol}
        />
      ) : (
        <TokenSelectorDesktop
          {...props}
          sortedTokens={filteredAndSortedTokens}
          getTokenDisplayName={getTokenDisplayName}
          getTokenIconSymbol={getTokenIconSymbol}
        />
      )}
    </SelectorBase>
  );
}

function TokenSelectorDesktop({
  sortedTokens,
  getTokenDisplayName,
  getTokenIconSymbol,
  ...props
}: Props & {
  sortedTokens: Token[];
  getTokenDisplayName: (token: Token) => string;
  getTokenIconSymbol: (token: Token) => string;
}) {
  const close = useSelectorClose();

  return (
    <table className="text-body-medium w-full" data-qa="token-selector-table">
      <thead>
        <tr>
          <TableTh className="text-body-medium flex items-center gap-2">{t`Token`}</TableTh>
          <TableTh className="text-body-medium text-left">{t`Amount`}</TableTh>
          <TableTh className="text-body-medium text-right">{t`Value`}</TableTh>
        </tr>
      </thead>
      <tbody>
        {sortedTokens.map((token) => {
          const tokenInfo = props.infoTokens?.[token.address.toBase58()];
          const balance = tokenInfo?.balance || BN_ZERO;
          const balanceUsd = tokenInfo
            ? convertTokenAmountToUsd(
                balance,
                token.decimals,
                tokenInfo.prices.minPrice
              )
            : BN_ZERO;

          return (
            <TokenListItemDesktop
              key={token.address.toBase58()}
              token={token}
              balance={balance}
              balanceUsd={balanceUsd}
              showBalances={props.showBalances}
              onSelect={() => {
                props.onSelectToken(token);
                close();
              }}
              displayName={getTokenDisplayName(token)}
              iconSymbol={getTokenIconSymbol(token)}
            />
          );
        })}
      </tbody>
    </table>
  );
}

function TokenListItemDesktop({
  token,
  balance,
  balanceUsd,
  showBalances,
  onSelect,
  displayName,
  iconSymbol,
}: {
  token: Token;
  balance: BN;
  balanceUsd: BN;
  showBalances: boolean;
  onSelect: () => void;
  displayName: string;
  iconSymbol: string;
}) {
  return (
    <SelectorBaseDesktopRow
      onClick={onSelect}
      className="hover:bg-dark-blue-100 active:bg-dark-blue-200"
    >
      <TableTd className="text-body-medium flex items-center gap-2">
        <TokenIcon
          symbol={iconSymbol}
          displaySize={20}
          importSize={24}
          className="relative overflow-hidden rounded-full"
        />
        <div>{displayName}</div>
      </TableTd>
      <TableTd className="text-body-medium text-left">
        {showBalances && formatAmount(balance, token.decimals, 4, true, true)}
      </TableTd>
      <TableTd className="text-body-medium text-right">
        {showBalances && formatUsd(balanceUsd)}
      </TableTd>
    </SelectorBaseDesktopRow>
  );
}

function TokenSelectorMobile({
  sortedTokens,
  getTokenDisplayName,
  getTokenIconSymbol,
  ...props
}: Props & {
  sortedTokens: Token[];
  getTokenDisplayName: (token: Token) => string;
  getTokenIconSymbol: (token: Token) => string;
}) {
  const close = useSelectorClose();

  return (
    <div className="animate-slide-up">
      <SelectorBaseMobileList>
        <div className="text-body-medium mt-5 grid h-[30px] grid-cols-[2fr_2fr_1fr] items-center gap-2 px-5 text-slate-300">
          <div className="text-left">{t`Token`}</div>
          <div className="text-left">{t`Amount`}</div>
          <div className="text-right">{t`Value`}</div>
        </div>
        {sortedTokens.map((token) => {
          const tokenInfo = props.infoTokens?.[token.address.toBase58()];
          const balance = tokenInfo?.balance || BN_ZERO;
          const balanceUsd = tokenInfo
            ? convertTokenAmountToUsd(
                balance,
                token.decimals,
                tokenInfo.prices.minPrice
              )
            : BN_ZERO;

          return (
            <div
              key={token.address.toBase58()}
              className="text-body-medium hover:bg-dark-blue-100 active:bg-dark-blue-200 rounded-4 grid cursor-pointer grid-cols-[2fr_2fr_1fr] items-center gap-2 p-5"
              onClick={() => {
                props.onSelectToken(token);
                close();
              }}
            >
              <div className="flex items-center gap-2">
                <TokenIcon
                  symbol={getTokenIconSymbol(token)}
                  displaySize={20}
                  importSize={24}
                  className="relative overflow-hidden rounded-full"
                />
                <div>{getTokenDisplayName(token)}</div>
              </div>
              <div className="text-left">
                {props.showBalances &&
                  formatAmount(balance, token.decimals, 4, true, true)}
              </div>
              <div className="text-right">
                {props.showBalances && formatUsd(balanceUsd)}
              </div>
            </div>
          );
        })}
      </SelectorBaseMobileList>
    </div>
  );
}
