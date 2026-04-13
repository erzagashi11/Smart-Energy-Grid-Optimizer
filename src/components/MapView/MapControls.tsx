'use client';

interface MapControlsProps {
  showDeficitLabels: boolean;
  onShowDeficitLabelsChange: (show: boolean) => void;
  showAllCoverage: boolean;
  onShowAllCoverageChange: (show: boolean) => void;
}

export default function MapControls({
  showDeficitLabels,
  onShowDeficitLabelsChange,
  showAllCoverage,
  onShowAllCoverageChange,
}: MapControlsProps) {
  return (
    <div className="absolute top-4 left-4 glass-card p-3 rounded-lg border border-dark-border/50 z-30 flex flex-col gap-2">
      <label className="flex items-center gap-2 cursor-pointer text-xs">
        <input
          type="checkbox"
          checked={showAllCoverage}
          onChange={(e) => onShowAllCoverageChange(e.target.checked)}
          className="w-3 h-3 rounded border-dark-border bg-dark-card text-accent-blue focus:ring-accent-blue"
        />
        <span className="text-text-secondary">Show All Coverage</span>
      </label>
    </div>
  );
}
