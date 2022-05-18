import Tooltip from "../Tooltip/Tooltip";

function EmptyMessage({ message = "", tooltipText }) {
  return (
    <div className="empty-message">
      {tooltipText ? (
        <Tooltip handle={<p>{message}</p>} position="center-bottom" renderContent={() => tooltipText} />
      ) : (
        <p>{message}</p>
      )}
    </div>
  );
}

export default EmptyMessage;
