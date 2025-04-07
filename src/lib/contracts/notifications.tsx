import { Trans } from "@lingui/macro";
import { ethers } from "ethers";

import { getExplorerUrl } from "config/chains";
import { helperToast } from "lib/helperToast";

import ExternalLink from "components/ExternalLink/ExternalLink";

const notifications: { [id: string]: boolean } = {};

export function pushSuccessNotification(chainId: number, message: string, e: { transactionHash: string }) {
  const { transactionHash } = e;

  const id = ethers.id(message + transactionHash);
  if (notifications[id]) {
    return;
  }

  notifications[id] = true;

  const txUrl = getExplorerUrl(chainId) + "tx/" + transactionHash;
  helperToast.success(
    <div>
      {message}{" "}
      <ExternalLink href={txUrl}>
        <Trans>View</Trans>
      </ExternalLink>
    </div>
  );
}

export function pushErrorNotification(chainId: number, message: string, e: { transactionHash: string }) {
  const { transactionHash } = e;
  const id = ethers.id(message + transactionHash);
  if (notifications[id]) {
    return;
  }

  notifications[id] = true;

  const txUrl = getExplorerUrl(chainId) + "tx/" + transactionHash;
  helperToast.error(
    <div>
      {message}{" "}
      <ExternalLink href={txUrl}>
        <Trans>View</Trans>
      </ExternalLink>
    </div>
  );
}
