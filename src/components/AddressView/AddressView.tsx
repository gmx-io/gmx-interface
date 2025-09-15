import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { Link } from "react-router-dom";
import type { Address } from "viem";

import { shortenAddress } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import "./AddressView.scss";

const lengths = { S: 9, M: 13, L: 13, XL: 13 };

type AddressViewProps = {
  address: string;
  size: number;
  ensName?: string;
  avatarUrl?: string;
  breakpoint?: keyof typeof lengths;
  maxLength?: number;
  noLink?: boolean;
  big?: boolean;
};

export default function AddressView({
  address,
  ensName,
  avatarUrl,
  size = 24,
  breakpoint,
  maxLength,
  noLink,
  big,
}: AddressViewProps) {
  const { account } = useWallet();
  const strLength = (breakpoint && lengths[breakpoint]) ?? maxLength;

  const trader = useMemo(() => {
    let trader;

    if (strLength) {
      trader = (ensName ? "" : "0x") + shortenAddress(ensName || address.replace(/^0x/, ""), strLength, 0);
    } else {
      trader = ensName || address;
    }

    if (account === address) {
      return (
        <span className="flex items-center gap-4">
          <Trans>You</Trans> <span className="text-typography-secondary">{trader}</span>
        </span>
      );
    }

    return trader;
  }, [account, address, ensName, strLength]);

  const style = useMemo(
    () => ({
      width: `${size}px`,
      height: `${size}px`,
      backgroundImage: `url(${avatarUrl})`,
    }),
    [avatarUrl, size]
  );

  const textClassName = big ? "text-body-large" : "text-body-medium";

  if (noLink) {
    return (
      <div className="AddressView">
        {avatarUrl ? (
          <span className="AddressView-ens-avatar" style={style} />
        ) : (
          <Jazzicon diameter={size} seed={jsNumberForAddress(address)} />
        )}
        <span className={cx("AddressView-trader-id", textClassName)}>{trader}</span>
      </div>
    );
  }

  return (
    <Link target="_blank" className="AddressView" to={buildAccountDashboardUrl(address as Address, undefined, 2)}>
      {avatarUrl ? (
        <span className="AddressView-ens-avatar" style={style} />
      ) : (
        <Jazzicon diameter={size} seed={jsNumberForAddress(address)} />
      )}
      <span className={cx("AddressView-trader-id", textClassName)}>{trader}</span>
    </Link>
  );
}
