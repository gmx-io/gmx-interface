import "./Select.scss";

export default function Select(props) {
  return (
    <select className="Select" {...props}>
      {props.options.map((option) => {
        return <option value={option.value}>{option.label}</option>;
      })}
    </select>
  );
}
