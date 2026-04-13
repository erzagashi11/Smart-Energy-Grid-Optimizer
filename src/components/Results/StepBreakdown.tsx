'use client';

import { SolveOutput } from '@/lib/types';
import type { FeasibilityStep, TrialTrace } from '@/lib/solver/traceSolver';
import { cityDisplayName } from '@/lib/excel/excelMode';

/** Real mode detail rows: power after = recomputed city power */
function powerAfterForRow(step: FeasibilityStep): number {
  if (step.cityPowerGain !== undefined) {
    return Math.floor(step.powerBefore + step.cityPowerGain);
  }
  return Math.floor(step.powerBefore + step.add);
}

function effectLabelForRow(step: FeasibilityStep): string | number {
  if (step.add === 0 && (step.cityPowerGain === undefined || step.cityPowerGain === 0)) {
    return '—';
  }
  if (step.cityPowerGain !== undefined) {
    return Math.floor(step.cityPowerGain);
  }
  if (step.effectEnd !== null && step.effectEnd !== undefined) {
    return step.effectEnd;
  }
  return '—';
}

function renderTrialTable(trial: TrialTrace, cityNames?: string[]) {
  const rows = trial.detailSteps ?? trial.steps;
  const cityCell = (i: number) => (cityNames ? cityDisplayName(cityNames, i) : i);

  return (
    <table className="w-full text-sm font-mono">
      <thead>
        <tr className="bg-dark-card/80 border-b-2 border-dark-border">
          <th className="text-left p-3 text-text-primary font-semibold">#</th>
          <th className="text-left p-3 text-text-primary font-semibold">City</th>
          <th className="text-left p-3 text-text-primary font-semibold">Power Before</th>
          <th className="text-left p-3 text-text-primary font-semibold">Added</th>
          <th className="text-left p-3 text-text-primary font-semibold">Power After</th>
          <th className="text-left p-3 text-text-primary font-semibold">Placed At</th>
          <th className="text-left p-3 text-text-primary font-semibold">Effect End</th>
          <th className="text-left p-3 text-text-primary font-semibold">k Remaining</th>
          <th className="text-left p-3 text-text-primary font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((step, stepIndex) => {
          const hasSpend = step.add > 0;
          const highlight =
            hasSpend || (step.cityPowerGain !== undefined && step.cityPowerGain !== 0)
              ? 'bg-neon-orange/10 hover:bg-neon-orange/15'
              : 'hover:bg-dark-card/30';

          const placedRaw =
            hasSpend && step.plantNameAt
              ? step.plantNameAt
              : !hasSpend && step.placedAt !== null
                ? step.placedAt
                : '—';
          const placed =
            typeof placedRaw === 'number' && cityNames
              ? cityDisplayName(cityNames, placedRaw)
              : placedRaw;

          return (
            <tr
              key={stepIndex}
              className={`border-b border-dark-border/30 transition-colors ${highlight} ${
                !step.feasibleSoFar ? 'bg-red-500/10' : ''
              }`}
            >
              <td className="p-3 text-text-secondary">{stepIndex + 1}</td>
              <td className="p-3 text-accent-blue font-semibold">{cityCell(step.i)}</td>
              <td className="p-3 text-text-primary">{Math.floor(step.powerBefore)}</td>
              <td
                className={`p-3 font-semibold ${
                  hasSpend ? 'text-neon-orange' : 'text-text-secondary'
                }`}
              >
                {hasSpend ? `+${step.add}` : '—'}
              </td>
              <td className="p-3 text-accent-green font-semibold">{powerAfterForRow(step)}</td>
              <td className="p-3 text-neon-purple">{placed}</td>
              <td className="p-3 text-text-secondary">{effectLabelForRow(step)}</td>
              <td className="p-3 text-text-primary">{step.kRemainingAfter}</td>
              <td className="p-3">
                {step.feasibleSoFar ? (
                  <span className="text-neon-green text-xs">✓</span>
                ) : (
                  <span className="text-red-400 text-xs">✗</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface StepBreakdownProps {
  output: SolveOutput;
  cityNames?: string[];
}

export default function StepBreakdown({ output, cityNames }: StepBreakdownProps) {
  if (!output.trials || output.trials.length === 0) {
    return (
      <div className="mt-4 p-4 bg-dark-card/50 rounded-lg">
        <p className="text-sm text-gray-400">No step-by-step breakdown available. Use &quot;Solve & Visualize&quot; for detailed steps.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <h4 className="text-lg font-semibold text-neon-purple mb-4">Step Breakdown by Trial</h4>

      {output.trials.map((trial, trialIndex) => (
        <div key={trialIndex} className="p-5 bg-dark-card/60 rounded-lg border border-dark-border/70 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-dark-border/50">
            <div>
              <h5 className="font-semibold text-lg text-accent-blue mb-1">
                Trial {trialIndex + 1}: Testing mid = <span className="text-white font-mono">{Math.floor(trial.mid)}</span>
              </h5>
              <div className="text-xs text-text-secondary space-x-3">
                <span>Bounds: [{Math.floor(trial.low)}, {Math.floor(trial.high)}]</span>
                <span>•</span>
                <span>k Used: {trial.kUsed} / {output.k}</span>
              </div>
            </div>
            <span
              className={`text-sm font-semibold px-3 py-1 rounded-lg ${
                trial.feasible
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                  : 'bg-neon-orange/20 text-neon-orange border border-neon-orange/30'
              }`}
            >
              {trial.feasible ? '✅ Feasible' : '❌ Infeasible'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-dark-border/50">
            {renderTrialTable(trial, cityNames)}
          </div>
        </div>
      ))}
    </div>
  );
}
