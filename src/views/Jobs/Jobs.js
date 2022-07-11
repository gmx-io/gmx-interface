import "./Jobs.css";
import React, { useEffect } from "react";
import SEO from "../../components/Common/SEO";
import Footer from "../../Footer";
import { getPageTitle } from "../../Helpers";
import Card from "../../components/Common/Card";

function Jobs() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <SEO title={getPageTitle("Job Openings")}>
      <div className="default-container page-layout Referrals">
        <div className="section-title-block">
          <div className="section-title-icon"></div>
          <div className="section-title-content">
            <div className="Page-title">GMX Job Openings</div>
            <div className="Page-description">Interested in working at GMX? Contact us.</div>
          </div>
        </div>
        <div className="page-body">
          <Card title="Senior front-end developer (full time position)">
            <div className="body-para">
              <p className="subheading">
                <b>What you'll do:</b>
              </p>
              <ul>
                <li>
                  Work closely with the rest of the GMX team in the main GMX frontends (including{" "}
                  <a href="https://stats.gmx.io" rel="noopener noreferrer">
                    stats.gmx.io
                  </a>
                  )
                </li>
                <li>Contribute with your experience and knowledge to its architecture.</li>
              </ul>
              <div className="mt-lg">
                <p className="subheading">
                  <b>What we’re looking for:</b>
                </p>
                <ul>
                  <li>Required skills: HTML5, CSS3, React, Ethers, Web3 JS.</li>
                  <li>Previous DeFi experience and knowledge.</li>
                  <li>You speak fluent English and be available to start right away.</li>
                  <li>You are comfortable making changes to the interface following our current design guidelines.</li>
                </ul>
                <p>
                  The salary is <b>60,000</b> to <b>120,000 USD</b> + <b>1,000 GMX</b> a year.
                </p>
                <p className="jobs-contact">
                  Please contact{" "}
                  <a href="mailto:jobs@gmx.io" rel="noopener noreferrer">
                    <b>jobs@gmx.io</b>
                  </a>{" "}
                  using the following email subject: Application for Senior front-end developer: [Your name]
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </SEO>
  );
}

export default Jobs;
