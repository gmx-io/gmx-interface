import { useCallback, useState } from "react";
import range from "lodash/range";
import Button from "components/Button/Button";
import Select from "components/Select/Select";

import "./ReferralsTier.scss";
import { useReferrerTier, setAffiliateTier as contractSetAffiliateTier } from "domain/referrals";
import { useWeb3React } from "@web3-react/core";
import { useChainId } from "lib/chains";

export default function ReferralsTier() {
  const { active, library } = useWeb3React();
  const { chainId } = useChainId();

  const [affiliate, setAffiliate] = useState<string>("");
  const [affiliateTier, setAffiliateTier] = useState<number>(1);
  const { referrerTier: currentAffiliateTier } = useReferrerTier(library, chainId, affiliate);

  const onConfirmation = useCallback(() => {
    if (affiliate) {
      contractSetAffiliateTier(chainId, affiliate, affiliateTier, library, {
        sentMsg: "Transaction sent!",
        failMsg: "Transaction failed.",
      });
    }
  }, [affiliate, affiliateTier, chainId, library]);

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
              <strong>{currentAffiliateTier?.add(1).toString()}</strong>
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
    <div className="ReferralsTier">
      <h1>Referrals Tier</h1>
      {!active && <div>Wallet is not connected</div>}
      {renderForm()}
    </div>
  );
}
