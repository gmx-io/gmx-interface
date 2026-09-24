import { useShallow } from 'zustand/react/shallow';
import ReferralModal from './ReferralModal';
import {
  selectCloseReferralModal,
  selectReferralModalInitCode,
  selectReferralModalIsOpen,
  selectReferralModalIsStyle2,
} from '@/selectors/referral/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';

export default function ReferralModalHost() {
  const { isOpen, initReferralCode, close, isStyle2 } = useAppStore(
    useShallow((state) => ({
      isOpen: selectReferralModalIsOpen(state),
      initReferralCode: selectReferralModalInitCode(state),
      close: selectCloseReferralModal(state),
      isStyle2: selectReferralModalIsStyle2(state),
    }))
  );

  return (
    <ReferralModal
      showModal={isOpen}
      initReferralCode={initReferralCode}
      onClose={close}
      zIndex={10000}
      isStyle2={isStyle2}
    />
  );
}
