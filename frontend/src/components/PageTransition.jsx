import { motion, useReducedMotion } from "framer-motion";

const MotionDiv = motion.div;

export default function PageTransition({ children }) {
  const reduce = useReducedMotion();

  return (
    <MotionDiv
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </MotionDiv>
  );
}
