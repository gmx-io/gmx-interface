import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import { RenderIncreaseOrderInfo } from '@/components/TradeBox/components/RenderIncreaseOrderInfo';
import { TradeBoxAdvancedGroups } from '@/components/TradeBox/TradeBoxRows/AdvancedDisplayRows';
import { Trans } from '@lingui/macro';

export function MarketCard() {
  return (
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        <Trans>Market</Trans>
      </div>
      <ExchangeInfo.Group>
        <RenderIncreaseOrderInfo />
      </ExchangeInfo.Group>
      <ExchangeInfo.Group>
        <TradeBoxAdvancedGroups className="-my-[1rem]" />
      </ExchangeInfo.Group>
    </div>
  );
}
