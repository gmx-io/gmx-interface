import { useCallback, useState } from "react";
import range from "lodash/range";
import Button from "components/Button/Button";
import Select from "components/Select/Select";

import "./ReferralsTier.scss";
import { useReferrerTier, setAffiliateTier as contractSetAffiliateTier } from "domain/referrals";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

export default function ReferralsTier() {
  const { active, signer } = useWallet();
  const { chainId } = useChainId();

  const [affiliate, setAffiliate] = useState<string>("");
  const [affiliateTier, setAffiliateTier] = useState<number>(1);
  const { referrerTier: currentAffiliateTier } = useReferrerTier(signer, chainId, affiliate);

  const onConfirmation = useCallback(() => {
    if (affiliate) {
      contractSetAffiliateTier(chainId, affiliate, affiliateTier, signer, {
        sentMsg: "Transaction sent!",
        failMsg: "Transaction failed.",
      });
    }
  }, [affiliate, affiliateTier, chainId, signer]);

  function renderForm() {
    if (!active) return null;

    return (
      <div className="ReferralsTier-form">
        <div className="ReferralsTier-row">
          <label className="ReferralsTier-label">Affiliate Address:</label>
          <input
            type="text"
            className="ReferralsTier-input"
            value={affiliate}
            onChange={(evt) => setAffiliate(evt.target.value)}
          />
        </div>
        {currentAffiliateTier !== undefined && (
          <>
            <div className="ReferralsTier-row">
              <label className="ReferralsTier-label">Current Tier:</label>
              <strong>{currentAffiliateTier === undefined ? undefined : String(currentAffiliateTier + 1n)}</strong>
            </div>
            <div className="ReferralsTier-row">
              <label className="ReferralsTier-label">New Tier:</label>
              <Select
                onChange={(evt) => setAffiliateTier(Number(evt.target.value))}
                value={affiliateTier}
                options={range(1, 4).map((tier: number, i: number) => ({ value: i, label: tier }))}
              />
            </div>
            <div className="ReferralsTier-row">
              <Button variant="primary" onClick={onConfirmation}>
                Save tier
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="page-layout default-container">
      <h1>Referrals Tier</h1>
      {!active && <div>Wallet is not connected</div>}
      {renderForm()}
    </div>
  );
}
