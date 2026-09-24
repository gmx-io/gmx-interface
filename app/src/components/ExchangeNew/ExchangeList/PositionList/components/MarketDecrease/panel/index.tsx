import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program'
import { useAppStore } from '@/zustand/useAppStore';
import './index.scss'

interface ReceivePanelProps {
  onSelect: (poolName: string) => void;
}

const ReceivePanel: React.FC<ReceivePanelProps> = ({ onSelect }) => {
  const payerSwapList = useAppStore(state => state.payerSwapTokens.payerSwapList);

  const handleCollateralSelect = (item: any) => {
    onSelect(item);
  };

  return (
    <div className="!bg-fill-surface-elevated border border-slate-800 rounded-lg text-white w-full max-w-md mx-auto collateralPanel">
      {
        payerSwapList.map((item, index) => {
          const tokenClasses = classNames('cursor-pointer p-1 rounded hover:bg-slate-700 item');

          return (
            <div
              onClick={() => handleCollateralSelect(item)}
              key={`panel-item-${index}`}
              className={tokenClasses}
            >
              {item?.tokenName === 'WGMX' ? 'GMX' : item?.tokenName}
            </div>
          )
        })
      }
    </div>
  );
};

export default ReceivePanel;
