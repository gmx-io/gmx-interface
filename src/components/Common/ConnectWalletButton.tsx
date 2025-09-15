import { ReactNode } from "react";

import Button from "components/Button/Button";

import WalletIcon from "img/ic_wallet.svg?react";

type Props = {
  children: ReactNode;
  onClick: () => void;
};

export default function ConnectWalletButton({ children, onClick }: Props) {
  return (
    <Button
      variant="primary"
      size="controlled"
      data-qa="connect-wallet-button"
      className="flex h-40 items-center gap-6 max-md:h-32"
      onClick={onClick}
    >
      <WalletIcon className="box-content size-20" />
      <span>{children}</span>
    </Button>
  );
}
