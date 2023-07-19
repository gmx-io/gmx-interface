import { motion } from "framer-motion";
import "./StepIndicator.css";

export default function StepIndicator({ digit }) {
  return (
    <motion.div className="Circular-digit" style={{ borderColor: "green" }}>
      {digit}
    </motion.div>
  );
}
