import { getGmw272Enabled } from '@/config/featureFlagEnable';
import ExchangeButtonLegacy from './ExchangeButtonLegacy';
import ExchangeButtonWithMarketNotice from './ExchangeButtonWithMarketNotice';

export default getGmw272Enabled()
  ? ExchangeButtonWithMarketNotice
  : ExchangeButtonLegacy;
