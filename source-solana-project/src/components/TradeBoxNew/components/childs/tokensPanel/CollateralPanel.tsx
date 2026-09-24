import React from 'react';
import classNames from 'classnames';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { formatGmxSymbol } from '@/components/TradeBoxNew/utils/formatGmxSymbol';
import './CollateralPanel.scss'

interface CollateralPanelProps {
  onSelect: (poolName: string) => void;
  collateralData: collateralItem[];
}

type collateralItem = {
  token: string,
  isGrey: boolean,
}

const CollateralPanel: React.FC<CollateralPanelProps> = ({ onSelect, collateralData }) => {
  const {
    setCollateralToken,
    setHasCollateralChange,
  } = useAppStore(useShallow((state) => state.collateralTokens));

  const handleCollateralSelect = (item: collateralItem) => {
    onSelect(item.token);
    setHasCollateralChange(true);
    setCollateralToken(item.token)
  };

  return (
    <div className="rounded-[8px] pt-[1px] border-stroke-primary border-[0.5px] bg-fill-surface-base text-white w-full max-w-md mx-auto flex flex-col gap-y-[4px] shadow-[0_12px_40px_-4px_var(--fill-Background)] backdrop-blur-[50px]">
      {
        collateralData.map((item, index) => {
          const tokenClasses = classNames('px-[12px] py-[10px]', {
            'cursor-pointer hover:bg-fill-surface-hover': !item.isGrey,
            'text-gray-600 cursor-not-allowed': item.isGrey
          });

          const collateralName = formatGmxSymbol(item.token) as string;

          if (item.isGrey) {
            const handle = (
              <div className={tokenClasses}>
                {collateralName}
              </div>
            );
            return (
              <TooltipWithPortal
                position="left"
                key={item.token + index}
                handle={handle}
                renderContent={() => `Select a pool containing ${collateralName} to use it as collateral.`}
                disableHandleStyle={true}
              />
            )
          }

          return (
            <div
              onClick={() => handleCollateralSelect(item)}
              key={item.token + index}
              className={tokenClasses}
            >
              {collateralName}
            </div>
          );
        })
      }
    </div>
  );
};

export default CollateralPanel;
