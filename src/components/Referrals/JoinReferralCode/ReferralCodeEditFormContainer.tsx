import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useChainId } from "lib/chains";

import { ReferralCodeFormMultichain } from "./ReferralCodeFormMultichain";
import { ReferralCodeFormSettlementChain } from "./ReferralCodeFormSettlementChain";
import type { ReferralCodeActionType } from "./types";

export function ReferralCodeEditFormContainer({
  callAfterSuccess,
  userReferralCodeString = "",
  type = "join",
}: {
  callAfterSuccess?: (code: string) => void;
  userReferralCodeString?: string;
  type?: ReferralCodeActionType;
}) {
  const { srcChainId } = useChainId();

  if (srcChainId === undefined) {
    return (
      <ReferralCodeFormSettlementChain
        callAfterSuccess={callAfterSuccess}
        userReferralCodeString={userReferralCodeString}
        type={type}
      />
    );
  }

  return (
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType={"referrals"}>
      <ReferralCodeFormMultichain
        callAfterSuccess={callAfterSuccess}
        userReferralCodeString={userReferralCodeString}
        type={type}
      />
    </SyntheticsStateContextProvider>
  );
}
