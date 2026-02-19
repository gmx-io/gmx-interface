import { Trans, t } from "@lingui/macro";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { ReferralCodeStats, registerReferralCode, TotalReferralsStats } from "domain/referrals";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { serializeBigIntsInObject } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import { Faq } from "components/Faq/Faq";
import Loader from "components/Loader/Loader";
import { AffiliatesStats } from "components/Referrals/AffiliatesStats";
import { deserializeSampleStats, isRecentReferralCodeNotExpired } from "components/Referrals/referralsHelper";

import { CreateAffiliateWizard } from "./CreateAffiliateCode/CreateAffiliateWizard";
import { AFFILIATE_WIZARD_FAQS } from "./ReferralsAffiliatesFaq";

type ReferralsAffiliatesTabProps = {
  loading: boolean;
  account: string | undefined;
  referralsData: TotalReferralsStats | undefined;
  initialReferralCode: string | undefined;
};

export function ReferralsAffiliatesTab({
  loading,
  account,
  referralsData,
  initialReferralCode,
}: ReferralsAffiliatesTabProps) {
  const { signer } = useWallet();
  const { chainId } = useChainId();
  const { pendingTxns } = usePendingTxns();
  const [recentlyAddedCodes, setRecentlyAddedCodes] = useLocalStorageSerializeKey<ReferralCodeStats[]>(
    [chainId, "REFERRAL", account],
    [],
    {
      raw: false,
      deserializer: deserializeSampleStats as any,
      serializer: (value) => JSON.stringify(serializeBigIntsInObject(value)),
    }
  );

  function handleCreateReferralCode(referralCode: string) {
    return registerReferralCode(chainId, referralCode, signer, {
      sentMsg: t`Referral code submitted`,
      failMsg: t`Referral code creation failed`,
      pendingTxns,
    });
  }

  const ownsSomeChainCode = Boolean(referralsData?.chains?.[chainId]?.codes?.length);
  const hasRecentCode = recentlyAddedCodes?.some(isRecentReferralCodeNotExpired);
  const isSomeReferralCodeAvailable = ownsSomeChainCode || hasRecentCode;

  if (loading) return <Loader />;

  const isWizard = !account || !isSomeReferralCodeAvailable;

  if (!isWizard) {
    return (
      <AffiliatesStats
        referralsData={referralsData}
        handleCreateReferralCode={handleCreateReferralCode}
        setRecentlyAddedCodes={setRecentlyAddedCodes}
        recentlyAddedCodes={recentlyAddedCodes}
      />
    );
  }

  return (
    <div className="flex gap-8 max-md:flex-col">
      <div className="flex grow flex-col gap-8">
        <CreateAffiliateWizard
          onGoToAffiliateDashboard={() => undefined}
          handleCreateReferralCode={handleCreateReferralCode}
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
          initialReferralCode={initialReferralCode}
        />
      </div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
        <Faq items={AFFILIATE_WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
      </div>
    </div>
  );
}
