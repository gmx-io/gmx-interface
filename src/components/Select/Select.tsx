import { ChangeEvent } from "react";
import "./Select.scss";

type SelectProps = {
  onChange: (evt: ChangeEvent<HTMLSelectElement>) => void;
  value: string | number;
  options: {
    value: string;
    label: string;
  }[];
};

export default function Select(props: SelectProps) {
  const { options, ...htmlProps } = props;
  return (
    <select className="Select" {...htmlProps}>
      {options.map((option) => {
        return <option value={option.value}>{option.label}</option>;
      })}
    </select>
  );
}
