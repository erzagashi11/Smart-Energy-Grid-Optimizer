'use client';

import { motion } from 'framer-motion';

export type ViewType = 'chart' | 'map' | 'flow';

interface ViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  /** When true, show Flow tab (Excel mode only) */
  showFlowTab?: boolean;
}

export default function ViewToggle({ currentView, onViewChange, showFlowTab = false }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-dark-card/50 rounded-lg p-1 border border-dark-border/50">
      <button
        onClick={() => onViewChange('chart')}
        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
          currentView === 'chart'
            ? 'bg-accent-blue text-white'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        Chart
      </button>
      <button
        onClick={() => onViewChange('map')}
        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
          currentView === 'map'
            ? 'bg-accent-blue text-white'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        Map
      </button>
      {showFlowTab && (
        <button
          onClick={() => onViewChange('flow')}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
            currentView === 'flow'
              ? 'bg-accent-blue text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Flow
        </button>
      )}
    </div>
  );
}
