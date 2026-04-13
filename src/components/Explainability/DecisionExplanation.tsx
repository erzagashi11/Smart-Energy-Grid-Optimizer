'use client';

import { FeasibilityStep } from '@/lib/types';
import { motion } from 'framer-motion';

interface DecisionExplanationProps {
  step: FeasibilityStep | undefined;
  r: number;
  n: number;
}

export default function DecisionExplanation({ step, r, n }: DecisionExplanationProps) {
  if (!step || step.add === 0) {
    return null;
  }

  if (step.placedAt === null || step.plantPlacedAt !== undefined) {
    return null;
  }

  // Calculate alternative valid placements
  // Valid placements are those that still cover city i: abs(pos - i) ≤ r
  const currentPlacement = step.placedAt;
  const i = step.i;
  const alternatives = [];
  
  // Calculate valid placement range: positions that still cover city i
  const validStart = Math.max(0, i - r);
  const validEnd = Math.min(n - 1, i + r);
  
  // Show all valid alternatives (excluding current placement)
  for (let alt = validStart; alt <= validEnd; alt++) {
    if (alt !== currentPlacement) {
      const start = Math.max(0, alt - r);
      const end = Math.min(n, alt + r + 1);
      const coverage = end - start;
      alternatives.push({ index: alt, coverage });
    }
  }

  // Calculate which cities benefit most
  const citiesBenefited: number[] = [];
  if (step.placedAt !== null && step.effectEnd !== null) {
    const start = Math.max(0, step.placedAt - r);
    const end = step.effectEnd;
    for (let i = start; i < end; i++) {
      citiesBenefited.push(i);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 bg-accent-blue/10 border border-accent-blue/50 rounded-lg"
    >
      <h4 className="font-semibold text-accent-blue mb-3 flex items-center gap-2">
        <span>💡</span> Decision Explanation
      </h4>
      
      <div className="space-y-3 text-sm">
        <div>
          <div className="text-text-secondary mb-1">Placement formula:</div>
          <div className="text-text-primary font-mono bg-dark-card/50 px-3 py-2 rounded border border-accent-blue/30 mb-3">
            Placement position = min(n-1, i + r) = min({n-1}, {step.i} + {r}) = {currentPlacement}
          </div>
        </div>
        
        <div>
          <div className="text-text-secondary mb-1">Why this location was chosen:</div>
          <div className="text-text-primary">
            Among all valid positions that still cover City {i} (indices {validStart}–{validEnd}), 
            the rightmost position (index <span className="font-mono text-accent-blue">{currentPlacement}</span>) 
            maximizes future coverage. This greedy strategy ensures we can cover as many future cities as possible 
            with the remaining budget.
          </div>
        </div>

        {alternatives.length > 0 && (
          <div>
            <div className="text-text-secondary mb-1">Alternative valid placements (that still cover City {i}):</div>
            <div className="flex flex-wrap gap-2">
              {alternatives.map((alt) => (
                <div
                  key={alt.index}
                  className="px-2 py-1 bg-dark-card/50 rounded border border-dark-border text-xs"
                >
                  Index {alt.index}: {alt.coverage} cities
                </div>
              ))}
            </div>
            <div className="text-text-secondary mt-1 text-xs">
              Current placement at {currentPlacement} is the rightmost valid position, maximizing future coverage.
            </div>
          </div>
        )}

        {citiesBenefited.length > 0 && (
          <div>
            <div className="text-text-secondary mb-1">Cities that benefit most:</div>
            <div className="flex flex-wrap gap-1">
              {citiesBenefited.slice(0, 10).map((city) => (
                <span
                  key={city}
                  className="px-2 py-0.5 bg-accent-green/20 rounded text-xs font-mono"
                >
                  {city}
                </span>
              ))}
              {citiesBenefited.length > 10 && (
                <span className="px-2 py-0.5 text-text-secondary text-xs">
                  +{citiesBenefited.length - 10} more
                </span>
              )}
            </div>
            <div className="text-text-secondary mt-1 text-xs">
              Total cities improved: {citiesBenefited.length} (power increased by +{step.add})
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
