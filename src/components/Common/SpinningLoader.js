import "./SpinningLoader.css";

function SpinningLoader({ size = "3px" }) {
  return <div className="spinning-loader" style={{ fontSize: size }} />;
}

export default SpinningLoader;
