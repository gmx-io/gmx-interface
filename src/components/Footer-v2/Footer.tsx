import { SOCIAL_LINKS } from "./constants";
import ExternalLink from "components/ExternalLink/ExternalLink";

export default function Footer() {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          {SOCIAL_LINKS.map((platform) => {
            return (
              <ExternalLink key={platform.name} className="App-social-link" href={platform.link}>
                <img src={platform.icon} alt={platform.name} />
              </ExternalLink>
            );
          })}
        </div>
        <p className="text">Copyright © T3 Finance Limited. All rights reserved.</p>
      </div>
    </div>
  );
}
