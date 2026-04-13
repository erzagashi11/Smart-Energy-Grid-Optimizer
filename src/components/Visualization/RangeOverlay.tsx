'use client';

import { motion } from 'framer-motion';
import { useMemo, useEffect, useState } from 'react';

interface RangeOverlayProps {
  cityIndex: number;
  r: number;
  n: number;
  placedAt: number;
}

export default function RangeOverlay({ cityIndex, r, n, placedAt }: RangeOverlayProps) {
  const [canvasWidth, setCanvasWidth] = useState(1000);
  
  useEffect(() => {
    const updateWidth = () => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        setCanvasWidth(canvas.offsetWidth || canvas.width || 1000);
      }
    };
    
    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    const canvas = document.querySelector('canvas');
    if (canvas) {
      resizeObserver.observe(canvas);
    }
    
    window.addEventListener('resize', updateWidth);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);
  
  // Calculate positions directly in render for smooth animation
  const positions = useMemo(() => {
    const containerWidth = canvasWidth;
    const padding = { left: 60, right: 40 };
    const chartWidth = containerWidth - padding.left - padding.right;
    const minBarWidth = 2;
    const calculatedBarWidth = chartWidth / Math.max(n, 1);
    const barWidth = Math.max(minBarWidth, calculatedBarWidth);
    
    // Current city position - ensure it's always valid
    const validCityIndex = Math.max(0, Math.min(cityIndex, n - 1));
    const currentCityLeft = ((padding.left + validCityIndex * barWidth) / containerWidth) * 100;
    const currentCityWidth = (barWidth / containerWidth) * 100;
    
    // Effect range - only calculate if placedAt is valid
    let effectLeft = 0;
    let effectWidth = 0;
    if (placedAt >= 0 && placedAt < n) {
      const effectStart = Math.max(0, placedAt - r);
      const effectEnd = Math.min(n - 1, placedAt + r);
      effectLeft = ((padding.left + effectStart * barWidth) / containerWidth) * 100;
      effectWidth = (((effectEnd - effectStart + 1) * barWidth) / containerWidth) * 100;
    }
    
    return { currentCityLeft, currentCityWidth, effectLeft, effectWidth };
  }, [cityIndex, r, n, placedAt, canvasWidth]);

  return (
    <>
      {/* Current city being checked - highlight in blue */}
      <motion.div
        animate={{ 
          opacity: 0.4,
          left: `${positions.currentCityLeft}%`,
          width: `${positions.currentCityWidth}%`,
        }}
        transition={{ 
          duration: 0.4,
          ease: "easeInOut",
        }}
        className="absolute bg-accent-blue/30 border-2 border-accent-blue rounded z-5"
        style={{
          top: '40px',
          bottom: '60px',
          pointerEvents: 'none',
        }}
      />
      
      {/* Effect range of the station - highlight in green if station was placed */}
      {placedAt >= 0 && placedAt < n && (
        <motion.div
          animate={{ 
            opacity: 0.2,
            left: `${positions.effectLeft}%`,
            width: `${positions.effectWidth}%`,
          }}
          transition={{ 
            duration: 0.4,
            ease: "easeInOut",
          }}
          className="absolute bg-accent-green/20 border border-accent-green/50 rounded z-4"
          style={{
            top: '40px',
            bottom: '60px',
            pointerEvents: 'none',
          }}
        />
      )}
    </>
  );
}
