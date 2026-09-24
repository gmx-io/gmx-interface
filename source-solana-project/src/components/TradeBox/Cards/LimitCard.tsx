import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import { RenderIncreaseOrderInfo } from '@/components/TradeBox/components/RenderIncreaseOrderInfo';
import { TradeBoxAdvancedGroups } from '@/components/TradeBox/TradeBoxRows/AdvancedDisplayRows';
import { LimitPriceRow } from '@/components/TradeBox/TradeBoxRows/LimitPriceRow';
import { selectTradeboxMarkPriceDecimals } from '@/selectors/tradebox/selectTradeboxMarkPriceDecimals';
import { useAppStore } from '@/zustand/useAppStore';
import { Trans } from '@lingui/macro';

export function LimitCard() {
  const markPriceDecimals = useAppStore(selectTradeboxMarkPriceDecimals);
  return (
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        <Trans>Limit</Trans>
      </div>
      <ExchangeInfo.Group>
        <LimitPriceRow displayDecimals={markPriceDecimals} />
        <RenderIncreaseOrderInfo />
      </ExchangeInfo.Group>
      <ExchangeInfo.Group>
        <TradeBoxAdvancedGroups className="-my-[1rem]" />
      </ExchangeInfo.Group>
    </div>
  );
}
