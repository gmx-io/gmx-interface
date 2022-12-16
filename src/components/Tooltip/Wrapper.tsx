export default function Wrapper({ onDisabled, children }) {
  if (onDisabled) {
    // For onMouseLeave to work on disabled button https://github.com/react-component/tooltip/issues/18#issuecomment-411476678
    return <div className="Tooltip-disabled-wrapper">{children}</div>;
  }
  return children;
}
