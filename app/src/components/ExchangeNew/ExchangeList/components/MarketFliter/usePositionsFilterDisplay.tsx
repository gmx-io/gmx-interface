import { useMemo } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { TreeNode } from '@/components/Common/FilterBox/FilterBox';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { getIconUrlPath } from '@/utils/lib/icon';

export const usePositionsFilterDisplay = () => {
  const { positions, marketsMap } = useAppStore(
    useShallow((state) => ({
      positions: state.positionState.positions,
      marketsMap: state.markets.marketsMap,
    }))
  );

  const positionsFilterData = useMemo(() => {
    const result: TreeNode[] = [];

    if (!positions || Object.keys(positions).length === 0) {
      return result;
    }

    const positionArray = Object.values(positions);

    const allPositionsNodes: TreeNode[] = [];

    positionArray.forEach((position) => {
      const marketTokenStr = position.marketTokenAddress.toString();
      const market = marketsMap?.get(marketTokenStr);

      if (market) {
        const indexToken = market.indexToken as string;
        const longToken = market.longToken as string;
        const shortToken = market.shortToken as string;

        const indexSymbol =
          GMX_SOLANA_TOKENS_RAW[indexToken]?.symbol || 'Unknown';
        const longSymbol =
          GMX_SOLANA_TOKENS_RAW[longToken]?.symbol || 'Unknown';
        const shortSymbol =
          GMX_SOLANA_TOKENS_RAW[shortToken]?.symbol || 'Unknown';
        const collateralToken = position.collateralTokenAddress.toString();
        const collateralSymbol =
          GMX_SOLANA_TOKENS_RAW[collateralToken]?.symbol || 'Unknown';

        const iconUrl = getIconUrlPath(indexSymbol, 24);
        const direction = position.isLong ? 'Long' : 'Short';
        const poolLabel =
          longToken === shortToken
            ? longSymbol
            : `${longSymbol}-${shortSymbol}`;

        const displayLabel = `${indexSymbol}/USD ${direction} [${poolLabel}] (${collateralSymbol})`;

        allPositionsNodes.push({
          key: position.address.toString(),
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
                <span>/USD</span>&nbsp;
                <span
                  style={{
                    color: position.isLong ? '#31C366' : '#FF5454',
                    fontWeight: 500,
                  }}
                >
                  {direction}
                </span>
                &nbsp;&nbsp;&nbsp;
                <span style={{ color: '#A3A3A3' }}>[{poolLabel}]</span>
                &nbsp;&nbsp;&nbsp;
                <span style={{ color: '#A3A3A3' }}>({collateralSymbol})</span>
              </span>
            </div>
          ),
          value: position.address.toString(),
          searchValue: displayLabel,
        });
      }
    });

    if (allPositionsNodes.length > 0) {
      const openPositionsNode: TreeNode = {
        key: 'open_positions_with_orders',
        label: 'Open positions with orders',
        value: 'open_positions_with_orders',
        children: allPositionsNodes,
      };
      result.push(openPositionsNode);
    }

    return result;
  }, [positions, marketsMap]);

  return positionsFilterData;
};
