'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface City {
  id: number;
  power: number;
  basePower: number;
  targetPower?: number;
  displayName?: string;
}

interface MapDrawerProps {
  selectedCity: City | null;
  hoveredCity: City | null;
  powerStats: {
    minPower: number;
    maxPower: number;
    avgPower: number;
    citiesBelowTarget: number;
    minCity: City | undefined;
    maxCity: City | undefined;
    bottom3: City[];
    top3: City[];
  } | null;
  targetPower?: number;
  totalCities: number;
  onCityClick?: (cityId: number) => void;
}

export default function MapDrawer({
  selectedCity,
  hoveredCity,
  powerStats,
  targetPower,
  totalCities,
  onCityClick,
}: MapDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayCity = selectedCity || hoveredCity;
  
  const getDeficitStatus = (city: City) => {
    if (targetPower === undefined) return null;
    const deficit = city.power - targetPower;
    return {
      value: deficit,
      meets: deficit >= 0,
    };
  };

  return (
    <>
      {/* Collapsible Drawer Toggle - Right side, below zoom controls */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-20 right-4 z-30 glass-card px-3 py-2 rounded-lg border border-dark-border hover:border-accent-blue transition-colors text-xs font-semibold shadow-md flex items-center gap-2"
      >
        <span>Insights</span>
        <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▸</span>
      </button>

      {/* Drawer Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-20 right-4 z-20 w-64 max-h-[calc(100%-120px)] overflow-y-auto"
          >
            <div className="glass-card p-3 rounded-lg border border-dark-border/50 shadow-lg space-y-4">
              {/* City Info */}
              {displayCity && (
                <div className="border-b border-dark-border/50 pb-3">
                  {(() => {
                    const city = displayCity;
                    const deficitStatus = getDeficitStatus(city);
                    const rank = powerStats 
                      ? [...powerStats.bottom3, ...powerStats.top3].sort((a, b) => a.power - b.power).findIndex(c => c.id === city.id) + 1
                      : null;
                    
                    return (
                      <>
                        <h5 className="text-xs font-bold text-accent-blue mb-1.5">
                          {city.displayName ?? `City ${city.id}`}
                        </h5>
                        <div className="space-y-1 text-[10px]">
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
                                  deficitStatus?.meets ? 'text-accent-green' : 'text-accent-red'
                                }`}>
                                  {deficitStatus?.meets ? `+${deficitStatus.value} (surplus)` : `${deficitStatus?.value}`}
                                </span>
                              </div>
                              {!deficitStatus?.meets && (
                                <div className="text-[9px] text-text-secondary mt-1 pt-1 border-t border-dark-border/30">
                                  Needs: +{targetPower - city.power} to meet target
                                </div>
                              )}
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
                </div>
              )}

              {/* Power Summary */}
              {powerStats && (
                <>
                  <div>
                    <h4 className="text-xs font-semibold text-neon-blue mb-2">Power Summary</h4>
                    
                    <div className="space-y-1.5 text-xs mb-2">
                      <button
                        onClick={() => onCityClick?.(powerStats.minCity?.id ?? -1)}
                        className="w-full flex justify-between p-1.5 bg-dark-card/50 rounded hover:bg-dark-card/70 transition-colors cursor-pointer text-xs"
                      >
                        <span className="text-text-secondary">Min:</span>
                        <span className="font-mono font-semibold text-accent-red text-xs">
                          {powerStats.minCity?.displayName ?? `City ${powerStats.minCity?.id}`} →{' '}
                          {powerStats.minPower}
                        </span>
                      </button>
                      <button
                        onClick={() => onCityClick?.(powerStats.maxCity?.id ?? -1)}
                        className="w-full flex justify-between p-1.5 bg-dark-card/50 rounded hover:bg-dark-card/70 transition-colors cursor-pointer text-xs"
                      >
                        <span className="text-text-secondary">Max:</span>
                        <span className="font-mono font-semibold text-accent-green text-xs">
                          {powerStats.maxCity?.displayName ?? `City ${powerStats.maxCity?.id}`} →{' '}
                          {powerStats.maxPower}
                        </span>
                      </button>
                      <div className="flex justify-between p-1.5 text-xs">
                        <span className="text-text-secondary">Avg:</span>
                        <span className="font-mono font-semibold">{powerStats.avgPower.toFixed(1)}</span>
                      </div>
                      {targetPower !== undefined && (
                        <div className="flex justify-between p-1.5 text-xs">
                          <span className="text-text-secondary">Below target:</span>
                          <span className="font-mono font-semibold">
                            {powerStats.citiesBelowTarget}/{totalCities}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-dark-border/50 pt-1.5 mt-1.5">
                      <div className="text-[10px] text-text-secondary mb-1 font-semibold">Bottom 3:</div>
                      <div className="space-y-0.5">
                        {powerStats.bottom3.map((city, idx) => (
                          <button
                            key={city.id}
                            onClick={() => onCityClick?.(city.id)}
                            className="w-full flex justify-between text-[10px] p-1 rounded hover:bg-dark-card/50 transition-colors cursor-pointer"
                          >
                            <span className="text-text-secondary">
                              {idx + 1}. {city.displayName ?? `City ${city.id}`}
                            </span>
                            <span className="font-mono text-accent-red text-[10px]">{city.power}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-dark-border/50 pt-1.5 mt-1.5">
                      <div className="text-[10px] text-text-secondary mb-1 font-semibold">Top 3:</div>
                      <div className="space-y-0.5">
                        {powerStats.top3.map((city, idx) => (
                          <button
                            key={city.id}
                            onClick={() => onCityClick?.(city.id)}
                            className="w-full flex justify-between text-[10px] p-1 rounded hover:bg-dark-card/50 transition-colors cursor-pointer"
                          >
                            <span className="text-text-secondary">
                              {idx + 1}. {city.displayName ?? `City ${city.id}`}
                            </span>
                            <span className="font-mono text-accent-green text-[10px]">{city.power}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
