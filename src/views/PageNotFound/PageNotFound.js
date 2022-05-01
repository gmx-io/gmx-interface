import { Link } from "react-router-dom";
import Footer from "../../Footer";
import PageNotFoundImg from "../../img/page-not-found.svg";
import "./PageNotFound.css";

function PageNotFound() {
  return (
    <div className="page-layout">
      <div className="page-not-found">
        <img src={PageNotFoundImg} alt="Page not found!" />
        <h2>Oops, page not found!</h2>
        <p className="go-back">
          <span>Return to </span>
          <Link to="/">Homepage</Link> <span>or </span> <Link to="/trade">Trade</Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}

export default PageNotFound;
