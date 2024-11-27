import { Trans } from "@lingui/macro";
import "./AppHomeContent.css";
import { HeaderLink } from "components/Header/HeaderLink";
import { BsArrowRight } from "react-icons/bs";

export default function AppHomeContentDesktop() {
  return (
    <>
      <div
        className="content-title-desktop"
        style={{
          backdropFilter: "blur(3px)",
          padding: "2rem",
          borderRadius: "1rem",
        }}
      >
        <h2 style={{ marginBottom: "0" }}>
          <Trans>Become a Liquidity Provider</Trans>
        </h2>
        <br />
        <span className="content-desc" style={{ fontFamily: "Relative" }}>
          Provide liquidity to T3's trading pools and earn fees from every trade. Join our growing network of liquidity
          providers and earn passive income from the platform's success.
        </span>
        <HeaderLink className="btn text-white orange-cta content-title-desktop-cta" to="/earn">
          <Trans>Buy TLP</Trans>
          <BsArrowRight className="arrow" style={{ marginLeft: "1rem" }} color={"white"} />
        </HeaderLink>
      </div>
      <div
        className="content-title-desktop"
        style={{
          backdropFilter: "blur(3px)",
          padding: "2rem",
          borderRadius: "1rem",
        }}
      >
        <h2 style={{ marginBottom: "0" }}>
          <Trans>Buy TMX Token</Trans>
        </h2>
        <span style={{ fontSize: "14px", color: "#FFB547" }}> (Coming Soon)</span>
        <br />
        <span className="content-desc" style={{ fontFamily: "Relative" }}>
          Invest in T3's growth by holding TMX tokens. Earn platform fees, exclusive rewards, and unlock premium
          features as a T3 Pro member. Be part of our ecosystem's future.
        </span>
        <button
          className="btn text-white orange-cta content-title-desktop-cta"
          disabled
          style={{ opacity: 0.5, cursor: "not-allowed" }}
        >
          <Trans>Buy TMX</Trans>
          <BsArrowRight className="arrow" style={{ marginLeft: "1rem" }} color={"white"} />
        </button>
      </div>
    </>
  );
}
