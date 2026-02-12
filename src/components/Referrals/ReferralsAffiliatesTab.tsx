import { t } from "@lingui/macro";
import { useAccount } from "wagmi";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { ReferralCodeStats, registerReferralCode, TotalReferralsStats } from "domain/referrals";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { serializeBigIntsInObject } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import Loader from "components/Loader/Loader";
import AddAffiliateCode from "components/Referrals/AddAffiliateCode";
import AffiliatesStats from "components/Referrals/AffiliatesStats";
import { deserializeSampleStats, isRecentReferralCodeNotExpired } from "components/Referrals/referralsHelper";

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
  const { isConnected } = useAccount();
  const { signer } = useWallet();
  const { chainId, srcChainId } = useChainId();
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
      sentMsg: t`Referral code submitted.`,
      failMsg: t`Referral code creation failed.`,
      pendingTxns,
    });
  }

  const ownsSomeChainCode = Boolean(referralsData?.chains?.[chainId]?.codes?.length);
  const hasRecentCode = recentlyAddedCodes?.some(isRecentReferralCodeNotExpired);
  const isSomeReferralCodeAvailable = ownsSomeChainCode || hasRecentCode;

  if (loading) return <Loader />;
  if (account && isSomeReferralCodeAvailable) {
    return (
      <AffiliatesStats
        referralsData={referralsData}
        handleCreateReferralCode={handleCreateReferralCode}
        setRecentlyAddedCodes={setRecentlyAddedCodes}
        recentlyAddedCodes={recentlyAddedCodes}
        chainId={chainId}
        srcChainId={srcChainId}
      />
    );
  }
  return (
    <AddAffiliateCode
      handleCreateReferralCode={handleCreateReferralCode}
      active={isConnected}
      recentlyAddedCodes={recentlyAddedCodes}
      setRecentlyAddedCodes={setRecentlyAddedCodes}
      initialReferralCode={initialReferralCode}
    />
  );
}
