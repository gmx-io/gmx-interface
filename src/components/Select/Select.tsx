import { ChangeEvent } from "react";
import "./Select.scss";

type SelectProps = {
  onChange: (evt: ChangeEvent<HTMLSelectElement>) => void;
  value: string | number;
  options: {
    value: string | number;
    label: string | number;
  }[];
};

export default function Select(props: SelectProps) {
  const { options, ...htmlProps } = props;
  return (
    <select className="Select" {...htmlProps}>
      {options.map((option) => {
        return (
          <option key={`${option.value}${option.label}`} value={option.value}>
            {option.label}
          </option>
        );
      })}
    </select>
  );
}
