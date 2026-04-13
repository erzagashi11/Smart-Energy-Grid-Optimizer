'use client';

import { PlanningResult } from '@/lib/types';

interface PlanningResultsProps {
  result: PlanningResult | null;
  targetMin: number;
  stations: number[];
}

export default function PlanningResults({
  result,
  targetMin,
  stations,
}: PlanningResultsProps) {
  if (!result) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-neon-purple">
          Planning Result
        </h3>
        <p className="text-text-secondary text-sm">
          Enter a target minimum power and click Generate Plan to see the required stations and recommended placements.
        </p>
      </div>
    );
  }

  const currentMin = Math.min(...stations);
  const citiesBelowTarget = stations.filter((p, i) => (result.finalDistribution?.[i] ?? p) < targetMin).length;

  return (
    <div className="space-y-4">
      {/* Target Achievable */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Target Achievable</h3>
        </div>
        <p className="text-sm text-text-secondary">
          Minimum power {targetMin} can be reached with {result.kMin} additional stations.
        </p>
      </div>

      {/* Recommended Plan */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold mb-3 text-neon-purple">Recommended Plan</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Target Minimum:</span>
            <span className="font-mono font-semibold text-white">{targetMin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Stations Required:</span>
            <span className="font-mono font-semibold text-neon-purple">{result.kMin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Achievable Minimum:</span>
            <span className="font-mono font-semibold text-white">{result.minimumAchieved}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Coverage:</span>
            <span className="font-mono font-semibold text-white">{result.percentageMeetingTarget.toFixed(1)}% of cities</span>
          </div>
        </div>
      </div>

      {/* Critical Cities */}
      {citiesBelowTarget > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-lg font-semibold mb-3 text-orange-400">Critical Cities</h3>
          <div className="space-y-2 text-xs">
            {stations.map((power, i) => {
              const finalPower = result.finalDistribution?.[i] ?? power;
              if (finalPower >= targetMin) return null;
              const need = targetMin - finalPower;
              return (
                <div key={i} className="flex justify-between font-mono">
                  <span className="text-text-secondary">City {i}</span>
                  <span className="text-red-400">{power} → {targetMin} (need +{need})</span>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* Placement Plan */}
      {result.placementPlan.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-lg font-semibold mb-3 text-neon-blue">Placement Plan</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-dark-border text-text-secondary">
                <tr>
                  <th className="py-2 text-left">#</th>
                  <th className="py-2 text-left">Placement Index</th>
                  <th className="py-2 text-left">Added Power</th>
                  <th className="py-2 text-left">Coverage Interval</th>
                  <th className="py-2 text-left">Cities Improved</th>
                </tr>
              </thead>
              <tbody>
                {result.placementPlan.map((p, idx) => (
                  <tr key={p.index} className="border-b border-dark-border/40">
                    <td className="py-2 font-mono">{idx + 1}</td>
                    <td className="py-2 font-mono">{p.placementIndex}</td>
                    <td className="py-2 font-mono text-green-400">+{p.addedPower}</td>
                    <td className="py-2 font-mono">[{p.coverageInterval[0]}–{p.coverageInterval[1]}]</td>
                    <td className="py-2 font-mono">{p.citiesImproved?.length || (p.coverageInterval[1] - p.coverageInterval[0] + 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Planning Summary */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold mb-2 text-text-primary">Planning Summary</h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          To reach the target minimum power of {targetMin}, the system prioritizes the weakest cities first and places new stations at positions that maximize shared coverage. The recommended plan focuses on high-impact placements that reduce multiple deficits with the fewest number of added stations.
        </p>
      </div>

      {/* Before vs Planned */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold mb-3 text-text-primary">Before vs Planned</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Current minimum:</span>
            <span className="font-mono">{currentMin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Planned minimum:</span>
            <span className="font-mono text-neon-purple">{result.minimumAchieved}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Improvement:</span>
            <span className="font-mono text-green-400">+{result.minimumAchieved - currentMin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Stations added:</span>
            <span className="font-mono">{result.kMin}</span>
          </div>
        </div>
      </div>

      {/* City Power Changes - Before vs After */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold mb-3 text-text-primary">Power Changes by City</h3>
        <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
          {stations.map((before, i) => {
            const after = result.finalDistribution?.[i] ?? before;
            const change = after - before;
            const isImproved = change > 0;
            return (
              <div key={i} className="flex justify-between font-mono py-1 border-b border-dark-border/30">
                <span className="text-text-secondary">City {i}</span>
                <span>
                  <span className="text-white">{before}</span>
                  <span className="text-text-secondary mx-1">→</span>
                  <span className={isImproved ? 'text-green-400' : 'text-white'}>{after}</span>
                  {isImproved && (
                    <span className="text-green-400 ml-1">(+{change})</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
