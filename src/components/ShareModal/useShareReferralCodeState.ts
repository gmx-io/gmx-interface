import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrevious } from "react-use";

import { useAffiliateCodes, useUserReferralCode } from "domain/referrals";
import { getProtocolReferralCodeType } from "domain/referrals/utils/referralsHelper";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionActionEvent, SharePositionActionSource } from "lib/userAnalytics/types";
import type { ContractsChainId } from "sdk/configs/chains";

type Params = {
  chainId: ContractsChainId;
  account: string | undefined;
  isOpen: boolean;
  source: SharePositionActionSource;
  createdReferralCode?: string | null;
  setCreatedReferralCode?: (code: string | null) => void;
};

export function useShareReferralCodeState({
  chainId,
  account,
  isOpen,
  source,
  createdReferralCode: controlledCreatedReferralCode,
  setCreatedReferralCode: setControlledCreatedReferralCode,
}: Params) {
  const userAffiliateCode = useAffiliateCodes(chainId, account, isOpen);
  const { userReferralCodeString: usedReferralCode } = useUserReferralCode(chainId, account);
  const [internalCreatedReferralCode, setInternalCreatedReferralCode] = useState<string | null>(null);
  const isCreatedReferralCodeControlled = controlledCreatedReferralCode !== undefined;
  const createdReferralCode = isCreatedReferralCodeControlled
    ? controlledCreatedReferralCode
    : internalCreatedReferralCode;
  const setCreatedReferralCode = setControlledCreatedReferralCode ?? setInternalCreatedReferralCode;
  const [promptedToCreateReferralCode, setPromptedToCreateReferralCode] = useState(false);
  const [isCreateReferralCodeInfoMessageClosed, setIsCreateReferralCodeInfoMessageClosed] = useLocalStorageSerializeKey(
    "is-create-referral-code-info-message-closed",
    false
  );
  const prevIsOpen = usePrevious(isOpen);

  const ownedAffiliateCode = useMemo(() => {
    if (createdReferralCode) {
      return { code: createdReferralCode, success: true };
    }
    return userAffiliateCode;
  }, [createdReferralCode, userAffiliateCode]);
  const hasReferralCode = Boolean(ownedAffiliateCode.code);

  const shareAffiliateCode = useMemo(() => {
    if (!ownedAffiliateCode.success || ownedAffiliateCode.code) {
      return ownedAffiliateCode;
    }

    if (usedReferralCode && !getProtocolReferralCodeType(usedReferralCode)) {
      return { code: usedReferralCode, success: true };
    }

    return { code: null, success: true };
  }, [ownedAffiliateCode, usedReferralCode]);

  const { referralCodeOwnerKind, code } = useMemo(() => {
    if (ownedAffiliateCode.code) {
      return { referralCodeOwnerKind: "created" as const, code: ownedAffiliateCode.code };
    }
    if (shareAffiliateCode.code) {
      return { referralCodeOwnerKind: "used" as const, code: shareAffiliateCode.code };
    }
    return { referralCodeOwnerKind: undefined, code: undefined };
  }, [ownedAffiliateCode.code, shareAffiliateCode.code]);

  useEffect(() => {
    if (!isCreatedReferralCodeControlled) {
      setInternalCreatedReferralCode(null);
    }
  }, [account, chainId, isCreatedReferralCodeControlled]);

  useEffect(() => {
    if (userAffiliateCode.code) {
      setCreatedReferralCode(null);
    }
  }, [setCreatedReferralCode, userAffiliateCode.code]);

  useEffect(() => {
    if (prevIsOpen && !isOpen) {
      setPromptedToCreateReferralCode(false);
    }
  }, [prevIsOpen, isOpen]);

  const handleReferralCodeSuccess = useCallback(
    (code: string) => {
      setCreatedReferralCode(code);

      userAnalytics.pushEvent<SharePositionActionEvent>({
        event: "SharePositionAction",
        data: {
          action: "ReferralCodeCreated",
          source,
          hasReferralCode: true,
        },
      });
    },
    [setCreatedReferralCode, source]
  );

  const handlePromptToCreateReferralCode = useCallback((e: React.MouseEvent<unknown>) => {
    e.preventDefault();
    setPromptedToCreateReferralCode(true);
  }, []);

  const closeCreateReferralCodeInfoMessage = useCallback(() => {
    setIsCreateReferralCodeInfoMessageClosed(true);
  }, [setIsCreateReferralCodeInfoMessageClosed]);

  const shouldShowCreateReferralCard = userAffiliateCode.success && !userAffiliateCode.code && !createdReferralCode;
  const shouldPromptToCreateReferralCode =
    userAffiliateCode.success &&
    !hasReferralCode &&
    !promptedToCreateReferralCode &&
    !isCreateReferralCodeInfoMessageClosed;
  const shouldShowSkipReferralCodeBanner = promptedToCreateReferralCode && !isCreateReferralCodeInfoMessageClosed;

  return {
    shareAffiliateCode,
    hasReferralCode,
    referralCodeOwnerKind,
    code,
    shouldShowCreateReferralCard,
    shouldPromptToCreateReferralCode,
    shouldShowSkipReferralCodeBanner,
    closeCreateReferralCodeInfoMessage,
    handleReferralCodeSuccess,
    handlePromptToCreateReferralCode,
  };
}
