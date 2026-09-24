import '@/components/TradeBox/TradeBox.scss';

import Tab from '@/components/Common/Tab/Tab';
import { SwapCard } from '@/components/TradeBox/Cards/SwapCard';
import { MarketCard } from '@/components/TradeBox/Cards/MarketCard';
import { LimitCard } from '@/components/TradeBox/Cards/LimitCard';
import { TPSLCard } from '@/components/TradeBox/Cards/TPSLCard';
import { WalletCard } from '@/components/TradeBox/Cards/WalletCard';
import { TradeForm } from '@/components/TradeBox/components/TradeForm';
import { PendingTxsSetter } from '@/contexts/pending/types';
import longImg from '@/img/long.svg';
import shortImg from '@/img/short.svg';
import swapImg from '@/img/swap.svg';
import { TradeMode, TradeType } from '@/selectors/trade/types';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { useCallback, memo } from 'react';
import { selectResetTradeboxInputs } from '@/selectors/tradebox/baseSelectors';
import { selectSetTradeboxTradeType } from '@/selectors/tradebox/baseSelectors';
import { selectSetTradeboxTradeMode } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxAvailableTradeModes } from '@/selectors/tradebox/selectTradeboxAvailableTradeModes';
import { selectTradeboxIsWrapOrUnwrap } from '@/selectors/tradebox/selectTradeboxIsWrapOrUnwrap';
import { selectTradeboxTradeMode } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxTradeType } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { usePriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import { selectTradeboxTradeFees } from '@/selectors/tradebox/selectTradeboxTradeFees';
import BoostTips from '../Exchange/BoostTips';

interface Prop {
  setPendingTxs: PendingTxsSetter;
}

function TradeBox({ setPendingTxs }: Prop) {
  const tradeTypeIcons = {
    [TradeType.Long]: longImg,
    [TradeType.Short]: shortImg,
    [TradeType.Swap]: swapImg,
  };

  const tradeTypeLabels = {
    [TradeType.Long]: t`Long`,
    [TradeType.Short]: t`Short`,
    [TradeType.Swap]: t`Swap`,
  };

  const tradeModeLabels = {
    [TradeMode.Market]: t`Market`,
    [TradeMode.Limit]: t`Limit`,
    // [TradeMode.Trigger]: t`TP/SL`,
  };

  const tradeTypeClassNames = {
    [TradeType.Long]: {
      active: '!bg-[#1F3445] border-b-[2px] border-b-green-500',
      regular: 'border-b border-b-[transparent]',
    },
    [TradeType.Short]: {
      active: '!bg-[#392A46] border-b-[2px] border-b-red-500',
      regular: 'border-b border-b-[transparent]',
    },
    [TradeType.Swap]: {
      active: '!bg-[#323232] border-b-[2px] border-b-primary-300',
      regular: 'border-b border-b-[transparent]',
    },
  };

  void setPendingTxs;
  const { isSwap, isMarket, isTrigger, isLimit, isPosition } = useAppStore(
    selectTradeboxTradeFlags
  );
  const isWrapOrUnwrap = useAppStore(selectTradeboxIsWrapOrUnwrap);
  const tradeType = useAppStore(selectTradeboxTradeType);
  const tradeMode = useAppStore(selectTradeboxTradeMode);
  const availalbleTradeModes = useAppStore(selectTradeboxAvailableTradeModes);
  const setTradeMode = useAppStore(selectSetTradeboxTradeMode);
  const setTradeType = useAppStore(selectSetTradeboxTradeType);
  const resetTradeboxInputs = useAppStore(selectResetTradeboxInputs);
  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const fees = useAppStore(selectTradeboxTradeFees);

  const priceImpactWarningState = usePriceImpactWarningState({
    collateralImpact: fees?.positionCollateralPriceImpact,
    positionImpact: fees?.positionPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    swapProfitFee: fees?.swapProfitFee,
    tradeFlags,
  });

  const handleChangeTradeType = useCallback(
    (tradeType: TradeType) => {
      resetTradeboxInputs();
      setTradeType(tradeType);
    },
    [resetTradeboxInputs, setTradeType]
  );

  const handleSelectTradeMode = useCallback(
    (tradeMode: TradeMode) => {
      resetTradeboxInputs();
      setTradeMode(tradeMode);
    },
    [resetTradeboxInputs, setTradeMode]
  );

  return (
    <>
      <div className="App-box SwapBox rounded-b-8">
        <BoostTips />
        <Tab
          // icons={tradeTypeIcons}
          options={Object.values(TradeType)}
          optionLabels={tradeTypeLabels}
          option={tradeType}
          onChange={handleChangeTradeType}
          optionClassnames={tradeTypeClassNames}
          className="Exchange-swap-option-tabs rounded-t-8 h-[40px] border-b border-b-[#535353]"
        />
        <Tab
          options={availalbleTradeModes}
          optionLabels={tradeModeLabels}
          className="SwapBox-asset-options-tabs !pl-[1.2rem]"
          type="card"
          option={tradeMode}
          onChange={handleSelectTradeMode}
        />
        <TradeForm priceImpactWarningState={priceImpactWarningState} />
      </div>

      {isMarket && isPosition && <MarketCard />}
      {isLimit && isPosition && <LimitCard />}
      {isTrigger && <TPSLCard />}
      {isSwap && !isWrapOrUnwrap && <SwapCard />}
      <WalletCard />
    </>
  );
}

export default memo(TradeBox);
