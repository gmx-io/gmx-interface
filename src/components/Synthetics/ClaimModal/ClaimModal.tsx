import { t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { getTotalClaimableFundingUsd, useMarketsData, useMarketsPoolsData } from "domain/synthetics/markets";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";

type Props = {
  onClose: () => void;
};

export function ClaimModal(p: Props) {
  const { onClose } = p;
  const { account } = useWeb3React();
  const { chainId } = useChainId();
  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(marketsData, poolsData, tokensData);

  const onSubmit = () => {};

  return (
    <Modal className="Confirmation-box" isVisible={true} setIsVisible={onClose} label={t`Claim`}>
      <div className="ConfirmationBox-main text-center">Claim {formatUsd(totalClaimableFundingUsd)}</div>
      <SubmitButton onClick={onSubmit}>{t`Claim`}</SubmitButton>
    </Modal>
  );
}
