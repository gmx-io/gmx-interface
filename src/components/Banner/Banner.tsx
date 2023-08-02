import { FiChevronRight } from "react-icons/fi";
import cx from "classnames";
import "./Banner.scss";
import sparkle from "img/sparkle.svg";

function Banner({ className }) {
  return (
    <div className={cx("Banner-wrapper", className)}>
      <p className="Banner-text">
        GMX updated!
        <img src={sparkle} alt="sparkle" className="Banner-text-sparkle" />
      </p>
      <div className="Banner-action items-center justify-space-between">
        <a className="Banner-link" href="#a">
          What’s new in V2?
        </a>
        <FiChevronRight fontSize={16} />
      </div>
    </div>
  );
}

export default Banner;
