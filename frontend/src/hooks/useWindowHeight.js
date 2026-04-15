import { useState, useEffect } from "react";

const RESIZE_DEBOUNCE_MS = 100;

export function useWindowHeight() {
  const [height, setHeight] = useState(window.innerHeight);

  useEffect(() => {
    let timer = null;
    function handleResize() {
      clearTimeout(timer);
      timer = setTimeout(() => setHeight(window.innerHeight), RESIZE_DEBOUNCE_MS);
    }
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return height;
}
