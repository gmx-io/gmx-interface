import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import { TreeNode } from '@/components/Common/FilterBox/FilterBox';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { getIconUrlPath } from '@/utils/lib/icon';
import { usePositionsFilterDisplay } from './usePositionsFilterDisplay';

export const useMarketFilterData = () => {
  const { marketsMap } = useAppStore(useShallow((state) => state.markets));
  const positionsFilterData = usePositionsFilterDisplay();

  const marketFilterData = useMemo(() => {
    const direction: TreeNode = {
      key: 'direction',
      label: 'Direction',
      value: 'direction',
      children: [
        {
          key: 'Longs',
          label: 'Longs',
          value: 'Longs',
        },
        {
          key: 'Shorts',
          label: 'Shorts',
          value: 'Shorts',
        },
        {
          key: 'Swaps',
          label: 'Swaps',
          value: 'Swaps',
        },
      ],
    };

    const result: TreeNode[] = [direction];

    if (!marketsMap || marketsMap.size === 0) {
      return result;
    }

    const marketNodes: TreeNode[] = [];
    marketsMap.forEach(
      (market: Record<string, unknown>, marketToken: string) => {
        const indexToken = market?.indexToken;
        const longToken = market?.longToken;
        const shortToken = market?.shortToken;

        if (
          indexToken &&
          typeof indexToken === 'string' &&
          longToken &&
          typeof longToken === 'string' &&
          shortToken &&
          typeof shortToken === 'string'
        ) {
          const indexTokenInfo = GMX_SOLANA_TOKENS_RAW[indexToken] as
            | { symbol?: string }
            | undefined;
          const indexSymbol = indexTokenInfo?.symbol ?? 'Unknown';

          const longTokenInfo = GMX_SOLANA_TOKENS_RAW[longToken] as
            | { symbol?: string }
            | undefined;
          const longSymbol = longTokenInfo?.symbol ?? 'Unknown';

          const shortTokenInfo = GMX_SOLANA_TOKENS_RAW[shortToken] as
            | { symbol?: string }
            | undefined;
          const shortSymbol = shortTokenInfo?.symbol ?? 'Unknown';

          const iconUrl = getIconUrlPath(indexSymbol, 24);

          const poolLabel =
            longToken === shortToken
              ? longSymbol
              : `${longSymbol}-${shortSymbol}`;

          marketNodes.push({
            key: marketToken,
            label: (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  className="token-icon"
                  src={iconUrl || ''}
                  alt={indexSymbol}
                  width={20}
                />
                &nbsp;
                <span className="token-symbol">
                  {indexSymbol}
                  <span>/USD</span>
                  &nbsp;
                  <span style={{ color: '#A3A3A3' }}>[{poolLabel}]</span>
                </span>
              </div>
            ),
            value: marketToken,
            searchValue: `${indexSymbol}/USD [${poolLabel}]`,
          });
        }
      }
    );

    const markets: TreeNode = {
      key: 'markets',
      label: 'Markets',
      value: 'markets',
      children: marketNodes,
    };

    return [...positionsFilterData, ...result, markets];
  }, [marketsMap, positionsFilterData]);

  return marketFilterData;
};
