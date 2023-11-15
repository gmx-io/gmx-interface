import { ReactNode } from "react";
import "./ConnectWalletButton.scss";

type Props = {
  imgSrc: string;
  children: ReactNode;
  onClick: () => void;
};

export default function ConnectWalletButton({ imgSrc, children, onClick }: Props) {
  return (
    <button className="connect-wallet-btn" onClick={onClick}>
      {imgSrc && <img className="btn-icon" src={imgSrc} alt="Connect Wallet" />}
      <span className="btn-label">{children}</span>
    </button>
  );
}
