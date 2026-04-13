'use client';

import { useMemo, useState } from 'react';
import { SolveInput, PlanningResult } from '@/lib/types';
import { buildBasePowerDiff, diffToPower } from '@/lib/solver/powerUtils';
import { convertPlanningToMapData } from '@/lib/mapUtils';
import SkylineChartCanvas from '../Visualization/SkylineChartCanvas';
import TargetLine from '../Visualization/TargetLine';
import CleanMapView from '../MapView/CleanMapView';
import ViewToggle, { type ViewType } from '../MapView/ViewToggle';


interface PlanningVisualizationProps {
  input: SolveInput;
  result: PlanningResult | null;
  targetMin: number;
  excelMode?: boolean;
}

export default function PlanningVisualization({
  input,
  result,
  targetMin,
  excelMode = false,
}: PlanningVisualizationProps) {
  const [viewMode, setViewMode] = useState<ViewType>('chart');
  const [showPlacements, setShowPlacements] = useState(false);

  const basePower = useMemo(() => {
    if (excelMode) return [...input.stations];
    const diff = buildBasePowerDiff(input.stations, input.r);
    return diffToPower(diff);
  }, [input.stations, input.r, excelMode]);

  const powerData = result?.finalDistribution || basePower;
  const maxPower = Math.max(...powerData, ...basePower, targetMin, 1);

  const mapData = useMemo(() => {
    if (viewMode === 'map') {
      return convertPlanningToMapData(input, result, targetMin, excelMode);
    }
    return null;
  }, [viewMode, input, result, targetMin, excelMode]);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Planning Analysis</h2>
          <p className="text-xs text-text-secondary">
            Target: {targetMin} | Feasible
          </p>
        </div>
        <ViewToggle currentView={viewMode} onViewChange={setViewMode} showFlowTab={false} />
      </div>
      
      {viewMode === 'chart' ? (
        <div className="relative min-h-[450px] bg-dark-card/30 rounded-lg p-2">
          <SkylineChartCanvas
            powerData={powerData}
            basePower={basePower}
            n={input.stations.length}
            heatmapMode={false}
            targetPower={targetMin}
          />

          {/* Placements Overlay */}
          {showPlacements && result && result.placementPlan.length > 0 && (
            <div className="absolute top-4 left-4 right-4 bg-dark-card/90 border border-neon-purple/50 rounded-lg p-4 z-20">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-neon-purple">
                  Placements ({result.placementPlan.length} stations added)
                </div>
                <button 
                  onClick={() => setShowPlacements(false)}
                  className="text-xs text-text-secondary hover:text-white"
                >
                  ✕ Hide
                </button>
              </div>
              <div className="text-xs text-text-secondary mb-2">
                {(() => {
                  // Group by city and sum the added power
                  const cityMap = new Map<number, number>();
                  result.placementPlan.forEach(p => {
                    const current = cityMap.get(p.placementIndex) || 0;
                    cityMap.set(p.placementIndex, current + p.addedPower);
                  });
                  const uniqueCities = Array.from(cityMap.entries());
                  return `Placements: ${uniqueCities.map(([city, power]) => `City ${city} (+${power})`).join(', ')}`;
                })()}
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {(() => {
                  // Group by city and sum the added power
                  const cityMap = new Map<number, number>();
                  result.placementPlan.forEach(p => {
                    const current = cityMap.get(p.placementIndex) || 0;
                    cityMap.set(p.placementIndex, current + p.addedPower);
                  });
                  return Array.from(cityMap.entries()).map(([city, power], idx) => (
                    <div key={idx} className="bg-dark-card/50 p-2 rounded text-center">
                      <div className="text-neon-purple font-semibold">City {city}</div>
                      <div className="text-green-400">+{power} power</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {result && result.placementPlan.length > 0 && !showPlacements && (
            <div className="absolute top-4 right-4 bg-accent-green/20 border border-accent-green/50 rounded-lg px-4 py-2 z-20">
              <div className="text-sm font-semibold text-accent-green">
                ✓ Final Solution
              </div>
              <div className="text-xs text-text-secondary mt-1">
                Placements: {(() => {
                  const cityMap = new Map<number, number>();
                  result.placementPlan.forEach(p => {
                    const current = cityMap.get(p.placementIndex) || 0;
                    cityMap.set(p.placementIndex, current + p.addedPower);
                  });
                  return Array.from(cityMap.entries()).map(([city, power]) => `City ${city} (+${power})`).join(', ');
                })()}
              </div>
            </div>
          )}
        </div>
      ) : mapData ? (
        <div className="relative min-h-[450px]">
          <CleanMapView
            cities={mapData.cities}
            stations={mapData.stations}
            targetPower={targetMin}
            r={input.r}
            mode="static"
          />
          
          {/* Placements Overlay for Map */}
          {showPlacements && result && result.placementPlan.length > 0 && (
            <div className="absolute top-4 left-4 right-4 bg-dark-card/90 border border-neon-purple/50 rounded-lg p-4 z-20">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-neon-purple">
                  Placements ({result.placementPlan.length} stations added)
                </div>
                <button 
                  onClick={() => setShowPlacements(false)}
                  className="text-xs text-text-secondary hover:text-white"
                >
                  ✕ Hide
                </button>
              </div>
              <div className="text-xs text-text-secondary mb-2">
                {(() => {
                  // Group by city and sum the added power
                  const cityMap = new Map<number, number>();
                  result.placementPlan.forEach(p => {
                    const current = cityMap.get(p.placementIndex) || 0;
                    cityMap.set(p.placementIndex, current + p.addedPower);
                  });
                  const uniqueCities = Array.from(cityMap.entries());
                  return `Placements: ${uniqueCities.map(([city, power]) => `City ${city} (+${power})`).join(', ')}`;
                })()}
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {(() => {
                  // Group by city and sum the added power
                  const cityMap = new Map<number, number>();
                  result.placementPlan.forEach(p => {
                    const current = cityMap.get(p.placementIndex) || 0;
                    cityMap.set(p.placementIndex, current + p.addedPower);
                  });
                  return Array.from(cityMap.entries()).map(([city, power], idx) => (
                    <div key={idx} className="bg-dark-card/50 p-2 rounded text-center">
                      <div className="text-neon-purple font-semibold">City {city}</div>
                      <div className="text-green-400">+{power} power</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {result && result.placementPlan.length > 0 && !showPlacements && (
            <div className="absolute top-4 right-4 bg-accent-green/20 border border-accent-green/50 rounded-lg px-4 py-2 z-20">
              <div className="text-sm font-semibold text-accent-green">
                ✓ Final Solution
              </div>
              <div className="text-xs text-text-secondary mt-1">
                Placements: {(() => {
                  const cityMap = new Map<number, number>();
                  result.placementPlan.forEach(p => {
                    const current = cityMap.get(p.placementIndex) || 0;
                    cityMap.set(p.placementIndex, current + p.addedPower);
                  });
                  return Array.from(cityMap.entries()).map(([city, power]) => `City ${city} (+${power})`).join(', ');
                })()}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-accent-blue/50 border border-accent-blue"></div>
            <span className="text-text-secondary">Initial Power</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-accent-green/50 border border-accent-green"></div>
            <span className="text-text-secondary">Planned Power</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-accent-orange border-dashed border-t border-accent-orange"></div>
            <span className="text-text-secondary">Target Line</span>
          </div>
        </div>
        
        {result && result.placementPlan.length > 0 && (
          <button
            onClick={() => setShowPlacements(!showPlacements)}
            className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/50 rounded-lg text-sm font-semibold text-neon-purple transition-colors"
          >
            {showPlacements ? 'Hide Placements' : 'Show Placements'}
          </button>
        )}
      </div>

      {/* Cities Below Target - Show cities that were below target BEFORE the plan */}
      {result && (
        <div className="mt-6 glass-card p-4 border border-red-500/30">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-sm font-semibold text-red-400">
              Cities Below Target ({basePower.filter((p) => p < targetMin).length})
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {basePower.map((power, i) => {
              // Show cities that were below target BEFORE the plan
              if (power >= targetMin) return null;
              const finalPower = result.finalDistribution?.[i] ?? power;
              const achieved = finalPower >= targetMin ? targetMin : finalPower;
              const need = targetMin - power;
              return (
                <div key={i} className="text-text-secondary">
                  City {i}: <span className="text-white">{power}</span> → <span className="text-green-400">{achieved}</span> <span className="text-red-400">(needed +{need})</span>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}
    </div>
  );
}
