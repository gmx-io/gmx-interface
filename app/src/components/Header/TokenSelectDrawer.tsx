import './TokenSelectDrawer.scss';

import React, { useMemo, useRef } from 'react';
import { formatParseUsdToBN, formatPriceUsd, formatAmount } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { formatGmxSymbol } from '@/components/TradeBoxNew/utils/formatGmxSymbol';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
import { getIconUrlPath } from '@/utils/lib/icon';

interface Token {
  tokenAddress: string;
  tokenName: string;
  displaySymbol: string;
  amount: string;
  value: string;
  lpAmount?: string;
  maxPrice?: string;
  minPrice?: string;
  percentChange24h?: string;
  decimals?: number;
  unitPrice: string | number,
  price: BN,
  indexToken?: string,
}

interface HeaderSwapPanelProps {
  payerSwapTokens: Token[];
  sortedTokens?: Token[];
  onSelectToken?: (token) => void;
  onClose?: () => void;
}

const TokenSelectDrawer: React.FC<HeaderSwapPanelProps> = ({
  payerSwapTokens,
  sortedTokens
}) => {
  const drawerContentRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(true);

  const filteredAndSortedTokens = useMemo(() => {
    const source = sortedTokens?.length ? sortedTokens : payerSwapTokens;
    if (!source) return [];

    return source
      .filter(token => new BN(token?.amount || '0').gt(new BN(0)))
      .map((token) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const symbol: string = token.tokenName === 'WGMX' ? 'GMX' : token.tokenName || formatGmxSymbol(token.indexToken || '');

        return {
          ...token,
          displaySymbol: symbol,
        }
      });
  }, [payerSwapTokens, sortedTokens]);

  const Empty = ({ description }: { description: string }) => {
    return (
      <div className="custom-empty-container">
        <span className="text-body-medium">{description || t`No data available`}</span>
      </div>
    )
  }

  const drawerNode = (
    <div className="token-select-drawer">
      <div ref={drawerContentRef} className="select-content" onClick={(e) => e.stopPropagation()}>
        <div className="select-table">
          <div className="table-body">
            {filteredAndSortedTokens.map((token) => {
              return (
                <div
                  key={token.displaySymbol}
                  className="table-row"
                >
                  <div className="table-cell market-cell">
                    <img
                      className="token-icon"
                      src={getIconUrlPath(token?.displaySymbol, 24)}
                      alt={token?.displaySymbol}
                      width={40}
                    />
                    <span className="token-symbol">
                      {token?.tokenName === 'WGMX' ? 'GMX' : token?.tokenName || formatGmxSymbol(token?.indexToken || '')}
                    </span>
                  </div>
                  <div className='right-cell'>
                    {
                      <>
                        <div className="table-cell price-cell">
                          <span className="amount">{formatAmount(new BN(token?.amount || '0'), token?.decimals)}</span>
                          <span className='price'>{formatPriceUsd(formatParseUsdToBN(formatAmount(new BN(token?.amount || '0'), token?.decimals).toString() || "0", token?.decimals).mul(new BN(token?.price || 0)), { fallbackToZero: true })}</span>
                        </div>
                      </>
                    }
                  </div>
                </div>
              );
            })}

            {
              filteredAndSortedTokens.length === 0 &&
              <Empty description={t`No matching assets found`} />
            }
          </div>
        </div>
      </div>
    </div>
  );

  return drawerNode;
};

export default TokenSelectDrawer;