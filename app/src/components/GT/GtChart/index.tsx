import { getGmw411Enabled } from '@/config/featureFlagEnable';
import GtChartNew from './indexNew';
import GtChartOld from './indexOld';

export default getGmw411Enabled() ? GtChartNew : GtChartOld;
