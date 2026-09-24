import type { ComponentProps, ComponentType } from 'react';
import { getGmw396Enabled } from '@/config/featureFlagEnable';
import UnStakeListOld from './UnStakeListOld';
import UnStakeListNew from './UnStakeListNew';

type UnStakeListProps =
  | ComponentProps<typeof UnStakeListNew>
  | ComponentProps<typeof UnStakeListOld>;

const UnStakeList = (
  getGmw396Enabled() ? UnStakeListNew : UnStakeListOld
) as ComponentType<UnStakeListProps>;

export default UnStakeList;
