import { memo } from 'react';
import ExchangeForm from './components/ExchangeForm'
import ExchangeCardInfo from './components/ExchangeCardInfo'
import './TradeBox.scss'

function TradeBox() {
  return (
    <div className='tradeBox'>
      <ExchangeForm />
      <ExchangeCardInfo />
    </div>
  )
}

export default memo(TradeBox);
