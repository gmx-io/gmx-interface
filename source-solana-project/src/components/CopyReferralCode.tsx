import { helperNotice } from '@/utils/lib/helperNotice';
import { t } from '@lingui/macro';
import { BiCopy } from 'react-icons/bi';
const CopyReferralCode = ({ referralCode }: { referralCode: string }) => {
  return (
    <div
      className="flex items-center gap-2"
      style={{ width: '15rem', textAlign: 'left' }}
    >
      <span>{referralCode || '-'}</span>
      {referralCode && (
        <button
          className="text-[#A3A3A3] hover:text-white"
          onClick={() => {
            const referralUrl = `${window.location.origin}/r/${referralCode}`;
            void navigator.clipboard.writeText(referralUrl);
            helperNotice.success(t`Referral link copied to clipboard.`);
          }}
        >
          <BiCopy size={16} />
        </button>
      )}
    </div>
  );
};

export default CopyReferralCode;
