import Button from "components/Button/Button";
import { Trans } from "@lingui/macro";
import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import tmxImg from "img/ic_tmx.svg";

import Footer from "components/Footer-v2/Footer";
import "./AppHome.css";
import { useBreakpoints } from "../../hooks/useBreakpoints";
import morphRocket from "../../img/morph-rocket.svg";
// import { TradeNowButton } from "./TradeNowButton";
import { BuyTLPNowButton } from "./BuyTLPNowButton";
import DefiOptions from "components/DefiOptions/DefiOptions";

export default function AppHome({ showRedirectModal, redirectPopupTimestamp }) {
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 },
    },
  };

  const { mobile, tablet, ...breakpoints } = useBreakpoints();

  return (
    <>
      <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "left",
            pointerEvents: "none",
          }}
        >
          <source src="/video/t3-galaxy-background-4.mp4" type="video/mp4" />
        </video>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "150px",
            background: "linear-gradient(to bottom, transparent, rgba(0, 0, 0, 1))",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: mobile ? "25%" : "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backdropFilter: "blur(3px)",
            padding: mobile ? "1rem" : "2rem",
            borderRadius: "1rem",
            zIndex: 1,
            width: mobile ? "90%" : "auto",
          }}
        >
          <div style={{ textAlign: "center", color: "white" }}>
            <div
              style={{
                fontSize: mobile ? "4rem" : "7rem",
                fontWeight: "bold",
                marginBottom: mobile ? "1rem" : "2rem",
              }}
            >
              <span>
                <Trans>Decentralized</Trans>
              </span>
              <div
                style={{ display: "flex", gap: mobile ? "0.5rem" : "1rem", flexDirection: mobile ? "column" : "row" }}
              >
                <span style={{ color: "#FF7028" }}>
                  {" "}
                  <Trans>Perpetual</Trans>
                </span>
                <Trans>Exchange</Trans>
              </div>
            </div>
            <br />
            <BuyTLPNowButton showRedirectModal={showRedirectModal} redirectPopupTimestamp={redirectPopupTimestamp} />
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          gap: mobile ? "4rem" : "8rem",
          fontSize: mobile ? "1.5rem" : "2rem",
          position: "relative",
          top: mobile ? "-40vh" : "-35vh",
          padding: mobile ? "8px 2rem" : "8px 16rem",
          cursor: "pointer",
        }}
      >
        <NavLink to="/earn" style={{ flex: 1 }}>
          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            style={{
              background: "linear-gradient(-72deg, rgba(157,223,243,0.2), rgba(15,85,232,0.2))",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: mobile
                ? "1.5rem 2rem 4rem 2rem"
                : breakpoints.tablet
                ? "2rem 4rem 7rem 4rem"
                : "2rem 6rem 7rem 6rem",
              borderRadius: mobile ? "2rem" : "4rem",
              position: "relative",
              cursor: "pointer",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              backdropFilter: "blur(5px)",
            }}
          >
            <h2 style={{ fontWeight: "400", fontSize: mobile ? "1.8rem" : "2rem" }}>Become a Liquidity Provider</h2>
            <p
              style={{
                fontFamily: "Relative, sans-serif",
                color: "#7B80B8",
                fontSize: mobile ? "1.2rem" : "inherit",
                flex: 1,
              }}
            >
              Provide liquidity to t3's trading pools and earn fees from every trade. Join our growing network of
              liquidity providers and earn passive income from the platform's success.
            </p>
            <Button
              style={{
                fontSize: mobile ? "1.5rem" : "2rem",
                color: "white",
                background: "#FF7028",
                padding: mobile ? "1rem 2.5rem" : "1.5rem 3.5rem",
                borderRadius: "3rem",
                position: "absolute",
                left: "50%",
                bottom: 0,
                transform: "translate(-50%, 50%)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Buy TLP
            </Button>
          </motion.div>
        </NavLink>
        <NavLink to="/" style={{ flex: 1 }}>
          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            style={{
              background: "linear-gradient(-72deg, rgba(15,85,232,0.2), rgba(157,223,243,0.2))",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: mobile
                ? "1.5rem 2rem 4rem 2rem"
                : breakpoints.tablet
                ? "2rem 4rem 7rem 4rem"
                : "2rem 6rem 7rem 6rem",
              borderRadius: mobile ? "2rem" : "4rem",
              position: "relative",
              cursor: "pointer",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              backdropFilter: "blur(5px)",
            }}
          >
            <h2 style={{ fontWeight: "400", marginBottom: 0, fontSize: mobile ? "1.8rem" : "2rem" }}>Buy TMX Token</h2>
            <span style={{ fontSize: mobile ? "1.2rem" : "1.5rem", color: "rgb(189 81 27)" }}>(Coming Soon)</span>
            <p
              style={{
                fontFamily: "Relative, sans-serif",
                color: "#7B80B8",
                fontSize: mobile ? "1.2rem" : "inherit",
                flex: 1,
              }}
            >
              Join t3 by holding TMX tokens. Earn platform fees, exclusive rewards, and unlock premium features as a t3
              Pro member. Be part of our ecosystem's future.
            </p>
            <Button
              disabled
              style={{
                fontSize: mobile ? "1.5rem" : "2rem",
                color: "white",
                background: "#59280F",
                padding: mobile ? "1rem 2.5rem" : "1.5rem 3.5rem",
                borderRadius: "3rem",
                position: "absolute",
                left: "50%",
                bottom: 0,
                transform: "translate(-50%, 50%)",
                cursor: "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              Buy TMX
            </Button>
          </motion.div>
        </NavLink>
      </div>

      <div
        style={{
          padding: mobile ? "2.5rem" : "3.5rem",
          borderRadius: "3rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: mobile ? "2rem" : "3rem",
          margin: mobile ? "-15vh 1rem 6rem 1rem" : "-15vh 6rem 12rem 6rem",
        }}
      >
        <img
          src={morphRocket}
          alt="morph-rocket"
          style={{
            height: mobile ? "80px" : "120px",
            width: mobile ? "80px" : "120px",
            animation: "float 3s ease-in-out infinite, move 3s ease-in-out infinite, move 2s linear infinite",
          }}
        />
        <style>
          {`
            @keyframes move {
              0% { transform: translateY(3px); }
              50% { transform: translateY(-3px); }
              100% { transform: translateY(3px); }
            }
          `}
        </style>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: mobile ? "column" : "row",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: mobile ? "2.5rem" : "3.5rem",
                fontWeight: 500,
                color: "rgb(210, 210, 210)",
                display: "flex",
                alignItems: "center",
              }}
            >
              Now Live on{" "}
            </h2>
            <a href="https://morphl2.io" target="_blank" rel="noopener noreferrer">
              <img
                style={{ height: "8rem", width: "auto" }}
                src="https://morphl2brand.notion.site/image/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Ffcab2c10-8da9-4414-aa63-4998ddf62e78%2Fdd757d90-b4fb-4c1d-9ccb-e4f3dab3b78d%2FMorph.logo_Horizontal_Green.png?table=block&id=83fb712b-a47d-4c64-8d9f-6bd1a9e9c68e&spaceId=fcab2c10-8da9-4414-aa63-4998ddf62e78&width=1170&userId=&cache=v2"
                alt="Morph"
              />
            </a>
          </div>
          <p
            style={{
              margin: mobile ? "0.5rem 0 0 0" : "-1.2rem 0 0 0",
              color: "rgb(210, 210, 210)",
              fontSize: mobile ? "1.4rem" : "1.8rem",
            }}
          >
            Lightning-fast trades with <br style={{ display: mobile ? "block" : "none" }} />
            near-zero fees
          </p>
        </div>
      </div>

      <div
        style={{
          width: "100%",
        }}
      >
        <DefiOptions mobile={mobile} />
      </div>

      <div
        style={{
          padding: mobile ? "1rem" : "4rem",
          borderRadius: "2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <h2
          style={{
            fontSize: mobile ? "3rem" : "5rem",
            textAlign: "center",
            background: "linear-gradient(90deg, #0F55E8, #9DDFF3)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: mobile ? "1.5rem" : "4rem",
          }}
        >
          Roadmap
        </h2>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            position: "relative",
            padding: "2rem 0",
          }}
        >
          {/* Vertical Timeline Line */}
          <div
            style={{
              display: mobile ? "none" : "block",
              position: "absolute",
              left: mobile ? "1rem" : "50%",
              transform: mobile ? "translateX(20px)" : "translateX(-50%)",
              width: "4px",
              height: "100%",
              background: "linear-gradient(180deg, #0F55E8, #9DDFF3)",
              zIndex: 2,
            }}
          />

          {/* Timeline Content */}
          <div style={{ width: "100%", maxWidth: "1000px", position: "relative", zIndex: 1 }}>
            {[
              {
                phase: "Ignition Phase",
                emoji: "🚀",
                items: ["MorphL2 Mainnet", "Add Exchange Features", "Add Your Favorite Meme Coin on ~50x Leverage"],
              },
              {
                phase: "Growth Phase",
                emoji: "⚡",
                items: ["Launch TMX", "Easy multi-chain bridge", "Easy onboard/offboard"],
              },
              {
                phase: "Launchpad Phase",
                emoji: "🛠️",
                items: ["Tradfi integrations", "Realworld asset integrations", "Onchain options"],
              },
              {
                phase: "Expansion Phase",
                emoji: "✨",
                items: ["NFT options", "Forex", "Add Compliant Pool Options"],
              },
            ].map((phase, index) => (
              <div
                key={phase.phase}
                style={{
                  display: "flex",
                  justifyContent: mobile ? "center" : index % 2 === 0 ? "flex-start" : "flex-end",
                  marginBottom: mobile ? "2rem" : "4rem",
                  position: "relative",
                }}
              >
                {/* Phase Content */}
                <div
                  style={{
                    width: mobile ? "calc(100% - 4rem)" : "45%",
                    marginLeft: mobile ? "2rem" : "0",
                    background: "rgba(15,85,232,0.1)",
                    borderRadius: "1rem",
                    padding: mobile ? "1rem" : "2rem",
                    border: "1px solid rgba(157,223,243,0.2)",
                    position: "relative",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {/* Phase Icon */}
                  <div
                    style={{
                      width: mobile ? "6rem" : "8rem",
                      height: mobile ? "6rem" : "8rem",
                      background: "linear-gradient(45deg, #0F55E8, #9DDFF3)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid #1a1c2a",
                      marginLeft: mobile ? "-3rem" : "-6rem",
                      marginRight: mobile ? "1rem" : "0",
                    }}
                  >
                    <span style={{ fontSize: mobile ? "2.8rem" : "4rem" }}>{phase.emoji}</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                        marginLeft: mobile ? "0" : "2rem",
                      }}
                    >
                      <h3
                        style={{
                          color: "#9DDFF3",
                          fontSize: mobile ? "1.4rem" : "2rem",
                          margin: "0 0 1rem 0",
                        }}
                      >
                        {phase.phase}
                      </h3>
                    </div>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        marginLeft: mobile ? "0" : "2rem",
                      }}
                    >
                      {phase.items.map((item, i) => (
                        <li
                          key={item}
                          style={{
                            color: "#7B80B8",
                            marginBottom: "-0.5rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: mobile ? "1.2rem" : "1.4rem",
                          }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: mobile ? "2rem" : "4rem",
          background: "linear-gradient(-72deg, rgba(15,85,232,0.1), rgba(157,223,243,0.1))",
          borderRadius: "2rem",
          margin: mobile ? "2rem 1rem" : "2rem 6rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <h2
          style={{
            fontSize: mobile ? "2.5rem" : "4rem",
            textAlign: "center",
            background: "linear-gradient(90deg, #0F55E8, #9DDFF3)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: mobile ? "2rem" : "4rem",
            filter: "blur(8px)",
          }}
        >
          Tokenomics
        </h2>
        <div
          style={{
            position: "absolute",
            top: "45px",
            right: "-65px",
            backgroundColor: "#FF7028",
            color: "white",
            padding: "8px 80px",
            transform: "rotate(45deg)",
            fontSize: mobile ? "1.2rem" : "1.6rem",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            zIndex: 1,
            fontWeight: 600,
          }}
        >
          Coming Soon
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: mobile ? "column" : "row",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            filter: "blur(6px)",
            gap: mobile ? "2rem" : 0,
          }}
        >
          <div
            style={{
              position: "relative",
              width: mobile ? "300px" : "500px",
              height: mobile ? "300px" : "500px",
            }}
          >
            {/* Circular Progress Background */}
            <svg
              viewBox="0 0 200 200"
              style={{
                position: "absolute",
                transform: "rotate(-90deg)",
                width: "100%",
                height: "100%",
              }}
            >
              {[
                { percentage: 50, color: "rgba(157,223,243,0.5)", offset: 0 },
                { percentage: 12, color: "rgba(123,128,184,0.5)", offset: 50 },
                { percentage: 20, color: "rgba(15,85,232,0.5)", offset: 62 },
                { percentage: 5, color: "rgba(255,112,40,0.5)", offset: 82 },
                { percentage: 2, color: "rgba(75,85,99,0.5)", offset: 87 },
                { percentage: 5, color: "rgba(55,65,81,0.5)", offset: 89 },
                { percentage: 4, color: "rgba(31,41,55,0.5)", offset: 94 },
                { percentage: 2, color: "rgba(17,24,39,0.5)", offset: 98 },
              ].map((segment, index) => {
                const radius = 90;
                const circumference = 2 * Math.PI * radius;
                const offset = (segment.offset / 100) * circumference;
                const length = (segment.percentage / 100) * circumference;

                return (
                  <circle
                    key={index}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="20"
                    strokeDasharray={`${length} ${circumference}`}
                    strokeDashoffset={-offset}
                    style={{
                      transition: "stroke-dashoffset 1s ease-in-out",
                    }}
                  />
                );
              })}
              {/* Center Circle */}
              <circle cx="100" cy="100" r="60" fill="#1a1c2a" stroke="rgba(157,223,243,0.2)" strokeWidth="2" />
            </svg>

            {/* Center Content */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                color: "white",
                borderRadius: "50%",
              }}
            >
              <img
                src={tmxImg}
                alt="TMX"
                style={{
                  width: mobile ? "60px" : "100px",
                  height: mobile ? "60px" : "100px",
                }}
              />
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              marginLeft: mobile ? 0 : "4rem",
              display: "grid",
              gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "1fr",
              gap: "1rem",
              fontSize: mobile ? "0.9rem" : "inherit",
            }}
          >
            {[
              { label: "Public Sale", color: "rgba(157,223,243,0.5)" },
              { label: "Liquidity", color: "rgba(123,128,184,0.5)" },
              { label: "Ecosystem", color: "rgba(15,85,232,0.5)" },
              { label: "Private Sale", color: "rgba(255,112,40,0.5)" },
              { label: "Rewards", color: "rgba(75,85,99,0.5)" },
              { label: "Marketing", color: "rgba(55,65,81,0.5)" },
              { label: "Team", color: "rgba(31,41,55,0.5)" },
              { label: "Advisors", color: "rgba(17,24,39,0.5)" },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: item.color,
                  }}
                />
                <div style={{ color: "#7B80B8" }}>{item.label}</div>
                <div style={{ color: "white", marginLeft: "auto" }}>...</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
