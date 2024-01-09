import "./BannerButton.scss";
import { FiChevronRight } from "react-icons/fi";
import cx from "classnames";

type Props = {
  label: string;
  link: string;
  className?: string;
};

export default function BannerButton({ label, className, link }: Props) {
  const words = label.split(" ");
  const lastWord = words.pop();
  const remainingText = words.join(" ");

  return (
    <div className={cx("Banner-button", className)}>
      <a className="Banner-action" target="_blank" rel="noreferrer" href={link}>
        <div className="Banner-text">
          {remainingText}
          <span className="Banner-label-last-word">{` ${lastWord}`}</span>
        </div>
        <FiChevronRight className="Banner-right-icon" fontSize={16} />
      </a>
    </div>
  );
}
