function TransparentButton({ onClick, ...rest }) {
  return <button onClick={onClick} className="transparent-btn" {...rest}></button>;
}

export default TransparentButton;
