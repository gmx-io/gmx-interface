import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrevious } from "react-use";

import { useAffiliateCodes, useUserReferralCode } from "domain/referrals";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionActionEvent, SharePositionActionSource } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import type { ContractsChainId } from "sdk/configs/chains";

type Params = {
  chainId: ContractsChainId;
  account: string | undefined;
  isOpen: boolean;
  source: SharePositionActionSource;
};

export function useShareReferralCodeState({ chainId, account, isOpen, source }: Params) {
  const { account: connectedAccount } = useWallet();
  // code creation and the browser-local pending code are only for the user's own account
  const isOwnAccount = Boolean(connectedAccount) && connectedAccount === account;

  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const { userReferralCodeString: usedReferralCode } = useUserReferralCode(chainId, account, !isOwnAccount);
  const [createdReferralCode, setCreatedReferralCode] = useState<string | null>(null);
  const [promptedToCreateReferralCode, setPromptedToCreateReferralCode] = useState(false);
  const [isCreateReferralCodeInfoMessageClosed, setIsCreateReferralCodeInfoMessageClosed] = useLocalStorageSerializeKey(
    "is-create-referral-code-info-message-closed",
    false
  );
  const prevIsOpen = usePrevious(isOpen);

  const shareAffiliateCode = useMemo(() => {
    if (createdReferralCode) {
      return { code: createdReferralCode, success: true };
    }
    return userAffiliateCode;
  }, [createdReferralCode, userAffiliateCode]);
  const hasReferralCode = Boolean(shareAffiliateCode?.code);

  const { referralCodeOwnerKind, code } = useMemo(() => {
    if (hasReferralCode && shareAffiliateCode?.code) {
      return { referralCodeOwnerKind: "created" as const, code: shareAffiliateCode.code };
    }
    if (usedReferralCode) {
      return { referralCodeOwnerKind: "used" as const, code: usedReferralCode };
    }
    return { referralCodeOwnerKind: undefined, code: undefined };
  }, [hasReferralCode, shareAffiliateCode?.code, usedReferralCode]);

  useEffect(() => {
    setCreatedReferralCode(null);
  }, [account, chainId]);

  useEffect(() => {
    if (userAffiliateCode.code) {
      setCreatedReferralCode(null);
    }
  }, [userAffiliateCode.code]);

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
    [source]
  );

  const handlePromptToCreateReferralCode = useCallback((e: React.MouseEvent<unknown>) => {
    e.preventDefault();
    setPromptedToCreateReferralCode(true);
  }, []);

  const closeCreateReferralCodeInfoMessage = useCallback(() => {
    setIsCreateReferralCodeInfoMessageClosed(true);
  }, [setIsCreateReferralCodeInfoMessageClosed]);

  const shouldShowCreateReferralCard =
    isOwnAccount && userAffiliateCode.success && !userAffiliateCode.code && !createdReferralCode;
  const shouldPromptToCreateReferralCode =
    isOwnAccount && !hasReferralCode && !promptedToCreateReferralCode && !isCreateReferralCodeInfoMessageClosed;
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
