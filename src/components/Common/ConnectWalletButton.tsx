import { ReactNode } from "react";
import { FaWallet } from "react-icons/fa6";

import Button from "components/Button/Button";

type Props = {
  children: ReactNode;
  onClick: () => void;
};

export default function ConnectWalletButton({ children, onClick }: Props) {
  return (
    <Button variant="secondary" data-qa="connect-wallet-button" className="flex items-center gap-6" onClick={onClick}>
      <FaWallet size={20} className="box-content p-2" />
      <span>{children}</span>
    </Button>
  );
}
