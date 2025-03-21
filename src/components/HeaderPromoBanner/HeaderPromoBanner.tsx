import { ReactNode, useCallback } from "react";
import { MdOutlineClose } from "react-icons/md";

import { useLocalStorageSerializeKey } from "lib/localStorage";

import "./HeaderPromoBanner.scss";

export function HeaderPromoBanner({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useLocalStorageSerializeKey("header-promo-banner", false);
  const onClick = useCallback(() => {
    setHidden(true);
  }, [setHidden]);

  if (hidden) return null;

  return (
    <div className="HeaderPromoBanner">
      {children}
      <MdOutlineClose onClick={onClick} className="cross-icon" color="white" />
    </div>
  );
}
