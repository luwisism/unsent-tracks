import type { Transition } from "motion/react";

// Crisp, taut spring with almost zero wobble (feels like physical print/tape hardware)
export const TACTILE_SPRING: Transition = {
  type: "spring",
  stiffness: 460,
  damping: 34,
  mass: 0.75,
};

// Fast architectural ease for collapsible panels & subtle reveals
export const SWISS_EASE: Transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};
