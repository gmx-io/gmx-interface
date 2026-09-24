import Header from '@/components/NewHeader/Header';
import './Pools.scss';
import { useMedia } from 'react-use';
import { Outlet } from 'react-router-dom';
import { BlockUsIpModal } from '@/components/BlockUsIpModal';
export default function Pools() {
  const isMobile = useMedia('(max-width:768px)');
  return (
    // isMobile ? (
    //   <ComingSoonPage />
    // ) : (
    <div className="pools">
      <div className="header">
        <Header isPools={true} />
      </div>
      <BlockUsIpModal />
      <Outlet />
    </div>
    // )
  );
}