import { motion } from "framer-motion";
import "./StepIndicator.css";

export default function StepIndicator({ digit }) {
  return (
    <motion.div className="Circular-digit" style={{ backgroundColor: "#21232A", fontFamily: "tektur" }}>
      {digit}
    </motion.div>
  );
}
