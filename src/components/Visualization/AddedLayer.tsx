'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AddedLayerProps {
  placedAt: number;
  add: number;
  n: number;
  placementAnimationPhase?: 'before' | 'animating' | 'committed';
}

export default function AddedLayer({ placedAt, add, n, placementAnimationPhase = 'before' }: AddedLayerProps) {
  const [position, setPosition] = useState({ left: 0, width: 0 });
  
  useEffect(() => {
    // Get actual canvas width and calculate position
    const updatePosition = () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      
      // Use offsetWidth for accurate positioning (canvas.width might be 0 initially)
      const containerWidth = canvas.offsetWidth || canvas.width || 1000;
      const padding = { left: 60, right: 40 };
      const chartWidth = containerWidth - padding.left - padding.right;
      const minBarWidth = 2;
      const calculatedBarWidth = chartWidth / Math.max(n, 1);
      const barWidth = Math.max(minBarWidth, calculatedBarWidth);
      
      const leftPercent = ((padding.left + placedAt * barWidth) / containerWidth) * 100;
      const widthPercent = (barWidth / containerWidth) * 100;
      
      setPosition({ left: leftPercent, width: widthPercent });
    };
    
    updatePosition();
    
    // Use ResizeObserver for better performance
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const resizeObserver = new ResizeObserver(updatePosition);
      resizeObserver.observe(canvas);
      
      window.addEventListener('resize', updatePosition);
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updatePosition);
      };
    }
    
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [placedAt, n]);
  
  if (placedAt < 0 || placedAt >= n || placementAnimationPhase !== 'animating') return null;

  return (
    <motion.div
      key={`added-${placedAt}`}
      initial={{ scale: 0, opacity: 0, y: -20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ 
        duration: 0.4,
        type: "spring",
        stiffness: 200
      }}
      className="absolute bg-accent-orange/95 border-2 border-accent-orange rounded-t flex items-center justify-center text-xs font-mono font-bold text-white shadow-lg z-10"
      style={{
        left: `${position.left}%`,
        width: `${position.width}%`,
        bottom: '60px',
        height: '36px',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 0 8px rgba(255, 138, 101, 0.8))',
        boxShadow: '0 0 12px rgba(255, 138, 101, 0.6)',
      }}
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.3, 1] }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="mr-1 text-lg"
        style={{
          filter: 'drop-shadow(0 0 4px rgba(255, 138, 101, 0.8))',
        }}
      >
        ⚡
      </motion.span>
      <span>+{add}</span>
    </motion.div>
  );
}
