import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import cx from "classnames";
import { useChainId } from "lib/chains";
import { ImSpinner2 } from "react-icons/im";
import "./RequestStatus.scss";

export function RequestStatus(p: { isMuted?: boolean; isLoading?: boolean; text: string; txnHash?: string }) {
  const { chainId } = useChainId();

  const txnLink = `${getExplorerUrl(chainId)}tx/${p.txnHash}`;

  const isWaiting = !p.isLoading && !p.txnHash;

  return (
    <div className="RequestStatus">
      <div className={cx("RequestStatus-title", { muted: isWaiting })}>{p.text}</div>
      <div className="RequestStatus-status">
        {p.isLoading && <ImSpinner2 width={60} height={60} className="spin RequestStatus-spin" />}
        {!p.isLoading && p.txnHash && <ExternalLink href={txnLink}>View</ExternalLink>}
      </div>
    </div>
  );
}
