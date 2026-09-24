import React from 'react';
import Header from '@/components/NewHeader/Header';
import GTPage from '@/components/GT/index';
import NewGTPage from '@/components/newGT';
import { BlockUsIpModal } from '@/components/BlockUsIpModal';
import {
  getGmw406Enabled,
  getGmw410Enabled,
  getGmw411Enabled,
} from '@/config/featureFlagEnable';

const GtBoard: React.FC = () => {
  const newGtEnabled =
    getGmw406Enabled() || getGmw410Enabled() || getGmw411Enabled();

  return (
    <>
      <div className="pools">
        <div className="header">
          <Header isGt={true} />
        </div>
        <BlockUsIpModal />
        <div className="content">
          {newGtEnabled ? <NewGTPage /> : <GTPage />}
        </div>
      </div>
    </>
  );
};

export default GtBoard;
