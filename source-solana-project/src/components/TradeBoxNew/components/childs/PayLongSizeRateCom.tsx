import { getGmw390Enabled } from '@/config/featureFlagEnable';
import PayLongSizeRateComOld from './PayLongSizeRateComOld';
import PayLongSizeRateComNew from './PayLongSizeRateComNew';

export default getGmw390Enabled() ? PayLongSizeRateComNew : PayLongSizeRateComOld;
