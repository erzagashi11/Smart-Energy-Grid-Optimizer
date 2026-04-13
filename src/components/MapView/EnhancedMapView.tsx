'use client';

import { useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface City {
  id: number;
  x: number;
  y: number;
  power: number;
  basePower: number;
  targetPower?: number;
}

interface Station {
  id: number;
  x: number;
  y: number;
  addedPower: number;
  coverageRadius: number;
  citiesCovered: number[];
  isExisting?: boolean;
  isNewPlacement?: boolean;
}

interface EnhancedMapViewProps {
  cities: City[];
  stations: Station[];
  targetPower?: number;
  r: number;
  activeCityId?: number;
  showDeficitLabels?: boolean;
  showAllCoverage?: boolean;
  onCityClick?: (cityId: number) => void;
  onStationClick?: (stationId: number) => void;
}

export default function EnhancedMapView({
  cities,
  stations,
  targetPower,
  r,
  activeCityId,
  showDeficitLabels = false,
  showAllCoverage = false,
  onCityClick,
  onStationClick,
}: EnhancedMapViewProps) {
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [hoveredCity, setHoveredCity] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate bounds
  const bounds = useMemo(() => {
    if (cities.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    
    const xs = cities.map(c => c.x);
    const ys = cities.map(c => c.y);
    const padding = 30;
    
    return {
      minX: Math.min(...xs) - padding,
      maxX: Math.max(...xs) + padding,
      minY: Math.min(...ys) - padding,
      maxY: Math.max(...ys) + padding,
    };
  }, [cities]);

  const width = 800;
  const height = 450;
  const scaleX = width / (bounds.maxX - bounds.minX);
  const scaleY = height / (bounds.maxY - bounds.minY);
  const scale = Math.min(scaleX, scaleY) * zoom;

  const transformX = (x: number) => (x - bounds.minX) * scale + pan.x;
  const transformY = (y: number) => (y - bounds.minY) * scale + pan.y;

  // Calculate power statistics
  const powerStats = useMemo(() => {
    if (cities.length === 0) return null;
    
    const powers = cities.map(c => c.power);
    const minPower = Math.min(...powers);
    const maxPower = Math.max(...powers);
    const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
    const citiesBelowTarget = targetPower !== undefined 
      ? cities.filter(c => c.power < targetPower).length 
      : 0;
    
    // Find min/max cities
    const minCity = cities.find(c => c.power === minPower);
    const maxCity = cities.find(c => c.power === maxPower);
    
    // Sort for top/bottom
    const sorted = [...cities].sort((a, b) => a.power - b.power);
    const bottom3 = sorted.slice(0, 3);
    const top3 = sorted.slice(-3).reverse();
    
    return {
      minPower,
      maxPower,
      avgPower,
      citiesBelowTarget,
      minCity,
      maxCity,
      bottom3,
      top3,
    };
  }, [cities, targetPower]);

  // Get color based on power (gradient heat map)
  const getCityColor = (city: City) => {
    if (targetPower === undefined) {
      // No target - use blue scale
      const maxPower = Math.max(...cities.map(c => c.power));
      const ratio = city.power / maxPower;
      return `rgb(${77 + Math.floor(ratio * 100)}, ${160 + Math.floor(ratio * 50)}, ${225})`;
    }
    
    const ratio = city.power / targetPower;
    if (ratio >= 1) {
      // Above target - green
      const excess = Math.min(ratio - 1, 0.5);
      return `rgb(${102 - Math.floor(excess * 50)}, ${187 - Math.floor(excess * 30)}, ${106})`;
    } else if (ratio >= 0.7) {
      // Close to target - yellow/orange
      const closeness = (ratio - 0.7) / 0.3;
      return `rgb(${255 - Math.floor(closeness * 50)}, ${138 + Math.floor(closeness * 30)}, ${101})`;
    } else {
      // Far below - red
      const severity = ratio / 0.7;
      return `rgb(${244}, ${67 + Math.floor((1 - severity) * 50)}, ${54})`;
    }
  };

  // Get city size based on power
  const getCitySize = (city: City) => {
    if (cities.length === 0) return 5;
    const powers = cities.map(c => c.power);
    const minPower = Math.min(...powers);
    const maxPower = Math.max(...powers);
    const range = maxPower - minPower || 1;
    const normalized = (city.power - minPower) / range;
    return 4 + normalized * 4; // 4-8 range
  };

  // Get deficit
  const getDeficit = (city: City) => {
    if (targetPower === undefined) return null;
    const deficit = city.power - targetPower;
    return deficit;
  };

  // Filter coverage circles
  const visibleCoverage = useMemo(() => {
    if (showAllCoverage) return stations;
    
    // Show only active city coverage or last placement
    if (activeCityId !== undefined) {
      const activeCity = cities.find(c => c.id === activeCityId);
      if (activeCity) {
        return stations.filter(s => 
          s.citiesCovered.includes(activeCityId) || s.isNewPlacement
        );
      }
    }
    
    // Show only new placements
    return stations.filter(s => s.isNewPlacement);
  }, [stations, showAllCoverage, activeCityId, cities]);

  const handleFitToCities = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const currentCity = selectedCity !== null ? cities.find(c => c.id === selectedCity) : null;
  const currentStation = selectedStation !== null ? stations.find(s => s.id === selectedStation) : null;

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-slate-900/40 rounded-lg overflow-hidden">
      {/* City Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="cityGrid" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1" fill="currentColor" className="text-white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cityGrid)" />
        </svg>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full relative z-10"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Coverage circles - filtered */}
        {visibleCoverage.map((station) => {
          const radius = (station.coverageRadius * scale);
          const isNew = station.isNewPlacement;
          return (
            <circle
              key={`coverage-${station.id}`}
              cx={transformX(station.x)}
              cy={transformY(station.y)}
              r={radius}
              fill={isNew ? "rgba(255, 138, 101, 0.08)" : "rgba(102, 187, 106, 0.05)"}
              stroke={isNew ? "rgba(255, 138, 101, 0.4)" : "rgba(102, 187, 106, 0.2)"}
              strokeWidth={isNew ? "3" : "1.5"}
              strokeDasharray={isNew ? "8,4" : "5,5"}
              className="pointer-events-none"
            />
          );
        })}

        {/* Station markers */}
        {stations.map((station) => {
          const isExisting = station.isExisting ?? false;
          const isNew = station.isNewPlacement ?? false;
          
          return (
            <g key={`station-${station.id}`}>
              {isNew && (
                <motion.circle
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  cx={transformX(station.x)}
                  cy={transformY(station.y)}
                  r={12}
                  fill="rgba(255, 138, 101, 0.2)"
                  className="pointer-events-none"
                />
              )}
              <circle
                cx={transformX(station.x)}
                cy={transformY(station.y)}
                r={isNew ? 10 : 8}
                fill={isExisting ? "#4DA0E1" : "#FF8A65"}
                stroke="#fff"
                strokeWidth={isNew ? "3" : "2"}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedStation(station.id);
                  onStationClick?.(station.id);
                }}
              />
              {isNew && (
                <text
                  x={transformX(station.x)}
                  y={transformY(station.y) - 18}
                  textAnchor="middle"
                  className="text-sm font-bold fill-accent-orange pointer-events-none"
                >
                  ⚡
                </text>
              )}
              {!isExisting && (
                <text
                  x={transformX(station.x)}
                  y={transformY(station.y) + (isNew ? 20 : 15)}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-accent-orange pointer-events-none"
                >
                  +{station.addedPower}
                </text>
              )}
            </g>
          );
        })}

        {/* City markers */}
        {cities.map((city) => {
          const isActive = activeCityId === city.id;
          const isSelected = selectedCity === city.id;
          const isHovered = hoveredCity === city.id;
          const color = getCityColor(city);
          const size = getCitySize(city);
          const deficit = getDeficit(city);
          const opacity = isActive ? 1 : (isSelected || isHovered ? 0.9 : 0.65);
          
          return (
            <g key={`city-${city.id}`}>
              {/* Active city glow ring */}
              {isActive && (
                <motion.circle
                  cx={transformX(city.x)}
                  cy={transformY(city.y)}
                  r={size + 8}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  opacity={0.6}
                  animate={{
                    r: [size + 8, size + 12, size + 8],
                    opacity: [0.6, 0.3, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="pointer-events-none"
                />
              )}
              
              {/* City marker */}
              <circle
                cx={transformX(city.x)}
                cy={transformY(city.y)}
                r={size}
                fill={color}
                stroke="#fff"
                strokeWidth={isActive ? "3" : "2"}
                opacity={opacity}
                className="cursor-pointer transition-all"
                onClick={() => {
                  setSelectedCity(city.id);
                  onCityClick?.(city.id);
                }}
                onMouseEnter={() => setHoveredCity(city.id)}
                onMouseLeave={() => setHoveredCity(null)}
              />
              
              {/* Active city label */}
              {isActive && (
                <text
                  x={transformX(city.x)}
                  y={transformY(city.y) - size - 12}
                  textAnchor="middle"
                  className="text-sm font-bold fill-white pointer-events-none"
                  style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
                >
                  City {city.id}
                </text>
              )}
              
              {/* Deficit label */}
              {showDeficitLabels && deficit !== null && (
                <text
                  x={transformX(city.x)}
                  y={transformY(city.y) + size + 12}
                  textAnchor="middle"
                  className={`text-xs font-semibold pointer-events-none ${
                    deficit >= 0 ? 'fill-accent-green' : 'fill-accent-red'
                  }`}
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                >
                  {deficit >= 0 ? '+' : ''}{deficit}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Power Summary Panel */}
      {powerStats && (
        <div className="absolute top-4 right-4 glass-card p-4 rounded-lg border border-dark-border/50 max-w-xs">
          <h4 className="text-sm font-semibold text-neon-blue mb-3">Power Summary</h4>
          
          <div className="space-y-2 text-xs mb-3">
            <div className="flex justify-between">
              <span className="text-text-secondary">Min:</span>
              <span className="font-mono font-semibold text-accent-red">
                City {powerStats.minCity?.id} → {powerStats.minPower}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Max:</span>
              <span className="font-mono font-semibold text-accent-green">
                City {powerStats.maxCity?.id} → {powerStats.maxPower}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Avg:</span>
              <span className="font-mono font-semibold">{powerStats.avgPower.toFixed(1)}</span>
            </div>
            {targetPower !== undefined && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Below target:</span>
                <span className="font-mono font-semibold">
                  {powerStats.citiesBelowTarget}/{cities.length}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-dark-border/50 pt-2 mt-2">
            <div className="text-xs text-text-secondary mb-1">Bottom 3:</div>
            <div className="space-y-1">
              {powerStats.bottom3.map((city, idx) => (
                <div key={city.id} className="flex justify-between text-xs">
                  <span className="text-text-secondary">{idx + 1}. City {city.id}</span>
                  <span className="font-mono text-accent-red">{city.power}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-dark-border/50 pt-2 mt-2">
            <div className="text-xs text-text-secondary mb-1">Top 3:</div>
            <div className="space-y-1">
              {powerStats.top3.map((city, idx) => (
                <div key={city.id} className="flex justify-between text-xs">
                  <span className="text-text-secondary">{idx + 1}. City {city.id}</span>
                  <span className="font-mono text-accent-green">{city.power}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tooltip */}
      <AnimatePresence>
        {(currentCity || hoveredCity !== null) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 glass-card p-4 rounded-lg border border-dark-border/50 z-20 max-w-xs"
          >
            {(() => {
              const city = cities.find(c => c.id === (currentCity?.id ?? hoveredCity));
              if (!city) return null;
              const deficit = getDeficit(city);
              const rank = powerStats 
                ? cities.sort((a, b) => a.power - b.power).findIndex(c => c.id === city.id) + 1
                : null;
              
              return (
                <>
                  <h5 className="text-sm font-bold text-accent-blue mb-2">City {city.id}</h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Base Power:</span>
                      <span className="font-mono font-semibold">{city.basePower}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Current Power:</span>
                      <span className="font-mono font-semibold text-accent-green">{city.power}</span>
                    </div>
                    {targetPower !== undefined && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Target:</span>
                          <span className="font-mono font-semibold">{targetPower}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Deficit:</span>
                          <span className={`font-mono font-semibold ${
                            (deficit ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'
                          }`}>
                            {deficit !== null && deficit >= 0 ? '+' : ''}{deficit}
                          </span>
                        </div>
                      </>
                    )}
                    {rank && (
                      <div className="flex justify-between pt-1 border-t border-dark-border/30">
                        <span className="text-text-secondary">Rank:</span>
                        <span className="font-mono font-semibold">
                          {rank}{rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} lowest
                        </span>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
        <button
          onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
          className="glass-card px-3 py-2 rounded-lg border border-dark-border hover:border-accent-blue transition-colors text-sm"
        >
          +
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
          className="glass-card px-3 py-2 rounded-lg border border-dark-border hover:border-accent-blue transition-colors text-sm"
        >
          −
        </button>
        <button
          onClick={handleFitToCities}
          className="glass-card px-3 py-2 rounded-lg border border-dark-border hover:border-accent-blue transition-colors text-xs"
          title="Fit to all cities"
        >
          Fit
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass-card p-3 rounded-lg border border-dark-border/50 z-20">
        <div className="text-xs font-semibold text-text-primary mb-2">Legend</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-green border border-white"></div>
            <span className="text-text-secondary">Meets target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-red border border-white"></div>
            <span className="text-text-secondary">Below target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-blue border border-white"></div>
            <span className="text-text-secondary">Existing station</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-orange border border-white"></div>
            <span className="text-text-secondary">Added station</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-accent-green/30 bg-accent-green/10"></div>
            <span className="text-text-secondary">Coverage radius</span>
          </div>
        </div>
      </div>
    </div>
  );
}
