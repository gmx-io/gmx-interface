import { getGmw317Enabled } from '@/config/featureFlagEnable';
import LongOrShortLimitOld from './indexOld';
import LongOrShortLimitNew from './indexNew';

export default getGmw317Enabled() ? LongOrShortLimitNew : LongOrShortLimitOld;
