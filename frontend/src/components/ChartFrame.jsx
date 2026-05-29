import { useEffect, useRef, useState } from 'react';

export default function ChartFrame({ children, height, minWidth = 320, className = '' }) {
  const containerRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(minWidth);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const updateWidth = () => {
      const measuredWidth = Math.floor(element.getBoundingClientRect().width || 0);
      setChartWidth(Math.max(minWidth, measuredWidth));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minWidth]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-x-auto ${className}`}
      style={{ height, minHeight: height }}
    >
      <div style={{ width: chartWidth, height }}>
        {children(chartWidth, height)}
      </div>
    </div>
  );
}
