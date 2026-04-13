'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface City {
  id: number;
  power: number;
  basePower: number;
  targetPower?: number;
}

interface MapSidebarProps {
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
  mode?: 'static' | 'step';
  onCityClick?: (cityId: number) => void;
}

export default function MapSidebar({
  selectedCity,
  hoveredCity,
  powerStats,
  targetPower,
  totalCities,
  mode = 'static',
  onCityClick,
}: MapSidebarProps) {
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
    <div className="flex flex-col gap-4">
      {/* City Info Tooltip */}
      <AnimatePresence>
        {displayCity && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass-card p-3 rounded-lg border border-dark-border/50 shadow-lg"
          >
            {(() => {
              const city = displayCity;
              const deficitStatus = getDeficitStatus(city);
              const rank = powerStats 
                ? powerStats.bottom3.concat(powerStats.top3).sort((a, b) => a.power - b.power).findIndex(c => c.id === city.id) + 1
                : null;
              
              return (
                <>
                  <h5 className="text-xs font-bold text-accent-blue mb-1.5">City {city.id}</h5>
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Power Summary */}
      {powerStats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-3 rounded-lg border border-dark-border/50 shadow-lg"
        >
          <h4 className="text-xs font-semibold text-neon-blue mb-2">Power Summary</h4>
          
          <div className="space-y-1.5 text-xs mb-2">
            <button
              onClick={() => onCityClick?.(powerStats.minCity?.id ?? -1)}
              className="w-full flex justify-between p-1.5 bg-dark-card/50 rounded hover:bg-dark-card/70 transition-colors cursor-pointer text-xs"
            >
              <span className="text-text-secondary">Min:</span>
              <span className="font-mono font-semibold text-accent-red text-xs">
                City {powerStats.minCity?.id} → {powerStats.minPower}
              </span>
            </button>
            <button
              onClick={() => onCityClick?.(powerStats.maxCity?.id ?? -1)}
              className="w-full flex justify-between p-1.5 bg-dark-card/50 rounded hover:bg-dark-card/70 transition-colors cursor-pointer text-xs"
            >
              <span className="text-text-secondary">Max:</span>
              <span className="font-mono font-semibold text-accent-green text-xs">
                City {powerStats.maxCity?.id} → {powerStats.maxPower}
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
                  <span className="text-text-secondary">{idx + 1}. City {city.id}</span>
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
                  <span className="text-text-secondary">{idx + 1}. City {city.id}</span>
                  <span className="font-mono text-accent-green text-[10px]">{city.power}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="glass-card p-2.5 rounded-lg border border-dark-border/50 shadow-lg">
        <div className="text-[11px] font-semibold text-text-primary mb-1.5">Legend</div>
        <div className="space-y-1 text-[10px]">
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
          {mode === 'step' && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-dashed border-white"></div>
              <span className="text-text-secondary">Active coverage</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
