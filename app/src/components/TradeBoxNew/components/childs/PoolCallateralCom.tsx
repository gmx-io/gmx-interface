import { memo, useState } from 'react'
import { getGmw215Enabled } from '@/config/featureFlagEnable';
import TokensSelectCom from './TokensSelectCom'
// import LeverageSetPanel from './tokensPanel/LeverageSetPanel'
import AdjustLeverageModal from './AdjustLeverageModal'
import { useAppStore } from '@/zustand/useAppStore'
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName'
import { t } from '@lingui/macro'
import closeIcon from '@/img/trade/close.svg';
import './PoolCallateralCom.scss'

function PoolCallateralCom() {
  const isGmw215Enabled = getGmw215Enabled();
  const {
    leverage,
  } = useAppStore(state => state.TradeboxNew);
  const {
    indexTokenData
  } = useAppStore(state => state.indexTokens);
  const [showAdjustLeverageModal, setShowAdjustLeverageModal] = useState<boolean>(false);

  return (
    <>
      <div className={`tradeBox-exchangeForm-poolCallateralCom flexAlignCenter ${isGmw215Enabled ? 'gmw215-enabled' : ''}`}>
        <div className='inputBox flexAlignCenter commonBoxBg' style={{ position: 'relative', justifyContent: 'space-between', padding: '0 0.8rem' }}>
          <span
            style={{ cursor: 'pointer', color: '#fff', height: '1.5rem', width: 'unset' }}
            className='bg-transparent text-[1.3rem] outline-none w-full text-center '
            onClick={() => setShowAdjustLeverageModal(true)}
          >{leverage}</span>
          <img src={closeIcon} alt="close" width={7} height={17} style={{ marginLeft: '0 !important' }} className='!h-[1.7rem] !w-[0.7rem] mt-[0.3rem] !ml-[0] ' />
        </div>
        <TokensSelectCom type={t`Pool`} applyBackground={true} showLabel={false} />
        <TokensSelectCom
          type={t`Collateral`}
          applyBackground={true}
          wrapperClassName={isGmw215Enabled ? 'desktop-min-width-124' : ''}
        />
      </div>

      <AdjustLeverageModal
        isVisible={showAdjustLeverageModal}
        onClose={() => setShowAdjustLeverageModal(false)
        }
        marketSymbol={formatMarketName(indexTokenData?.indexToken) || 'SOL/USD'}
      />
    </>
  )
}

export default memo(PoolCallateralCom);
