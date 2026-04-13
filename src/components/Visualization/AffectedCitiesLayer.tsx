'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AffectedCitiesLayerProps {
  affectedCities: number[];
  add: number;
  n: number;
  placementAnimationPhase: 'before' | 'animating' | 'committed';
}

export default function AffectedCitiesLayer({ 
  affectedCities, 
  add, 
  n,
  placementAnimationPhase 
}: AffectedCitiesLayerProps) {
  const [positions, setPositions] = useState<Map<number, { left: number; width: number }>>(new Map());
  
  useEffect(() => {
    const updatePositions = () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      
      const containerWidth = canvas.offsetWidth || canvas.width || 1000;
      const padding = { left: 60, right: 40 };
      const chartWidth = containerWidth - padding.left - padding.right;
      const minBarWidth = 2;
      const calculatedBarWidth = chartWidth / Math.max(n, 1);
      const barWidth = Math.max(minBarWidth, calculatedBarWidth);
      
      const newPositions = new Map<number, { left: number; width: number }>();
      affectedCities.forEach(cityId => {
        const leftPercent = ((padding.left + cityId * barWidth) / containerWidth) * 100;
        const widthPercent = (barWidth / containerWidth) * 100;
        newPositions.set(cityId, { left: leftPercent, width: widthPercent });
      });
      
      setPositions(newPositions);
    };
    
    updatePositions();
    
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const resizeObserver = new ResizeObserver(updatePositions);
      resizeObserver.observe(canvas);
      
      window.addEventListener('resize', updatePositions);
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updatePositions);
      };
    }
    
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [affectedCities, n]);

  if (placementAnimationPhase !== 'animating' || affectedCities.length === 0) return null;

  return (
    <>
      {affectedCities.map((cityId) => {
        const position = positions.get(cityId);
        if (!position) return null;
        
        return (
          <AnimatePresence key={`affected-${cityId}`}>
            <motion.div
              initial={{ opacity: 0, scale: 0, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -30 }}
              transition={{ 
                duration: 0.4,
                delay: 0.2,
                type: "spring",
                stiffness: 200
              }}
              className="absolute pointer-events-none z-20"
              style={{
                left: `${position.left}%`,
                width: `${position.width}%`,
                bottom: '90px',
                pointerEvents: 'none',
              }}
            >
              {/* Lightning icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                transition={{ 
                  duration: 0.5,
                  delay: 0.1,
                  type: "spring",
                  stiffness: 200
                }}
                className="text-center"
              >
                <span className="text-2xl font-bold text-accent-orange" style={{ 
                  filter: 'drop-shadow(0 0 4px rgba(255, 138, 101, 0.8))',
                  textShadow: '0 0 8px rgba(255, 138, 101, 0.6)'
                }}>
                  ⚡
                </span>
              </motion.div>
              
              {/* "+X added" badge */}
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="mt-1 bg-accent-orange/95 border border-accent-orange rounded px-2 py-1 text-center"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(255, 138, 101, 0.6))'
                }}
              >
                <span className="text-[10px] font-bold text-white">+{add}</span>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        );
      })}
    </>
  );
}
