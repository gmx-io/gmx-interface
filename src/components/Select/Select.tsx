import pick from "lodash/pick";

import "./Select.scss";

export default function Select(props) {
  return (
    <select className="Select" {...pick(props, ["value", "onChange"])}>
      {props.options.map((option) => {
        return <option value={option.value}>{option.label}</option>;
      })}
    </select>
  );
}
