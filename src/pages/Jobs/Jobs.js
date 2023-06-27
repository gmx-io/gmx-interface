import React from "react";
import "./Jobs.css";
import SEO from "components/Common/SEO";
import Footer from "components/Footer/Footer";
import { getPageTitle } from "lib/legacy";
import Card from "components/Common/Card";
import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";

function Jobs() {
  return (
    <SEO title={getPageTitle(t`Job Openings`)}>
      <div className="default-container page-layout Referrals">
        <div className="section-title-block">
          <div className="section-title-icon" />
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>Jobs</Trans>
            </div>
            <div className="Page-description">
              <Trans>Job openings at GMX.</Trans>
            </div>
          </div>
        </div>
        <div className="jobs-page-body">
          <NoJob />
        </div>
      </div>
      <Footer />
    </SEO>
  );
}

function NoJob() {
  return (
    <Card title={t`No open positions at GMX currently`}>
      <div className="body-para">
        <p className="subheading">
          <Trans>
            GMX is not actively looking for new hires at the moment. However, if you think you can contribute to the
            project, please email <ExternalLink href="mailto:jobs@gmx.io">jobs@gmx.io</ExternalLink>.
          </Trans>
        </p>
      </div>
    </Card>
  );
}

// function JobCard() {
//   return (
// <Card title="Senior front-end developer (Full-time position)">
//   <div className="body-para">
//     <p className="subheading">What you will do:</p>
//     <ul>
//       <li>Work closely with the GMX team on the GMX front-end website.</li>
//       <li>Collaborate and discuss features to be worked on.</li>
//       <li>Remote full-time position, flexible working hours.</li>
//     </ul>
//     <div className="mt-lg">
//       <p className="subheading">What we are looking for:</p>
//       <ul>
//         <li>Required skills: HTML5, CSS3, React, Ethers, Web3 JS.</li>
//         <li>Bonus skills: Node JS.</li>
//         <li>5+ years of experience.</li>
//         <li>Previous DeFi experience and knowledge.</li>
//         <li>Must speak fluent English and available to start right away.</li>
//         <li>Comfortable making changes to the interface following our current design guidelines.</li>
//       </ul>
//       <p>The salary is 60,000 to 120,000 USD + 1,000 to 3,000 GMX a year.</p>
//       <p className="jobs-contact">
//         If the job suits you, please get in touch with{" "}
//         <a target="_blank" href="mailto:jobs@gmx.io" rel="noopener noreferrer">
//           jobs@gmx.io
//         </a>{" "}
//         using the following email subject: Application for Senior front-end developer: [Your name]
//       </p>
//     </div>
//   </div>
// </Card>
//   );
// }

export default Jobs;
