import type { RefObject } from "react";
import { useState, useEffect } from "react";

export interface Dimensions {
  height: number;
  width: number;
}

const useResizeObserver = (ref?: RefObject<HTMLElement>): Dimensions | null => {
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);

  useEffect(() => {
    if (!ref?.current) return;

    const updateDimensions = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      setDimensions({ height: rect.height, width: rect.width });
    };

    updateDimensions(ref.current);

    const resizeObserver = new ResizeObserver((entries) => {
      if (!Array.isArray(entries) || !entries.length) {
        return;
      }

      const entry = entries[0];
      updateDimensions(entry.target as HTMLElement);
    });

    resizeObserver.observe(ref.current);

    return () => {
      if (resizeObserver && ref.current) {
        resizeObserver.unobserve(ref.current);
      }
    };
  }, [ref, ref?.current]);

  return dimensions;
};

export default useResizeObserver;
