import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import { RenderTriggerOrderInfo } from '@/components/TradeBox/components/RenderTriggerOrderInfo';
import { TriggerReceiveRow } from '@/components/TradeBox/TradeBoxRows/TriggerReceiveRow';
import { TradeBoxAdvancedGroups } from '@/components/TradeBox/TradeBoxRows/AdvancedDisplayRows';
import { Trans } from '@lingui/macro';

export function TPSLCard() {
  return (
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        <Trans>TP/SL</Trans>
      </div>
      <ExchangeInfo.Group>
        <TriggerReceiveRow />
        <RenderTriggerOrderInfo />
      </ExchangeInfo.Group>
      <ExchangeInfo.Group>
        <TradeBoxAdvancedGroups className="-my-[1rem]" />
      </ExchangeInfo.Group>
    </div>
  );
}
