import { ReactNode, memo } from "react";
import cx from "classnames";
import rightIcon from "img/navbutton-arrow-right.svg";
import closeIcon from "img/navbutton-close.svg";
import "./NavigationButton.scss";

function NavigationButtonImpl({
  children,
  onCloseClick,
  onNavigateClick,
  className,
}: {
  children: ReactNode;
  onCloseClick?: (() => void) | null;
  onNavigateClick?: () => void;
  className?: string;
}) {
  const clickable = !!onNavigateClick;
  return (
    <div className={cx("NavigationButton", className, clickable ? "clickable" : undefined)}>
      <div className="NavigationButton-button" onClick={onNavigateClick}>
        <div className="NavigationButton-button-text">{children}</div>
        {clickable ? (
          <div className="NavigationButton-button-arrow">
            <img src={rightIcon} alt="Navigate" />
          </div>
        ) : null}
      </div>
      {onCloseClick && (
        <div className="NavigationButton-close" onClick={onCloseClick}>
          <img src={closeIcon} alt="Close" />
        </div>
      )}
    </div>
  );
}
export const NavigationButton = memo(NavigationButtonImpl);
