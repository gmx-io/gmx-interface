import { Menu } from "@headlessui/react";
import cx from "classnames";
import { FaChevronDown } from "react-icons/fa";

import "./Dropdown.scss";

export type DropdownOption = {
  label: string;
  value: any;
};

export type Props = {
  selectedOption?: DropdownOption;
  placeholder?: string;
  options: DropdownOption[];
  className?: string;
  onSelect: (option: DropdownOption) => void;
  disabled?: boolean;
};

export function Dropdown(p: Props) {
  return (
    <div className={cx("Dropdown-root", { disabled: p.disabled }, p.className)}>
      <Menu>
        <Menu.Button as="div" aria-disabled={p.disabled}>
          <button className="Dropdown-current">
            <span className="Dropdown-current-label">{p.selectedOption?.label || p.placeholder}</span>
            <FaChevronDown className="Dropdown-current-arrow" />
          </button>
        </Menu.Button>
        <Menu.Items as="div" className="Dropdown-options menu-items">
          {p.options.map((option) => (
            <Menu.Item key={option.label}>
              <div
                className={cx("Dropdown-option", { selected: p.selectedOption?.value === option.value })}
                onClick={() => p.onSelect(option)}
              >
                {option.label}
              </div>
            </Menu.Item>
          ))}
        </Menu.Items>
      </Menu>
    </div>
  );
}
