import { SOCIAL_LINKS } from "./constants";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { NavLink } from "react-router-dom";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "transparent", color: "#ffffff", padding: "3rem 0", textAlign: "center" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "2rem" }}>
          {SOCIAL_LINKS.map((platform) => (
            <ExternalLink key={platform.name} className="App-social-link" href={platform.link}>
              <img src={platform.icon} alt={platform.name} style={{ width: "30px", height: "30px" }} />
            </ExternalLink>
          ))}
        </div>
        <div
          style={{ display: "flex", justifyContent: "center", gap: "2rem", fontSize: "1.2rem", marginBottom: "2rem" }}
        >
          <NavLink to="/terms-and-conditions" style={{ color: "#9DDFF3", textDecoration: "none" }}>
            Terms and Conditions
          </NavLink>
        </div>
        <p style={{ fontSize: "0.9rem", color: "#7B80B8" }}>Copyright © t3 Finance Limited. All rights reserved.</p>
      </div>
    </footer>
  );
}
