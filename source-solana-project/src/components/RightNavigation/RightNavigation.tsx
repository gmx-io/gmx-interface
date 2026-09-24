import './RightNavigation.scss';
import { MobileHeader } from '@/components/Header/Header';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';

interface RightNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

const RightNavigation = ({ isOpen, onClose }: RightNavigationProps) => {
  useBodyScrollLock(isOpen);

  return (
    <>
      <div
        className={`right-navigation-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

        <div className={`right-navigation ${isOpen ? 'open' : ''}`}>
          <MobileHeader onClose={onClose} />
        </div>
    </>
  );
};

export default RightNavigation;
