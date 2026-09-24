import { memo, useMemo } from 'react';
import { t } from '@lingui/macro';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import Settings from '@/components/TradeBoxNew/assets/Settings.svg';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/zustand/useAppStore';
import { PublicKey } from '@solana/web3.js';
import './TradeTypeSelector.scss';

// PUMP and WPUMP mint addresses
const PUMP_MINT = new PublicKey('pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn');
const WPUMP_MINT = new PublicKey('HTHR6CbWSqrVCB83onNwKKH1W3qpGoKbpqvs9sgK7PEC');

interface TradeTypeSelectorProps {
  marketType: 'Market' | 'Limit';
  onMarketTypeChange: (type: 'Market' | 'Limit') => void;
  onSettingsClick: () => void;
  className?: string;
  showSettings?: boolean;
}

const TradeTypeSelector = ({
  marketType,
  onMarketTypeChange,
  onSettingsClick,
  className = '',
  showSettings = true,
}: TradeTypeSelectorProps) => {
  const {
    selectSwapPayToken,
    selectSwapReceiveToken,
  } = useAppStore(useShallow((state) => state.swap));

  const {
    marketDirection,
  } = useAppStore(useShallow((state) => state.TradeboxNew));


  const optionsTabsText = {
    Market: t`Market`,
    Limit: t`Limit`,
  };
  const iswraporUnwrap = useMemo(() =>
    (selectSwapPayToken?.tokenAddress === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH' && selectSwapReceiveToken?.tokenAddress === 'So11111111111111111111111111111111111111112') ||
    (selectSwapPayToken?.tokenAddress === 'So11111111111111111111111111111111111111112' && selectSwapReceiveToken?.tokenAddress === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH') ||
    (selectSwapPayToken?.tokenAddress === PUMP_MINT.toBase58() && selectSwapReceiveToken?.tokenAddress === WPUMP_MINT.toBase58()) ||
    (selectSwapPayToken?.tokenAddress === WPUMP_MINT.toBase58() && selectSwapReceiveToken?.tokenAddress === PUMP_MINT.toBase58()),
    [selectSwapPayToken?.tokenAddress, selectSwapReceiveToken?.tokenAddress]);
  const OPTIONS_TABS = !iswraporUnwrap ? ['Market', 'Limit'] : ['Market'];
  return (
    <div className={`trade-type-selector ${className}`}>
      <div className="trade-type-tabs">
        {OPTIONS_TABS.map((tab) => (
          <div
            key={tab}
            className={`trade-type-tab ${marketType === tab ? 'trade-type-tab-selected' : ''}`}
            onClick={() => onMarketTypeChange(tab as 'Market' | 'Limit')}
          >
            {optionsTabsText[tab]}
          </div>
        ))}
      </div>

      {showSettings && (
        <div className="trade-type-settings">
          <TooltipWithPortal
            className="TradeFeesRow-tooltip"
            handle={
              <img
                src={InfoSvg}
                alt=""
                className="trade-type-info"
                style={{ cursor: 'pointer' }}
              />
            }
            position="bottom"
            renderContent={() => (
              <div>
                <ul>
                  <li>
                    {
                      marketDirection === "Long" ?
                        t`Long Market: Increase a long position at the current price.` :
                        marketDirection === "Short" ? t`Short Market: Increase a short position at the current price.` :
                          t`Swap Market: Swap tokens at the current market price`
                    }
                  </li>
                  <li>
                    {marketDirection === "Long" ?
                      t`Long Limit: Increase a long position when the price is below the trigger price.` :
                      marketDirection === "Short" ? t`Short Limit: Increase a short position when the price is above the trigger price` :
                        t`Swap Limit: Swap tokens when the trigger price is reached`
                    }
                  </li>
                </ul>
              </div>
            )}
          />

          <img
            src={Settings}
            alt=""
            className="trade-type-settings-icon"
            onClick={onSettingsClick}
            style={{ cursor: 'pointer' }}
          />
        </div>
      )}
    </div>
  );
};

export default memo(TradeTypeSelector);
