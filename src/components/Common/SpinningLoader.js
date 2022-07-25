import "./SpinningLoader.css";

function SpinningLoader({ size }) {
  return (
    <div className="loader" style={{ fontSize: size }}>
      Loading..
    </div>
  );
}

export default SpinningLoader;
