import { useCallback } from "react";
import { createBreakpoint } from "react-use";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useENS } from "lib/legacy";
import { shortenAddressOrEns } from "lib/wallets";

import { Avatar } from "components/Avatar/Avatar";

import "./AddressDropdown.scss";

type Props = {
  account: string;
};

const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });

function AddressDropdown({ account }: Props) {
  const breakpoint = useBreakpoint();
  const { ensName } = useENS(account);
  const displayAddressLength = breakpoint === "S" ? 9 : 13;
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();

  const handleClick = useCallback(() => {
    setGmxAccountModalOpen(true);
  }, [setGmxAccountModalOpen]);

  return (
    <button className="App-cta small transparent address-btn" onClick={handleClick}>
      <div className="user-avatar">
        <Avatar size={20} ensName={ensName} address={account} />
      </div>
      <span className="user-address">{shortenAddressOrEns(ensName || account, displayAddressLength)}</span>
    </button>
  );
}

export default AddressDropdown;
