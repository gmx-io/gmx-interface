import Button from '@/components/Common/Button/Button';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { useCollateralWarnings } from '@/components/TradeBox/hooks/useCollateralWarnings';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { TokensData } from '@/selectors/token/types';
import { selectTradeboxAvailableAndDisabledTokensForCollateral } from '@/selectors/tradebox/selectTradeboxAvailableAndDisabledTokensForCollateral';
import { selectTradeboxCollateralTokenAddress } from '@/selectors/tradebox/selectTradeboxCollateralTokenAddress';
import { selectTradeboxMarketTokenAddress } from '@/selectors/tradebox/selectTradeboxMarketTokenAddress';
import { getPoolUsdWithoutPnl } from '@/utils/market/getPoolUsdWithoutPnl';
import { useAppStore } from '@/zustand/useAppStore';
import { Trans } from '@lingui/macro';
import cx from 'classnames';
import { useCallback, useEffect, useMemo } from 'react';
import TooltipsIcon from '@/img/tooltips.svg'
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';

export type Props = {
  selectedMarketAddress?: string;
  onSelectCollateralAddress: (address?: string) => void;
  isMarket: boolean;
};

export function CollateralSelectorRow(p: Props) {
  const marketsInfo = useAppStore(selectMarketsInfo);
  const marketTokenAddress = useAppStore(selectTradeboxMarketTokenAddress);
  const marketInfo = marketTokenAddress
    ? marketsInfo[marketTokenAddress]
    : undefined;
  const collateralTokenAddress = useAppStore(
    selectTradeboxCollateralTokenAddress
  );
  const setCollateralTokenAddress = p.onSelectCollateralAddress;
  const { availableTokens } = useAppStore(
    selectTradeboxAvailableAndDisabledTokensForCollateral
  );
  const warnings = useCollateralWarnings();

  const { allRelatedTokensMap, firstTokenAddress } = useMemo(() => {
    if (!marketInfo) {
      return {
        allRelatedTokensArr: [],
        allRelatedTokensMap: {},
        firstTokenAddress: undefined,
      };
    }

    const allRelatedTokensMap: TokensData = {};
    allRelatedTokensMap[marketInfo.longTokenAddress.toBase58()] =
      marketInfo.longToken;
    allRelatedTokensMap[marketInfo.shortTokenAddress.toBase58()] =
      marketInfo.shortToken;

    const allRelatedTokensArr = Object.values(allRelatedTokensMap).sort(
      (a, b) => {
        const aIsLong = a.address.equals(marketInfo.longTokenAddress);
        const bIsLong = b.address.equals(marketInfo.shortTokenAddress);
        const aLiquidity = getPoolUsdWithoutPnl(
          marketInfo,
          aIsLong,
          'minPrice'
        );
        const bLiquidity = getPoolUsdWithoutPnl(
          marketInfo,
          bIsLong,
          'midPrice'
        );
        return aLiquidity.gte(bLiquidity) ? -1 : 1;
      }
    );

    return {
      allRelatedTokensArr,
      allRelatedTokensMap,
      firstTokenAddress: allRelatedTokensArr[0]?.address.toBase58(),
    };
  }, [marketInfo]);

  const shouldUpdateCollateral = useMemo(() => {
    return (
      (!collateralTokenAddress ||
        !(collateralTokenAddress in allRelatedTokensMap)) &&
      firstTokenAddress !== undefined
    );
  }, [collateralTokenAddress, allRelatedTokensMap, firstTokenAddress]);

  useEffect(() => {
    if (shouldUpdateCollateral) {
      setCollateralTokenAddress(firstTokenAddress);
    }
  }, [shouldUpdateCollateral, firstTokenAddress, setCollateralTokenAddress]);

  const handleSelectCollateral = useCallback(
    (event: React.MouseEvent, tokenAddress: string) => {
      event.preventDefault();
      event.stopPropagation();

      if (tokenAddress !== collateralTokenAddress) {
        setCollateralTokenAddress(tokenAddress);
      }
    },
    [collateralTokenAddress, setCollateralTokenAddress]
  );

  return (
    <>
      <ExchangeInfoRow
        label={
          <div className=""> 
            <span><Trans>Collateral In</Trans></span>
            <TooltipWithPortal
              handle={<img src={TooltipsIcon} alt="" />}
              position="bottom"
              className='top-3 left-6'
              content={<p>tips</p>}
            />
          </div>
        }
        className="SwapBox-info-row"
        value={
          <div className="flex gap-2">
            {availableTokens?.map((token) => {
              const tokenAddress = token.address.toBase58();
              const isSelected = tokenAddress === collateralTokenAddress;

              return (
                <Button
                  key={tokenAddress}
                  variant={isSelected ? 'primary' : 'secondary'}
                  className={cx('rounded-4 !px-5 !py-0', {
                    'opacity-50': !isSelected,
                  })}
                  onClick={(e) => handleSelectCollateral(e, tokenAddress)}
                  slim
                >
                  <span>{token.symbol}</span>
                </Button>
              );
            })}
          </div>
        }
      />
      {warnings}
    </>
  );
}
