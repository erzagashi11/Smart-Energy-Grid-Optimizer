'use client';

import { FeasibilityStep } from '@/lib/types';
import { motion } from 'framer-motion';
import { cityDisplayName } from '@/lib/excel/excelMode';

interface StepCardProps {
  step: FeasibilityStep | undefined;
  stepIndex: number;
  totalSteps: number;
  targetPower: number;
  /** Excel: show city names instead of numeric indices */
  cityNames?: string[];
}

export default function StepCard({ step, stepIndex, totalSteps, targetPower, cityNames }: StepCardProps) {
  if (!step) return null;

  const nameAt = (idx: number) => cityDisplayName(cityNames, idx);

  const deficit = step.powerBefore < targetPower ? targetPower - step.powerBefore : 0;
  const needsPlacement = step.add > 0;
  const isFeasible = step.feasibleSoFar;
  const actuallyPlaced = isFeasible && needsPlacement ? step.add : 0;
  const kBefore = step.kRemainingAfter + (isFeasible && needsPlacement ? step.add : 0);
  const isPlantStep = step.plantPlacedAt !== undefined && step.plantNameAt !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-4 glass-card p-4 rounded-lg border ${
        !isFeasible && needsPlacement
          ? 'border-accent-red/50 bg-accent-red/5'
          : 'border-accent-blue/30 bg-accent-blue/5'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-accent-blue/20 rounded-lg border border-accent-blue/50">
            <span className="text-sm font-bold text-accent-blue">
              Step {stepIndex + 1} / {totalSteps}
            </span>
          </div>
          <h4 className="text-lg font-semibold text-text-primary">
            {isPlantStep
              ? `Weakest city ${nameAt(step.i)} (plant upgrade)`
              : `Checking ${nameAt(step.i)}`}
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="p-2 bg-dark-card/50 rounded border border-dark-border/30">
          <div className="text-xs text-text-secondary mb-1">Current Power</div>
          <div className="text-lg font-mono font-bold text-accent-green">{Math.floor(step.powerBefore)}</div>
          <div className={`text-xs mt-1 ${step.powerBefore < targetPower ? 'text-accent-red' : 'text-accent-green'}`}>
            {step.powerBefore < targetPower ? 'Below target' : 'Meets target'}
          </div>
        </div>

        {needsPlacement ? (
          <>
            <div className="p-2 bg-dark-card/50 rounded border border-dark-border/30">
              <div className="text-xs text-text-secondary mb-1">Deficit (Needed)</div>
              <div className="text-lg font-mono font-bold text-accent-orange">+{step.add}</div>
              <div className="text-xs text-text-secondary mt-1">Target: {targetPower}</div>
            </div>

            {isFeasible ? (
              <>
                <div className="p-2 bg-dark-card/50 rounded border border-dark-border/30">
                  <div className="text-xs text-text-secondary mb-1">Actually Added</div>
                  <div className="text-lg font-mono font-bold text-accent-green">+{actuallyPlaced}</div>
                  <div className="text-xs text-accent-green mt-1">
                    {isPlantStep
                      ? `✓ Placed at Plant: ${step.plantNameAt}`
                      : step.placedAt !== null
                        ? `✓ Placed at ${nameAt(step.placedAt)}`
                        : ''}
                  </div>
                </div>

                <div className="p-2 bg-dark-card/50 rounded border border-dark-border/30">
                  <div className="text-xs text-text-secondary mb-1">k Remaining</div>
                  <div className="text-lg font-mono font-bold text-text-primary">{step.kRemainingAfter}</div>
                  <div className="text-xs text-accent-green mt-1">✓ Feasible</div>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 bg-dark-card/50 rounded border border-accent-red/50 bg-accent-red/10">
                  <div className="text-xs text-text-secondary mb-1">Available</div>
                  <div className="text-lg font-mono font-bold text-accent-red">{kBefore}</div>
                  <div className="text-xs text-accent-red mt-1">❌ Insufficient</div>
                </div>

                <div className="p-2 bg-dark-card/50 rounded border border-accent-red/50 bg-accent-red/10">
                  <div className="text-xs text-text-secondary mb-1">Result</div>
                  <div className="text-lg font-mono font-bold text-accent-red">0</div>
                  <div className="text-xs text-accent-red mt-1">❌ No placement</div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="p-2 bg-dark-card/50 rounded border border-dark-border/30 col-span-3">
            <div className="text-xs text-text-secondary mb-1">Status</div>
            <div className="text-sm font-semibold text-accent-green">✓ No placement needed</div>
            <div className="text-xs text-text-secondary mt-1">Power already meets target</div>
          </div>
        )}
      </div>

      {needsPlacement && !isFeasible && (
        <div className="mt-3 pt-3 border-t border-dark-border/30">
          <div className="p-3 bg-accent-red/10 rounded border border-accent-red/30">
            <div className="text-xs font-semibold text-accent-red mb-1">❌ Infeasible</div>
            <div className="text-xs text-text-secondary">
              Needed: <span className="font-mono font-semibold">+{step.add}</span> but only{' '}
              <span className="font-mono font-semibold">{kBefore}</span> available. No station placed.
            </div>
          </div>
        </div>
      )}

      {needsPlacement && isFeasible && (
        <div className="mt-3 pt-3 border-t border-dark-border/30">
          <div className="text-xs text-text-secondary">
            {isPlantStep ? (
              <>
                <span className="font-semibold text-accent-blue">Strategy:</span> Add +{step.add} MW capacity at plant{' '}
                <span className="font-semibold text-text-primary">{step.plantNameAt}</span> to raise power at weakest city{' '}
                {nameAt(step.i)}.
              </>
            ) : (
              step.placedAt !== null && (
                <>
                  <span className="font-semibold text-accent-blue">Strategy:</span> Placing station at {nameAt(step.placedAt!)}{' '}
                  (rightmost position) to maximize coverage for future cities while fixing {nameAt(step.i)}.
                </>
              )
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
