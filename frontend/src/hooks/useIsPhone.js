import { useState, useEffect } from "react";

/**
 * Checks synchronously whether the current screen is a normal phone (< 768px),
 * excluding tablets, iPads (>= 768px), and desktops.
 */
export function isPhoneScreen() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

/**
 * React hook that returns true if the current screen width is a normal phone (< 768px),
 * updating dynamically on window resize events.
 */
export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(isPhoneScreen);

  useEffect(() => {
    const handleResize = () => {
      setIsPhone(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isPhone;
}

