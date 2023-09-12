import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation, useOutlet } from "react-router";
import styles from "./AnimatedOutlet.module.css";

const pageOrder: { [key: string]: number } = {
  "/": 0,
  "/request": 1,
  "/handshake": 2,
  "/chat": 3,
};
const animationVariants = {
  fromLeft: {
    initial: {
      x: "-100vw",
      opacity: 0,
    },
    in: {
      x: "0vw",
      opacity: 1,
    },
    out: {
      opacity: 0,
    },
    transition: {
      type: "spring",
      bounce: 0.15,
      duration: 0.4,
      opacity: { ease: "linear", duration: 0.1 },
    },
  },
  fromRight: {
    initial: {
      x: "100vw",
      opacity: 0,
    },
    in: {
      x: "0vw",
      opacity: 1,
    },
    out: {
      opacity: 0,
    },
    transition: {
      type: "spring",
      bounce: 0.15,
      duration: 0.4,
      opacity: { ease: "linear", duration: 0.1 },
    },
  },
  none: {
    initial: { x: 0 },
    in: { x: 0 },
    out: {
      opacity: 0,
    },
    transition: {
      type: "none",
      duration: 0,
      opacity: { duration: 0.1, ease: "linear" },
    },
  },
};

export default function AnimatedOutlet() {
  const locationState = useLocation();
  // Has to be done this way to get exit animations working
  const outlet = useOutlet();

  const [prevPage, setPrevPage] = useState<string | null>(null);
  const [animation, setAnimation] = useState<any>(animationVariants.none);

  useEffect(() => {
    let curPage = "/";
    if (locationState.pathname.startsWith("/request")) {
      curPage = "/request";
    } else if (locationState.pathname.startsWith("/handshake")) {
      curPage = "/handshake";
    } else if (locationState.pathname.startsWith("/chat")) {
      curPage = "/chat";
    }

    if (prevPage !== null && pageOrder[prevPage] > pageOrder[curPage]) {
      setAnimation(animationVariants.fromLeft);
    } else if (prevPage !== null && pageOrder[prevPage] < pageOrder[curPage]) {
      setAnimation(animationVariants.fromRight);
    }

    setPrevPage(curPage);
  }, [locationState]);
  return (
    <AnimatePresence mode="wait">
      <motion.main
        className={styles.main}
        key={locationState.pathname}
        initial={animation.initial}
        animate={animation.in}
        exit={animation.out}
        transition={animation.transition}
      >
        {outlet}
      </motion.main>
    </AnimatePresence>
  );
}
