import solana from '@/img/ic_sol_24.svg';
import './HeaderLeft.scss';
import ChevronLeft from '@/img/Chevron_Left.svg';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMedia } from 'react-use';
import { normalizePoolDetailRouteType } from '@/components/Pools/utils/poolDetailRoute';
const HeaderLeft = ({
  isShowSign = true
}: {
  isShowSign?: boolean
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const linkInfoStr = sessionStorage.getItem('linkInfo');
  const routePoolType = normalizePoolDetailRouteType(pathname.split('/')[3]);
  let storedPoolType: string | null = null;

  try {
    const parsedLinkInfo: unknown = linkInfoStr ? JSON.parse(linkInfoStr) : null;
    storedPoolType = (
      parsedLinkInfo &&
      typeof parsedLinkInfo === 'object' &&
      'poolType' in parsedLinkInfo &&
      typeof parsedLinkInfo.poolType === 'string'
    ) ? parsedLinkInfo.poolType : null;
  } catch {
    storedPoolType = null;
  }

  const poolType = routePoolType || storedPoolType;
  const isPoolDetail = pathname.startsWith('/pools/poolDetail');
  const isMobile = useMedia('(max-width: 768px)');
  return (
    <div className="Pool-header-left">
      {!isMobile && isPoolDetail && (
        <>
          <div
            className="nav-button pools-button"
            onClick={() => navigate('/pools')}
          >
            <img src={ChevronLeft} alt="Chevron Left" width={16} height={16} />
            <span>Pools</span>
          </div>
          <span className="separator">/</span>
          {poolType === 'GLV' && (
            <div className="nav-button vaults-button">
              <span>GLV Vaults</span>
            </div>
          )}
          {poolType === 'GM' && (
            <div className="nav-button vaults-button">
              <span>GM Pools</span>
            </div>
          )}
        </>
      )}
      {isMobile && isPoolDetail && (
        <> 
          <div className="return-button return-button--pool-detail"
            onClick={() => navigate('/pools')}>
            <img src={ChevronLeft} alt="Chevron Left" width={16} height={16} />
          </div>  
        </>
      )}
        

      {
        isShowSign && <>
          <div className="sonala-data">
            <img src={solana} alt="Solana Logo" width={20} height={20} />
            <span>Solana Data</span>
          </div>
        </>
      }
    </div>
  );
};

export default HeaderLeft;
