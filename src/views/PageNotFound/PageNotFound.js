import { Link } from "react-router-dom";
import SEO from "../../components/Common/SEO";
import Footer from "../../Footer";
import { getPageTitle } from "../../Helpers";
import "./PageNotFound.css";

function PageNotFound() {
  return (
    <SEO title={getPageTitle("Page not found")}>
      <div className="page-layout">
        <div className="page-not-found-container">
          <div className="page-not-found">
            <h2>Page not found</h2>
            <p className="go-back">
              <span>Return to </span>
              <Link to="/">Homepage</Link> <span>or </span> <Link to="/trade">Trade</Link>
            </p>
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}

export default PageNotFound;
