import { memo } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { t } from '@lingui/macro';
import './BottomNavigation.scss';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
import IconChevronUp from '@/img/trade/chevron-up.svg?react';
import { BN } from '@coral-xyz/anchor';
import { useMedia } from 'react-use';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
interface BottomNavigationProps {
  onTogglePop?: (isOpen: boolean) => void;
  isPopOpen?: boolean;
}

const BottomNavigation = ({
  onTogglePop,
  isPopOpen = false,
}: BottomNavigationProps) => {
  useBodyScrollLock(isPopOpen);

  const TABS = ['Long', 'Short', 'Swap'];

  const tabsText = {
    Long: t`Long`,
    Short: t`Short`,
    Swap: t`Swap`,
  };

  const {
    marketDirection,
    setMarketDirection,
    setPayTokenNum,
    setTradeMoney,
    setSizeNumber,
    setScale,
    setSimulationData,
    setBtnDisabled,
    setBtnMessage,
  } = useAppStore(
    useShallow((state) => state.TradeboxNew)
  );

  const { payerSwapList } = useAppStore((state) => state.payerSwapTokens);
  const { setSelectSwapReceiveToken, setSelectSwapPayToken } = useAppStore(
    useShallow((state) => state.swap)
  );
  const changeMarketDirection = (direction: string) => {
    if (direction === marketDirection) {
      if (!isPopOpen) {
        onTogglePop?.(true);
      }
      return;
    }

    setMarketDirection(direction as 'Long' | 'Short' | 'Swap');

    if (direction === 'Swap') {
      setBtnDisabled(true);
      setBtnMessage('Enter an amount');
      setPayTokenNum(new BN(0));
      setTradeMoney(new BN(0));
      setSizeNumber(new BN(0));
      setScale(new BN(0));
      setSimulationData({});

      if (payerSwapList && payerSwapList.length >= 2) {
        setSelectSwapPayToken(payerSwapList[0]);
        setSelectSwapReceiveToken(payerSwapList[1]);
      }
    }

    if (!isPopOpen) {
      onTogglePop?.(true);
    }
  };

  const handleTogglePop = () => {
    const newIsOpen = !isPopOpen;
    onTogglePop?.(newIsOpen);
  };
  return (
    <>
      <div className={`bottom-navigation ${isPopOpen ? 'pop-open !absolute w-screen !top-1' : ''}`}>
        <div className="bottom-navigation-container">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`bottom-nav-tab ${marketDirection === tab ? 'bottom-nav-tab-selected' : ''}`}
              onClick={() => changeMarketDirection(tab)}
            >
              <span className="bottom-nav-tab-text">{tabsText[tab]}</span>
            </div>
          ))}
          <div className="bottom-nav-expand-btn" onClick={handleTogglePop}>
            {isPopOpen ? <IconChevronDown /> : <IconChevronUp />}
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(BottomNavigation);
