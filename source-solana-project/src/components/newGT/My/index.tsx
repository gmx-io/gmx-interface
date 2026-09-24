import { useEffect, useState } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { selectGtUserDetailsRank } from '@/selectors/gt/gtUserDetailsSelectors';
import { getGmw446Enabled } from '@/config/featureFlagEnable';
import VipLevelSelector from './VipLevelSelector';
import VipCardCarousel from './VipCardCarousel';
import GtHistorySection from './GtHistorySection';
import './My.scss';

type MyTabProps = {
  onNavigateToBuyback?: () => void;
};

function MyTab({ onNavigateToBuyback }: MyTabProps) {
  const userRank = useAppStore(selectGtUserDetailsRank);
  const [selectedVipLevel, setSelectedVipLevel] = useState(userRank || 0);
  const [hasManualSelection, setHasManualSelection] = useState(false);

  useEffect(() => {
    if (!hasManualSelection) {
      setSelectedVipLevel(userRank || 0);
    }
  }, [userRank, hasManualSelection]);

  const handleSelect = (level: number) => {
    setHasManualSelection(true);
    setSelectedVipLevel(level);
  };

  return (
    <div className="gt-my">
      <VipLevelSelector selected={selectedVipLevel} onSelect={handleSelect} />
      <VipCardCarousel
        selected={selectedVipLevel}
        onSelect={handleSelect}
        onSellClick={getGmw446Enabled() ? undefined : onNavigateToBuyback}
      />
      <GtHistorySection />
    </div>
  );
}

export default MyTab;
