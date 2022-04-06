import React from "react";
import SEO from "../../components/Common/SEO";
import Footer from "../../Footer";
import { getPageTitle } from "../../Helpers";

import "./Referrals.css";

export default function Referrals() {
  return (
    <SEO title={getPageTitle("Ecosystem Projects")}>
      <Footer />
    </SEO>
  );
}
