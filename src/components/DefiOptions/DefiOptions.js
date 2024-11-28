import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function DefiOptions({ mobile }) {
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
  };

  const tokenItemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    hover: { x: 10, transition: { duration: 0.2 } },
  };

  const tagVariants = {
    initial: { scale: 0.9 },
    animate: { scale: 1 },
    hover: { scale: 1.1, transition: { duration: 0.2 } },
  };

  return (
    <motion.div
      className="defi-options-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)",
        gap: "2rem",
        padding: "2rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Trade Option */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        transition={{ duration: 0.3 }}
      >
        <Link
          to="/trade"
          className="defi-card"
          style={{
            display: "block",
            background: "linear-gradient(-72deg, rgba(15,85,232,0.2), rgba(157,223,243,0.2))",
            borderRadius: "16px",
            padding: "2rem",
            color: "#fff",
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.2)",
            height: "100%",
          }}
        >
          <motion.div variants={tagVariants} style={{ marginBottom: "1rem" }}>
            <span
              style={{
                background: "rgba(15,85,232,0.3)",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                fontSize: "0.9rem",
              }}
            >
              Trade
            </span>
          </motion.div>
          <h2 style={{ fontWeight: 400, color: "#9DDFF3", marginBottom: "1rem" }}>Leverage trading made simple.</h2>
          <div className="token-list" style={{ marginTop: "2rem" }}>
            <motion.div
              variants={tokenItemVariants}
              className="token-item"
              style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}
            >
              <span
                style={{
                  background: "rgba(15,85,232,0.2)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  width: "100%",
                }}
              >
                Ethereum ETH
              </span>
              {/* <span>$3,594.38 ↑ 6.62%</span> */}
            </motion.div>
          </div>
        </Link>
      </motion.div>

      {/* Get Leverage Option */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Link
          to="/trade"
          className="defi-card"
          style={{
            display: "block",
            background: "linear-gradient(-72deg, rgba(255,112,40,0.2), rgba(189,81,27,0.2))",
            borderRadius: "16px",
            padding: "2rem",
            color: "#fff",
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.2)",
            height: "100%",
          }}
        >
          <motion.div variants={tagVariants} style={{ marginBottom: "1rem" }}>
            <span
              style={{
                background: "rgba(255,112,40,0.3)",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                fontSize: "0.9rem",
              }}
            >
              Get Leverage
            </span>
          </motion.div>
          <h2 style={{ fontWeight: 400, color: "rgb(219 190 176)", marginBottom: "1rem" }}>
            Trade with up to 100x leverage. Available on multiple chains.
          </h2>
          <motion.div
            className="leverage-preview"
            whileHover={{ scale: 1.05 }}
            style={{
              background: "rgba(189,81,27,0.2)",
              borderRadius: "12px",
              padding: "1rem",
              marginTop: "2rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "500" }}>ETH/USD</div>
                <div style={{ color: "#7B80B8", fontSize: "0.9rem" }}>100x max</div>
              </div>
              {/* <div style={{ color: "#FF7028", fontSize: "0.9rem" }}>0.01% fee</div> */}
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* Swap Option */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Link
          to="/swap"
          className="defi-card"
          style={{
            display: "block",
            background: "linear-gradient(-72deg, rgba(123,128,184,0.2), rgba(75,85,99,0.2))",
            borderRadius: "16px",
            padding: "2rem",
            color: "#fff",
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.2)",
            height: "100%",
          }}
        >
          <motion.div variants={tagVariants} style={{ marginBottom: "1rem" }}>
            <span
              style={{
                background: "rgba(123,128,184,0.3)",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                fontSize: "0.9rem",
              }}
            >
              Swap
            </span>
          </motion.div>
          <h2 style={{ fontWeight: 400, color: "rgb(161 167 240)", marginBottom: "1rem" }}>
            Instant token swaps with great rates.
          </h2>
          <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              className="token-item"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.1)",
                padding: "0.75rem 1.5rem",
                borderRadius: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "500" }}>ETH</div>
              </div>
            </div>
            <div
              className="token-item"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.1)",
                padding: "0.75rem 1.5rem",
                borderRadius: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "500" }}>WBTC</div>
              </div>
            </div>
            <div
              className="token-item"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.1)",
                padding: "0.75rem 1.5rem",
                borderRadius: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "500" }}>USDT</div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
