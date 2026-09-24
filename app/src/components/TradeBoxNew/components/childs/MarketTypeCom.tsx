import { memo, useState } from 'react';
import { t } from '@lingui/macro';
import { BN } from '@coral-xyz/anchor';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { selectSwapReceiveToken } from '@/zustand/slices/swapSlice';
import SettingsComponent from '@/components/TradeBoxNew/components/childs/Settings';
import TradeTypeSelector from '@/components/TradeTypeSelector';

function MarketTypeCom() {
  const TABS = ['Long', 'Short', 'Swap'];

  const tabsText = {
    Long: t`Long`,
    Short: t`Short`,
    Swap: t`Swap`,
  };

  const {
    marketDirection,
    marketType,
    setMarketDirection,
    setMarketType,
    setPayTokenNum,
    setTradeMoney,
    setSizeNumber,
    setScale,
    setLimitPrice,
    setSimulationData,
    setBtnDisabled,
    setBtnMessage,
  } = useAppStore(useShallow((state) => state.TradeboxNew));
  const {
    setTpPrice,
    setSlPrice,
    setTpsl,
  } = useAppStore(
    useShallow((state) => state.tpSlTokens)
  );

  const setSelectSwapReceiveToken = useAppStore(useShallow((state) => state.swap.setSelectSwapReceiveToken));
  // const setSwapFinished = useAppStore(useShallow((state) => state.swap.setSwapFinished));
  // const [isRotating, setIsRotating] = useState(false);

  const changeMarketDirection = (tab) => {
    setMarketDirection(tab);
    if (tab === 'Swap') {
      setBtnDisabled(true);
      setBtnMessage('Enter an amount');
      setPayTokenNum(new BN(0));
      setTradeMoney(new BN(0));
      setSizeNumber(null);
      setScale(new BN(0));
      setSimulationData({});
      return
    }
    setSimulationData({});
    setLimitPrice(null);
    setTpPrice(null);
    setSlPrice(null);
    setTpsl({
      tpGainMoney: '',
      slLossMoney: '',
      tpGainRate: '',
      slLossRate: '',
    });
    setSelectSwapReceiveToken(selectSwapReceiveToken);
  };

  // const handleRefreshClick = () => {
  //   if (isRotating) return;
  //   if (marketDirection === 'Swap') {
  //     setIsRotating(true);
  //     setSwapFinished(true);
  //     const nullSwapReceiveToken = {
  //       ...selectSwapReceiveToken,
  //     }
  //     nullSwapReceiveToken.receiveAmount = new BN(0);
  //     setSelectSwapReceiveToken(nullSwapReceiveToken)
  //     setTimeout(() => {
  //       setIsRotating(false);
  //     }, 1000);
  //     return
  //   }
  //   setIsRotating(true);
  //   setLimitPrice(null);
  //   setScale(new BN(0));
  //   setPayTokenNum(new BN(0));
  //   setTradeMoney(new BN(0));
  //   setSizeNumber(null);
  //   setTpPrice(null);
  //   setSlPrice(null);
  //   setTpsl({
  //     tpGainMoney: '',
  //     slLossMoney: '',
  //     tpGainRate: '',
  //     slLossRate: '',
  //   });
  //   setSimulationData({});
  //   setTimeout(() => {
  //     setIsRotating(false);
  //   }, 1000);
  // };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleMarketTypeChange = (type: 'Market' | 'Limit') => {
    setMarketType(type);
    setTpPrice(null);
    setSlPrice(null);
    setLimitPrice(null);
    setTpsl({
      tpGainMoney: '',
      slLossMoney: '',
      tpGainRate: '',
      slLossRate: '',
    });
  };

  return (
    <>
      <div className="tradeBox-exchangeForm-marketTypeCom">
        <div className="tabs flexAlignCenter">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`tab ${marketDirection === tab ? 'tabSelected' : ''}`}
              onClick={() => changeMarketDirection(tab)}
            >
              {tabsText[tab]}
            </div>
          ))}
        </div>

        <TradeTypeSelector
          marketType={marketType}
          onMarketTypeChange={handleMarketTypeChange}
          onSettingsClick={handleSettingsClick}
          className="typeOptions flexAlignCenter"
        />
      </div>


      {isSettingsOpen && (
        <SettingsComponent
          isOpen={isSettingsOpen}
          onClose={handleCloseSettings}

        />
      )}
    </>
  );
}
export default memo(MarketTypeCom);
