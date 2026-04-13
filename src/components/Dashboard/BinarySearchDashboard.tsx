'use client';

import { SolveOutput } from '@/lib/types';
import BoundsCards from './BoundsCards';
import FeasibilityCard from './FeasibilityCard';
import HistoryTimeline from './HistoryTimeline';

interface BinarySearchDashboardProps {
  output: SolveOutput | null;
  currentTrialIndex: number;
  onTrialSelect: (index: number) => void;
}

export default function BinarySearchDashboard({
  output,
  currentTrialIndex,
  onTrialSelect,
}: BinarySearchDashboardProps) {
  if (!output || !output.trials || output.trials.length === 0) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold text-neon-blue">Binary Search Dashboard</h3>
        <p className="text-sm text-gray-400 mt-2">Run &quot;Solve & Visualize&quot; to see the algorithm in action.</p>
      </div>
    );
  }

  const currentTrial = output.trials[currentTrialIndex];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neon-blue">Binary Search Dashboard</h3>
      
      <BoundsCards
        low={currentTrial.low}
        mid={currentTrial.mid}
        high={currentTrial.high}
      />

      <FeasibilityCard
        feasible={currentTrial.feasible}
        kUsed={currentTrial.kUsed}
        kTotal={output.k}
        minPower={currentTrial.mid}
      />

      <HistoryTimeline
        trials={output.trials}
        currentIndex={currentTrialIndex}
        onSelect={onTrialSelect}
      />
    </div>
  );
}
