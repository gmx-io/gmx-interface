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
      <a
        className="Banner-link Banner-action flex items-center justify-between"
        target="_blank"
        rel="noreferrer"
        href="https://gmxio.substack.com/p/gmx-v2-beta-is-now-live"
      >
        <div>What’s new in V2?</div>
        <FiChevronRight fontSize={16} />
      </a>
    </div>
  );
}

export default Banner;
