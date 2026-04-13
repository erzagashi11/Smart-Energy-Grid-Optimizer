'use client';

import { useState, useMemo } from 'react';
import { convertToMapData } from '@/lib/mapUtils';
import { SolveInput } from '@/lib/types';
import CleanMapView from '../MapView/CleanMapView';
import ViewToggle, { type ViewType } from '../MapView/ViewToggle';

interface ScenarioVisualizationProps {
  input: SolveInput;
  scenarioA: {
    stations: number[];
    r: number;
    k: number;
    result: any;
  };
  scenarioB: {
    stations: number[];
    r: number;
    k: number;
    result: any;
  };
  selectedScenario: 'A' | 'B' | 'both';
  onSelectedScenarioChange: (scenario: 'A' | 'B' | 'both') => void;
}

export default function ScenarioVisualization({
  input,
  scenarioA,
  scenarioB,
  selectedScenario,
  onSelectedScenarioChange,
}: ScenarioVisualizationProps) {
  const [viewMode, setViewMode] = useState<ViewType>('chart');

  const mapDataA = useMemo(() => {
    if (viewMode === 'map' && scenarioA.result) {
      const mockInput: SolveInput = {
        ...input,
        stations: scenarioA.stations,
        r: scenarioA.r,
        k: scenarioA.k,
      };
      return convertToMapData(mockInput, scenarioA.result, undefined, undefined, scenarioA.result.answer);
    }
    return null;
  }, [viewMode, input, scenarioA]);

  const mapDataB = useMemo(() => {
    if (viewMode === 'map' && scenarioB.result) {
      const mockInput: SolveInput = {
        ...input,
        stations: scenarioB.stations,
        r: scenarioB.r,
        k: scenarioB.k,
      };
      return convertToMapData(mockInput, scenarioB.result, undefined, undefined, scenarioB.result.answer);
    }
    return null;
  }, [viewMode, input, scenarioB]);

  if (viewMode === 'chart') {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neon-blue">Visualization</h3>
          <ViewToggle currentView={viewMode} onViewChange={setViewMode} showFlowTab={false} />
        </div>
        <div className="text-center py-20 text-text-secondary">
          Chart view coming soon. Switch to Map view to see geographic comparison.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neon-blue">Map Visualization</h3>
        <ViewToggle currentView={viewMode} onViewChange={setViewMode} showFlowTab={false} />
      </div>
      
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => onSelectedScenarioChange('A')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            selectedScenario === 'A'
              ? 'bg-accent-blue text-white'
              : 'bg-dark-card/50 text-text-secondary hover:text-text-primary'
          }`}
        >
          Show A
        </button>
        <button
          onClick={() => onSelectedScenarioChange('B')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            selectedScenario === 'B'
              ? 'bg-accent-blue text-white'
              : 'bg-dark-card/50 text-text-secondary hover:text-text-primary'
          }`}
        >
          Show B
        </button>
        <button
          onClick={() => onSelectedScenarioChange('both')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            selectedScenario === 'both'
              ? 'bg-accent-blue text-white'
              : 'bg-dark-card/50 text-text-secondary hover:text-text-primary'
          }`}
        >
          Both
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mapDataA && (selectedScenario === 'A' || selectedScenario === 'both') && (
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">Scenario A</h4>
            <div className="relative min-h-[400px]">
              <CleanMapView
                cities={mapDataA.cities}
                stations={mapDataA.stations}
                targetPower={scenarioA.result?.answer}
                r={scenarioA.r}
                mode="static"
              />
            </div>
          </div>
        )}
        
        {mapDataB && (selectedScenario === 'B' || selectedScenario === 'both') && (
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">Scenario B</h4>
            <div className="relative min-h-[400px]">
              <CleanMapView
                cities={mapDataB.cities}
                stations={mapDataB.stations}
                targetPower={scenarioB.result?.answer}
                r={scenarioB.r}
                mode="static"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
