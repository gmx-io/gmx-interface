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
        <div className="jobs-page-body">
          <Card title="Senior front-end developer (full time position)">
            <div className="body-para">
              <p className="subheading">What you will do:</p>
              <ul>
                <li>
                  Work closely with the rest of the GMX team in the main GMX front-ends (including{" "}
                  <a target="_blank" href="https://stats.gmx.io" rel="noopener noreferrer">
                    stats.gmx.io
                  </a>
                  ).
                </li>
                <li>Contribute with your experience and knowledge to its architecture.</li>
                <li>
                  Potential to work on other components, like in the subgraph repository. Our team is small, so there is
                  an opportunity to build new things and grow together.
                </li>
                <li>We don't have strict working hours or bureaucracy.</li>
              </ul>
              <div className="mt-lg">
                <p className="subheading">What we are looking for:</p>
                <ul>
                  <li>Required skills: HTML5, CSS3, React, Ethers, Web3 JS.</li>
                  <li>Previous DeFi experience and knowledge.</li>
                  <li>You speak fluent English and are available to start right away.</li>
                  <li>You are comfortable making changes to the interface following our current design guidelines.</li>
                  <li>Bonus skills: Node JS.</li>
                  <li>5+ years of experience.</li>
                </ul>
                <p>The salary is 60,000 to 120,000 USD + 1,000 to 3,000 GMX a year.</p>
                <p className="jobs-contact">
                  Please get in touch with{" "}
                  <a target="_blank" href="mailto:jobs@gmx.io" rel="noopener noreferrer">
                    jobs@gmx.io
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
