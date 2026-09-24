import React from 'react';
import './PopupMenu.scss';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { getIconUrlPath } from '@/utils/lib/icon';
import { t } from '@lingui/macro';
import { useNavigate } from 'react-router-dom';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';

interface PopupMenuProps {
  show: boolean;
  onClose: () => void;
  vaultId: string | null;
  info: any;
}

const PopupMenu: React.FC<PopupMenuProps> = ({ show, info }) => {
  const navigate = useNavigate();
  if (!show) return null;
  const goDetail = (item, e) => {
    e.stopPropagation();
    navigate(`/pools?market=${item.indexToken}`);
  };
  return (
    <div
      className="popup-menu absolute z-50 rounded-xl p-2 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {info?.marketInfos?.map((item, index) => (
        <div key={index} className="token-infos py-[0.8rem]" onClick={(e) => goDetail(item, e)}>
          <div className="token-infos-imgBox ">
            <img src={getIconUrlPath(info?.poolName, 40)} alt="" width={32} className="min-w-[3.2rem]" />
            <div className="absolute -bottom-2 -right-7 flex flex-row items-center justify-center text-typography-secondary">
              <img
                className="z-20 -mr-10 rounded-[100%] border-2 border-slate-900 bg-slate-900"
                src={getIconUrlPath(
                  GMX_SOLANA_TOKENS_RAW[item?.longToken]?.symbol  === "WGMX" ? "GMX" : GMX_SOLANA_TOKENS_RAW[item?.longToken]?.symbol,
                  24
                )}
                alt=""
                width={20}
              />
              <img
                className="z-10 rounded-[100%] border-2 border-slate-900 bg-slate-900"
                src={getIconUrlPath(
                  GMX_SOLANA_TOKENS_RAW[item?.shortToken]?.symbol,
                  24
                )}
                alt=""
                width={20}
              />
            </div>
          </div>

          <div className="flex items-center text-[#A3A3A3]">
            <span className="min-w-[6.2rem] block">{t`Buy GM: `}</span>
            <span>{item.marketTokenName}</span>{' '}
            <span className="ml-[0.4rem] flex items-center">
              <span>[{getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[item?.longToken]?.symbol)}</span>
              <span>-</span>
              <span>{getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[item?.shortToken]?.symbol)}]</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PopupMenu;
