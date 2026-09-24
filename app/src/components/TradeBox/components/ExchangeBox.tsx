import { useState, useCallback } from 'react';
import { t } from '@lingui/macro';
import InfoIcon from './../assets/Info.svg'
import SettingIcon from './../assets/Settings.svg'
import Tab from '@/components/Common/Tab/Tab';
import { useAppStore } from '@/zustand/useAppStore';
import { TradeMode, TradeType } from '@/selectors/trade/types';
import { NumberInput } from '@/components/Common/Input/NumberInput';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { selectTradeboxTradeMode } from '@/selectors/tradebox/baseSelectors';
import { selectResetTradeboxInputs } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxTradeType } from '@/selectors/tradebox/baseSelectors';
import { MarketPoolSelector } from '@/components/Selectors/MarketPoolSelector';
import { selectSetTradeboxTradeMode } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxRelatedMarketsStats } from '@/selectors/tradebox/selectTradeboxRelatedMarketsStats';
import { selectTradeboxAvailableTradeModes } from '@/selectors/tradebox/selectTradeboxAvailableTradeModes';
import { selectSetTradeboxTradeType } from '@/selectors/tradebox/baseSelectors';

import { BiRefresh } from 'react-icons/bi'

function ExchangeBox() {
  const [leverageNumber, setLeverageNumber] = useState(0);
  const tradeType = useAppStore(selectTradeboxTradeType);
    const resetTradeboxInputs = useAppStore(selectResetTradeboxInputs);
    const setTradeType = useAppStore(selectSetTradeboxTradeType);
    const tradeMode = useAppStore(selectTradeboxTradeMode);
    const setTradeMode = useAppStore(selectSetTradeboxTradeMode);
    const availalbleTradeModes = useAppStore(selectTradeboxAvailableTradeModes);
  const { relatedMarketStats, relatedMarketsPositionStats } = useAppStore(
    selectTradeboxRelatedMarketsStats
  );
  const onUserInputLeverage = (value: number) => {
    setLeverageNumber(value);
  }

  const onSelectMarketAddress = (marketAddress: string) => {
    console.log(marketAddress);
  }
    
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

  const IconsElement = (
    <div className='iconBox'>
        <img src={InfoIcon} alt="" />
        <img src={SettingIcon} alt="" />
    </div>
  )

  return (
    <div className='exchangeBox'>
        <div className='exchangeBox-poolCollateral'>
            <div className='exchangeBox-poolCollateral-input'>
              <NumberInput
                value={leverageNumber}
                className="Exchange-swap-input"
                onValueChange={(e) => onUserInputLeverage(Number(e.target.value))}
                placeholder="0.0"
              />
              <span className='text-[#323232]'>x</span>
            </div>
            <div className='exchangeBox-poolCollateral-pool'>
              <ExchangeInfoRow
                label={t`Pool`}
                value={
                  <MarketPoolSelector
                    selectedPoolName={'USDC'}
                    options={relatedMarketStats}
                    positionStats={relatedMarketsPositionStats}
                    tradeType={tradeType}
                    onSelect={(marketAddress) => onSelectMarketAddress(marketAddress)}
                  />
                }
              />
            </div>
              
            <div className='exchangeBox-poolCollateral-collateral'>
              <ExchangeInfoRow
                label={t`Collateral In`}
                value={
                  <MarketPoolSelector
                    selectedPoolName={'WBTC'}
                    options={relatedMarketStats}
                    positionStats={relatedMarketsPositionStats}
                    tradeType={tradeType}
                    onSelect={(marketAddress) => onSelectMarketAddress(marketAddress)}
                  />
                }
              />
            </div>
            
            <div className='exchangeBox-poolCollateral-refresh'>
                <BiRefresh size={28} />
            </div>
        </div>
          
        <div className='exchangeBox-marketType'>
            <Tab
                options={Object.values(TradeType)}
                optionLabels={tradeTypeLabels}
                option={tradeType}
                onChange={handleChangeTradeType}
                optionClassnames={tradeTypeClassNames}
                className="Exchange-swap-option-tabs rounded-t-8 h-[40px] border-b border-b-[#535353]"
            />
            <div className="exchangeBox-marketType-direction">
                <Tab
                options={availalbleTradeModes}
                optionLabels={tradeModeLabels}
                className="SwapBox-asset-options-tabs !pl-[1.2rem]"
                type="card"
                option={tradeMode}
                onChange={handleSelectTradeMode}
                />
                {IconsElement}
            </div>
        </div>

        <div className='exchangeBox-marketType-form'>
            
              
        </div>
    </div>
  );
}

export default ExchangeBox;
