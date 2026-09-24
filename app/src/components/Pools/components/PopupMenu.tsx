import React from 'react';
import Dialog1 from '@/img/pools/dialog1.svg'
import './PopupMenu.scss'
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { getGlvDisplayNameByTokenAddress } from '@/utils/glv/getGlvDisplayName';

const tokenMetadataByAddress = GMX_SOLANA_TOKENS_RAW as Record<
  string,
  { symbol?: string } | undefined
>;

interface PopupMenuInfo {
  marketToken?: string;
  poolName?: string;
  longToken?: string;
  shortToken?: string;
}

interface PopupMenuProps {
  show: boolean;
  onClose: () => void;
  vaultId: string | null;
  info?: PopupMenuInfo;
  type: 'glv' | 'gm';
}

const PopupMenu: React.FC<PopupMenuProps> = ({ show, info, type }) => {
  if (!show) return null;
  const glvDisplayName = getGlvDisplayNameByTokenAddress(info?.marketToken);
  const longTokenSymbol = info?.longToken ? tokenMetadataByAddress[info.longToken]?.symbol : undefined;
  const shortTokenSymbol = info?.shortToken ? tokenMetadataByAddress[info.shortToken]?.symbol : undefined;
  const linkToExplorer = () => {
    window.open(`https://solscan.io/token/${info?.marketToken}?cluster=${import.meta.env.MODE === 'development' ? 'devnet' : ''}`)
  }
  return (
    <div
      className="absolute rounded-xl shadow-lg p-2 z-50 popup-menu"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col w-auto">
        <button className="flex items-center hover:bg-dark-800 rounded-md whitespace-nowrap action-button" onClick={linkToExplorer}>
          <img src={Dialog1} alt="explorer" className="w-20 h-20 mr-5" />
          <span className='text-[#A3A3A3] text-[12px]'>Open {type === 'glv' ? glvDisplayName : `GM: ${info?.poolName}/USD`} <span className='!text-[1.1rem] '>[{longTokenSymbol}-{shortTokenSymbol}]</span> in Explorer</span>
        </button>
      </div>
    </div>
  );
};

export default PopupMenu;
