import Header from '@/components/NewHeader/Header';
import StakeContent from '@/components/Stake';

import { BlockUsIpModal } from '@/components/BlockUsIpModal';

export default function Stake() {
  // const program = useStakeProgram();

  return (
    <div className="stake-view">
      <div className="header">
        <Header isPools={true} />
      </div>
      <BlockUsIpModal />
      <StakeContent />
    </div>
  );
}
