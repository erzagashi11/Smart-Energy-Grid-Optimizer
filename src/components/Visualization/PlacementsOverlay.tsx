'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cityDisplayName } from '@/lib/excel/excelMode';

interface PlacementsOverlayProps {
  placements: Array<{ cityId: number; addedPower: number }>;
  n: number;
  /** Excel: city names aligned by index */
  cityLabels?: string[];
}

export default function PlacementsOverlay({ placements, n, cityLabels }: PlacementsOverlayProps) {
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
      placements.forEach(placement => {
        const leftPercent = ((padding.left + placement.cityId * barWidth) / containerWidth) * 100;
        const widthPercent = (barWidth / containerWidth) * 100;
        newPositions.set(placement.cityId, { left: leftPercent, width: widthPercent });
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
  }, [placements, n]);

  if (placements.length === 0) return null;

  return (
    <>
      {placements.map((placement) => {
        const position = positions.get(placement.cityId);
        if (!position) return null;
        
        return (
          <motion.div
            key={`placement-${placement.cityId}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute pointer-events-none z-20"
            style={{
              left: `${position.left}%`,
              width: `${position.width}%`,
              top: '10px',
              pointerEvents: 'none',
            }}
          >
            {/* City label - above */}
            <div className="text-center mb-1">
              <span className="text-[11px] font-semibold text-accent-orange" style={{ 
                filter: 'drop-shadow(0 0 2px rgba(255, 138, 101, 0.8))'
              }}>
                {cityDisplayName(cityLabels, placement.cityId)}
              </span>
            </div>
            
            {/* "+X" badge */}
            <div className="bg-accent-orange/95 border-2 border-accent-orange rounded px-2 py-1 text-center mb-1" style={{
              filter: 'drop-shadow(0 0 4px rgba(255, 138, 101, 0.6))'
            }}>
              <span className="text-[10px] font-bold text-white">+{placement.addedPower}</span>
            </div>
            
            {/* Lightning icon */}
            <div className="text-center">
              <span className="text-xl font-bold text-accent-orange" style={{ 
                filter: 'drop-shadow(0 0 4px rgba(255, 138, 101, 0.8))',
                textShadow: '0 0 8px rgba(255, 138, 101, 0.6)'
              }}>
                ⚡
              </span>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}
