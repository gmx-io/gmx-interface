import { ReactNode } from "react";
import cx from "classnames";
import "./Button.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWallet } from "@fortawesome/free-solid-svg-icons";

type Props = {
  children: ReactNode;
  onClick: () => void;
  className?: string;
};

export default function ConnectWalletButton({ children, onClick, className }: Props) {
  let classNames = cx("btn btn-primary btn-sm connect-wallet", className);
  return (
    <button className={classNames} onClick={onClick}>
      <FontAwesomeIcon icon={faWallet} />
      <span className="btn-label">{children}</span>
    </button>
  );
}
