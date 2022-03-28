import "./Loader.css";
function Loader({ size }) {
  return (
    <div className="loader" style={{ fontSize: size }}>
      Loading..
    </div>
  );
}

export default Loader;
