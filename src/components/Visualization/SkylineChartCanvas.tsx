'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SkylineChartCanvasProps {
  powerData: number[];
  basePower?: number[];
  n: number;
  heatmapMode?: boolean;
  targetPower?: number;
  activeCityId?: number;
  citiesInRange?: number[];
  activePlacementAdd?: number;
  activePlacementAffectedCities?: number[];
  placementAnimationPhase?: 'before' | 'animating' | 'committed';
  allPlacements?: Array<{ cityId: number; addedPower: number }>;
  /** When provided with length === n, x-axis shows city names (Excel mode) */
  cityLabels?: string[];
}

export default function SkylineChartCanvas({
  powerData,
  basePower,
  n,
  heatmapMode = false,
  targetPower,
  activeCityId,
  citiesInRange = [],
  activePlacementAdd = 0,
  activePlacementAffectedCities = [],
  placementAnimationPhase = 'before',
  allPlacements = [],
  cityLabels,
}: SkylineChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      // Increase height for better visibility with many cities
      canvas.height = Math.max(400, Math.min(600, 300 + n * 5));

      const width = canvas.width;
      const height = canvas.height;
      const padding = { top: 40, right: 40, bottom: 60, left: 60 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      // Calculate maxPower - ensure it includes targetPower if provided
      let maxPower = Math.max(...powerData, 1);
      let chartMaxPower = maxPower;
      if (targetPower !== undefined) {
        chartMaxPower = Math.max(maxPower, targetPower);
      }
      if (placementAnimationPhase === 'committed' && activePlacementAdd > 0) {
        // Include the addition for affected cities in maxPower calculation
        const maxWithAddition = Math.max(
          ...powerData.map((p, i) => 
            activePlacementAffectedCities.includes(i) ? p + activePlacementAdd : p
          ),
          chartMaxPower
        );
        chartMaxPower = maxWithAddition;
      }
      // Use chartMaxPower for all calculations
      maxPower = chartMaxPower;
      // Calculate bar width - ensure minimum width for visibility
      const minBarWidth = 2;
      const calculatedBarWidth = chartWidth / Math.max(n, 1);
      const barWidth = Math.max(minBarWidth, calculatedBarWidth);
      const barSpacing = n > 50 ? 0 : (n > 20 ? 1 : 2);
      
      const useNameLabels = cityLabels && cityLabels.length === n;
      // Calculate label interval based on number of cities
      const labelInterval = useNameLabels ? 1 : n > 50 ? 10 : n > 30 ? 5 : n > 20 ? 3 : 1;
      
      // Calculate actual chart width needed
      const actualChartWidth = barWidth * n;
      const actualPadding = { ...padding };
      // Use the larger of calculated width or available width
      const finalChartWidth = Math.max(chartWidth, actualChartWidth);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = actualPadding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(actualPadding.left, y);
        ctx.lineTo(actualPadding.left + finalChartWidth, y);
        ctx.stroke();

        const value = maxPower - (maxPower / 5) * i;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(value).toString(), actualPadding.left - 10, y + 4);
      }

      // Draw bars
      for (let i = 0; i < n; i++) {
        const x = actualPadding.left + i * barWidth;
        
        // Calculate effective power - powerData shows power BEFORE current step's addition
        let effectivePower = powerData[i];
        if (placementAnimationPhase === 'committed' && activePlacementAffectedCities.includes(i)) {
          // After animation, show power with addition
          effectivePower = powerData[i] + activePlacementAdd;
        }
        // During 'before' and 'animating' phases, powerData already shows power before addition, so use it as is
        
        const barHeight = (effectivePower / maxPower) * chartHeight;
        const y = actualPadding.top + chartHeight - barHeight;

        // Determine if city is active or in range
        const isActive = activeCityId !== undefined && i === activeCityId;
        const isInRange = citiesInRange.includes(i);
        const isAffected = activePlacementAffectedCities.includes(i);
        
        // Opacity: dim non-focused cities only during step-by-step playback (not before/after or static final view)
        const stepFocusActive =
          activeCityId !== undefined ||
          citiesInRange.length > 0 ||
          (isAffected && placementAnimationPhase === 'animating');

        let opacity = 1;
        if (stepFocusActive) {
          if (isActive) {
            opacity = 1;
          } else if (isInRange) {
            opacity = 0.75;
          } else if (isAffected && placementAnimationPhase === 'animating') {
            opacity = 0.8;
          } else {
            opacity = 0.4;
          }
        }

        // Color based on mode
        let color: string;
        if (heatmapMode && targetPower !== undefined) {
          // Heatmap mode: red (below target), green (at target), blue (above target)
          if (effectivePower < targetPower) {
            // Below target - red gradient based on how far below
            const deficit = targetPower - effectivePower;
            const maxDeficit = targetPower;
            const intensity = Math.min(1, deficit / maxDeficit);
            color = `rgb(${Math.floor(200 + 55 * intensity)}, 0, 0)`;
          } else if (effectivePower === targetPower) {
            // At target - green
            color = 'rgb(0, 200, 0)';
          } else {
            // Above target - blue gradient based on how far above
            const excess = effectivePower - targetPower;
            const maxExcess = maxPower - targetPower;
            const intensity = Math.min(1, excess / Math.max(maxExcess, 1));
            color = `rgb(0, ${Math.floor(100 + 155 * (1 - intensity))}, ${Math.floor(200 + 55 * intensity)})`;
          }
        } else {
          // Default mode: gradient based on power level
          const ratio = effectivePower / maxPower;
          if (ratio < 0.3) {
            color = `rgb(${Math.floor(255 * ratio / 0.3)}, 0, 0)`;
          } else if (ratio < 0.6) {
            color = `rgb(255, ${Math.floor(255 * (ratio - 0.3) / 0.3)}, 0)`;
          } else {
            color = `rgb(${Math.floor(255 * (1 - (ratio - 0.6) / 0.4))}, 255, 0)`;
          }
        }

        // Draw base power (darker) - only if different and not during animation
        if (basePower && basePower[i] !== effectivePower && placementAnimationPhase !== 'animating') {
          const baseHeight = (basePower[i] / maxPower) * chartHeight;
          ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
          ctx.fillRect(x + barSpacing, actualPadding.top + chartHeight - baseHeight, barWidth - barSpacing * 2, baseHeight);
        }

        // Draw current power with opacity
        const gradient = ctx.createLinearGradient(x, y, x, actualPadding.top + chartHeight);
        const colorMatch = color.match(/\d+/g);
        if (colorMatch) {
          gradient.addColorStop(0, `rgba(${colorMatch.join(',')}, ${opacity})`);
          gradient.addColorStop(1, `rgba(${colorMatch.join(',')}, ${opacity * 0.5})`);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(x + barSpacing, y, barWidth - barSpacing * 2, barHeight);

        // Draw border only if bars are wide enough
        if (barWidth > 3) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * opacity})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + barSpacing, y, barWidth - barSpacing * 2, barHeight);
        }
        
        // Highlight active city with blue border
        if (isActive) {
          ctx.strokeStyle = 'rgba(77, 160, 225, 0.9)';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + barSpacing - 2, y - 2, barWidth - barSpacing * 2 + 4, barHeight + 4);
        }
        
        // Highlight cities in range with green dashed border
        if (isInRange && !isActive) {
          ctx.strokeStyle = 'rgba(102, 187, 106, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 4]); // Dashed pattern: 8px dash, 4px gap
          ctx.strokeRect(x + barSpacing - 2, y - 2, barWidth - barSpacing * 2 + 4, barHeight + 4);
          ctx.setLineDash([]); // Reset to solid line
        }

        // Draw city index or Excel city name
        if (i % labelInterval === 0 || i === n - 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = useNameLabels ? '8px monospace' : n > 30 ? '8px monospace' : '10px monospace';
          ctx.textAlign = 'center';
          const raw = useNameLabels ? (cityLabels![i] ?? String(i)) : i.toString();
          const text =
            useNameLabels && raw.length > 12 ? `${raw.slice(0, 11)}…` : raw;
          ctx.fillText(text, x + barWidth / 2, actualPadding.top + chartHeight + 20);
        }
      }

      // Draw target line if provided (AFTER bars to ensure it's on top)
      if (targetPower !== undefined) {
        const targetY = actualPadding.top + chartHeight - (targetPower / maxPower) * chartHeight;
        
        // Draw DASHED target line (moderate thickness, no glow)
        ctx.strokeStyle = 'rgba(255, 100, 50, 1.0)'; // Brighter orange-red
        ctx.lineWidth = 4; // Moderate thickness
        ctx.setLineDash([10, 5]); // Dashed pattern
        ctx.beginPath();
        ctx.moveTo(actualPadding.left, targetY);
        ctx.lineTo(actualPadding.left + finalChartWidth, targetY);
        ctx.stroke();
        ctx.setLineDash([]); // Reset to solid
        
        // Draw thick connector line from y-axis to target line
        ctx.strokeStyle = 'rgba(255, 138, 101, 1)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(actualPadding.left - 6, targetY);
        ctx.lineTo(actualPadding.left, targetY);
        ctx.stroke();
        
        // Draw "Target" badge on right side - HIGHLY VISIBLE
        ctx.fillStyle = 'rgba(50, 30, 30, 0.95)';
        ctx.fillRect(actualPadding.left + finalChartWidth - 75, targetY - 18, 75, 22);
        ctx.strokeStyle = 'rgba(255, 138, 101, 1)';
        ctx.lineWidth = 3;
        ctx.strokeRect(actualPadding.left + finalChartWidth - 75, targetY - 18, 75, 22);
        ctx.fillStyle = 'rgba(255, 200, 150, 1)';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Target: ' + targetPower, actualPadding.left + finalChartWidth - 37, targetY - 2);
      }

      // Draw axis labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(cityLabels && cityLabels.length === n ? 'Cities' : 'City Index', width / 2, height - 10);
      ctx.save();
      ctx.translate(20, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Power Level', 0, 0);
      ctx.restore();
    };

    updateCanvas();
    window.addEventListener('resize', updateCanvas);
    return () => window.removeEventListener('resize', updateCanvas);
  }, [powerData, basePower, n, heatmapMode, targetPower, activeCityId, citiesInRange, activePlacementAdd, activePlacementAffectedCities, placementAnimationPhase, cityLabels]);

  // Calculate minimum width needed for all bars
  const minBarWidth = 2;
  const minTotalWidth = n * minBarWidth + 120; // padding + bars

  return (
    <div className="w-full overflow-x-auto relative">
      <div 
        ref={containerRef} 
        className="w-full"
        style={{ minWidth: `${Math.max(600, minTotalWidth)}px` }}
      >
        <canvas ref={canvasRef} className="w-full" />
      </div>

      {/* Collapsed Legend Panel - Below Chart */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        {/* Collapsed Button */}
        {!isLegendExpanded && (
          <button
            onClick={() => setIsLegendExpanded(true)}
            className="w-full py-1.5 px-3 bg-slate-800/60 backdrop-blur-sm border-t border-slate-700/50 hover:bg-slate-700/60 transition-colors flex items-center justify-center gap-2 text-xs text-text-secondary hover:text-text-primary"
          >
            <span className="text-sm">ℹ</span>
            <span className="font-medium">Legend</span>
          </button>
        )}

        {/* Expanded Legend Strip */}
        <AnimatePresence>
          {isLegendExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-800/80 backdrop-blur-sm border-t border-slate-700/50 overflow-hidden"
            >
              <div className="px-4 py-2.5 flex items-center justify-center gap-6 flex-wrap relative">
                {/* Close button */}
                <button
                  onClick={() => setIsLegendExpanded(false)}
                  className="absolute top-2 right-2 text-text-secondary hover:text-text-primary transition-colors text-xs"
                  title="Close legend"
                >
                  ✕
                </button>

                {/* 📊 Power Status Section */}
                <div className="flex items-center gap-4">
                  <span className="text-[9px] text-text-secondary/60 font-semibold uppercase tracking-wider">Power Status</span>
                  
                  {/* 🟢 Green = Above target */}
                  <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                    <div className="w-3 h-3 rounded bg-green-500/40 border border-green-500/60"></div>
                    <span>Above</span>
                  </div>

                  {/* 🔴 Red = Below target */}
                  <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                    <div className="w-3 h-3 rounded bg-red-500/40 border border-red-500/60"></div>
                    <span>Below</span>
                  </div>

                  {/* 🔵 Blue = Active city */}
                  {activeCityId !== undefined && (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                      <div className="w-3 h-3 rounded border-2 border-blue-400"></div>
                      <span>Active</span>
                    </div>
                  )}
                </div>

                {/* 🎯 Target Section */}
                {targetPower !== undefined && (
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] text-text-secondary/60 font-semibold uppercase tracking-wider">Target</span>
                    
                    {/* Dashed line = Current mid */}
                    <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                      <div className="w-8 h-0.5 border-t-2 border-dashed border-text-secondary/60"></div>
                      <span>Mid</span>
                    </div>
                  </div>
                )}

                {/* ⚡ Station Effect Section */}
                {(activePlacementAdd > 0 || citiesInRange.length > 0) && (
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] text-text-secondary/60 font-semibold uppercase tracking-wider">Station Effect</span>
                    
                    {/* ⚡ Lightning = Station placed */}
                    {activePlacementAdd > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                        <span className="text-orange-400 text-sm">⚡</span>
                        <span>Station</span>
                      </div>
                    )}

                    {/* 🟦 Shaded area = Range (r) */}
                    {citiesInRange.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                        <div className="w-3 h-3 rounded border border-green-400/60 border-dashed bg-green-400/10"></div>
                        <span>Range</span>
                      </div>
                    )}

                    {/* +X = Power added */}
                    {activePlacementAdd > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                        <div className="px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[9px] font-semibold">
                          +{activePlacementAdd}
                        </div>
                        <span>Added</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
