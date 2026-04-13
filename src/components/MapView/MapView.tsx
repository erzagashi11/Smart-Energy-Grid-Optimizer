'use client';

import { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';

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
}

interface MapViewProps {
  cities: City[];
  stations: Station[];
  targetPower?: number;
  r: number;
  onCityClick?: (cityId: number) => void;
  onStationClick?: (stationId: number) => void;
}

export default function MapView({
  cities,
  stations,
  targetPower,
  r,
  onCityClick,
  onStationClick,
}: MapViewProps) {
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
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
    const padding = 20;
    
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

  const getCityColor = (city: City) => {
    if (targetPower !== undefined) {
      return city.power >= targetPower ? '#66BB6A' : '#F44336';
    }
    return '#4DA0E1';
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-dark-card/50 to-dark-card/30 rounded-lg overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Coverage circles for stations */}
        {stations.map((station) => {
          const radius = (station.coverageRadius * scale);
          return (
            <circle
              key={`coverage-${station.id}`}
              cx={transformX(station.x)}
              cy={transformY(station.y)}
              r={radius}
              fill="rgba(102, 187, 106, 0.1)"
              stroke="rgba(102, 187, 106, 0.3)"
              strokeWidth="2"
              strokeDasharray="5,5"
              className="pointer-events-none"
            />
          );
        })}

        {/* Station markers */}
        {stations.map((station) => {
          const isExisting = station.isExisting ?? false;
          return (
            <g key={`station-${station.id}`}>
              <circle
                cx={transformX(station.x)}
                cy={transformY(station.y)}
                r={8}
                fill={isExisting ? "#4DA0E1" : "#FF8A65"}
                stroke="#fff"
                strokeWidth="2"
                className="cursor-pointer"
                onClick={() => {
                  setSelectedStation(station.id);
                  onStationClick?.(station.id);
                }}
              />
              {!isExisting && (
                <text
                  x={transformX(station.x)}
                  y={transformY(station.y) - 15}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-accent-orange pointer-events-none"
                >
                  +{station.addedPower}
                </text>
              )}
            {selectedStation === station.id && (
              <g>
                <rect
                  x={transformX(station.x) - 60}
                  y={transformY(station.y) - 50}
                  width="120"
                  height="40"
                  fill="rgba(0, 0, 0, 0.8)"
                  rx="4"
                  className="pointer-events-none"
                />
                <text
                  x={transformX(station.x)}
                  y={transformY(station.y) - 35}
                  textAnchor="middle"
                  className="text-xs fill-white pointer-events-none"
                >
                  Station {station.id}
                </text>
                <text
                  x={transformX(station.x)}
                  y={transformY(station.y) - 20}
                  textAnchor="middle"
                  className="text-xs fill-accent-green pointer-events-none"
                >
                  Covers {station.citiesCovered.length} cities
                </text>
              </g>
            )}
            </g>
          );
        })}

        {/* City markers */}
        {cities.map((city) => {
          const color = getCityColor(city);
          const meetsTarget = targetPower !== undefined ? city.power >= targetPower : true;
          
          return (
            <g key={`city-${city.id}`}>
              <circle
                cx={transformX(city.x)}
                cy={transformY(city.y)}
                r={meetsTarget ? 6 : 5}
                fill={color}
                stroke="#fff"
                strokeWidth="2"
                className="cursor-pointer transition-all hover:r-8"
                onClick={() => {
                  setSelectedCity(city.id);
                  onCityClick?.(city.id);
                }}
              />
              {selectedCity === city.id && (
                <g>
                  <rect
                    x={transformX(city.x) - 70}
                    y={transformY(city.y) - 60}
                    width="140"
                    height="50"
                    fill="rgba(0, 0, 0, 0.9)"
                    rx="4"
                    className="pointer-events-none"
                  />
                  <text
                    x={transformX(city.x)}
                    y={transformY(city.y) - 45}
                    textAnchor="middle"
                    className="text-xs fill-white font-semibold pointer-events-none"
                  >
                    City {city.id}
                  </text>
                  <text
                    x={transformX(city.x)}
                    y={transformY(city.y) - 30}
                    textAnchor="middle"
                    className="text-xs fill-text-secondary pointer-events-none"
                  >
                    Power: {city.power}
                  </text>
                  {targetPower !== undefined && (
                    <text
                      x={transformX(city.x)}
                      y={transformY(city.y) - 15}
                      textAnchor="middle"
                      className={`text-xs pointer-events-none ${
                        meetsTarget ? 'fill-accent-green' : 'fill-accent-red'
                      }`}
                    >
                      Target: {targetPower} {meetsTarget ? '✓' : '✗'}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
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
      <div className="absolute bottom-4 left-4 glass-card p-3 rounded-lg border border-dark-border/50">
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
