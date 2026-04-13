'use client';

import { useState, useMemo, useEffect } from 'react';
import { SolveInput } from '@/lib/types';
import StationsEditor from './StationsEditor';
import ActionButtons from './ActionButtons';
import { validateInput, ValidationErrors } from '@/lib/validation';

interface ParamsPanelProps {
  input: SolveInput;
  onChange: (input: Partial<SolveInput>) => void;
  onSolve: () => void;
  onSolveWithTrace: () => void;
  excelMode?: boolean;
  excelError?: string | null;
  excelInputKey?: number;
  excelStrategy?: 'simple' | 'real';
  onExcelStrategyChange?: (strategy: 'simple' | 'real') => void;
  onExcelCitiesFile?: (file: File | null) => void;
  onExcelPlantsFile?: (file: File | null) => void;
  onClearExcel?: () => void;
}

export default function ParamsPanel({
  input,
  onChange,
  onSolve,
  onSolveWithTrace,
  excelMode = false,
  excelError = null,
  excelInputKey = 0,
  excelStrategy = 'simple',
  onExcelStrategyChange,
  onExcelCitiesFile,
  onExcelPlantsFile,
  onClearExcel,
}: ParamsPanelProps) {
  const [rError, setRError] = useState<string>('');
  const [kError, setKError] = useState<string>('');
  const [stationsError, setStationsError] = useState<string>('');
  const [kDisplayValue, setKDisplayValue] = useState<string>(input.k.toString());

  // Real-time validation
  const validation = useMemo(() => {
    return validateInput(input);
  }, [input]);

  const handleRChange = (r: number) => {
    const n = input.stations.length;
    if (r < 0) {
      setRError('Range must be non-negative');
    } else if (n > 0 && r >= n) {
      // Auto-adjust r if it exceeds n-1
      const maxR = Math.max(0, n - 1);
      setRError('');
      onChange({ r: maxR });
    } else {
      setRError('');
      onChange({ r });
    }
  };
  
  // Auto-update range when number of cities changes
  useEffect(() => {
    const n = input.stations.length;
    if (n > 0 && input.r >= n) {
      // Auto-adjust r to valid range
      const maxR = Math.max(0, n - 1);
      if (input.r !== maxR) {
        onChange({ r: maxR });
        setRError('');
      }
    }
  }, [input.stations.length, input.r, onChange]);

  // Sync kDisplayValue when input.k changes externally
  useEffect(() => {
    setKDisplayValue(input.k.toString());
  }, [input.k]);

  const handleKChange = (k: number | null) => {
    if (k === null) {
      // Empty field - show error but don't update input.k
      setKError('Additional stations is required');
      return;
    }
    
    if (k < 0) {
      setKError('Additional stations must be non-negative');
    } else if (k !== Math.floor(k)) {
      setKError('Additional stations must be an integer');
    } else if (k > 1000000000) {
      setKError('Additional stations value is too large');
    } else {
      setKError('');
    }
    onChange({ k });
  };

  const isFormValid = validation.isValid && !rError && !kError && !stationsError;

  return (
    <div className="space-y-4 sticky top-4">
      {/* Optional Excel uploads — same column width as rest of panel */}
      {onExcelCitiesFile && onExcelPlantsFile && onClearExcel && (
        <div className="glass-card p-4 border border-emerald-500/25">
          <h3 className="text-sm font-semibold mb-2 text-emerald-400">Excel data (optional)</h3>
          <p className="text-xs text-text-secondary mb-3">
            Upload <span className="font-mono text-white/90">cities.xlsx</span> and{' '}
            <span className="font-mono text-white/90">plants.xlsx</span> to drive the stations array from computed city
            power. r and k still come from the controls below.
          </p>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] text-text-secondary mb-1">cities.xlsx</label>
              <input
                key={`c-${excelInputKey}`}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="block w-full text-xs text-text-secondary file:mr-2 file:rounded file:border-0 file:bg-dark-border file:px-2 file:py-1 file:text-white"
                onChange={(e) => onExcelCitiesFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-secondary mb-1">plants.xlsx</label>
              <input
                key={`p-${excelInputKey}`}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="block w-full text-xs text-text-secondary file:mr-2 file:rounded file:border-0 file:bg-dark-border file:px-2 file:py-1 file:text-white"
                onChange={(e) => onExcelPlantsFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          {excelError && <p className="text-red-400 text-xs mt-2">{excelError}</p>}
          {excelMode && !excelError && (
            <>
              <p className="text-emerald-400/90 text-xs mt-2">Excel mode active — stations reflect computed city power.</p>
              {onExcelStrategyChange && (
                <div className="mt-3 pt-3 border-t border-dark-border/50">
                  <label className="block text-[11px] text-text-secondary mb-2">Optimization strategy</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onExcelStrategyChange('simple')}
                      className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                        excelStrategy === 'simple'
                          ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-300'
                          : 'border-dark-border text-text-secondary hover:text-white'
                      }`}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => onExcelStrategyChange('real')}
                      className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                        excelStrategy === 'real'
                          ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-300'
                          : 'border-dark-border text-text-secondary hover:text-white'
                      }`}
                    >
                      Real
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1.5">
                    {excelStrategy === 'simple'
                      ? 'Direct city support (educational)'
                      : 'Plant upgrades, recompute flow'}
                  </p>
                </div>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onClearExcel}
            className="mt-3 w-full py-1.5 text-xs rounded border border-dark-border text-text-secondary hover:text-white hover:border-white/30 transition-colors"
          >
            Clear Excel files
          </button>
        </div>
      )}

      {/* Input Summary Card */}
      <div className="glass-card p-4 border border-accent-blue/30">
        <h3 className="text-sm font-semibold mb-3 text-accent-blue">Input Summary</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">Cities:</span>
            <span className={`font-mono ${input.stations.length > 0 && input.stations.length <= 1000 ? 'text-green-400' : 'text-red-400'}`}>
              {input.stations.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Stations Entered:</span>
            <span className={`font-mono ${
              input.stations.length > 0 && 
              input.stations.every(s => !isNaN(s) && s >= 0) &&
              input.stations.length === input.stations.filter(s => !isNaN(s)).length
                ? 'text-green-400' 
                : 'text-red-400'
            }`}>
              {input.stations.filter(s => !isNaN(s)).length} {input.stations.length !== input.stations.filter(s => !isNaN(s)).length && '❌'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">
              Range (r):{excelMode && <span className="text-amber-400/70 font-normal"> unused</span>}
            </span>
            <span
              className={`font-mono ${
                excelMode
                  ? 'text-amber-400/80'
                  : !rError && input.r >= 0 && (input.stations.length === 0 || input.r < input.stations.length)
                    ? 'text-green-400'
                    : 'text-red-400'
              }`}
            >
              {input.r}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Additional Stations (k):</span>
            <span className={`font-mono ${!kError && input.k >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {input.k}
            </span>
          </div>
        </div>
      </div>

      {/* Problem Parameters */}
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold mb-4 text-neon-blue">Problem Parameters</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Range (r)
              {excelMode && (
                <span className="ml-2 text-amber-400/90 text-xs font-normal">
                  — not used in Excel mode
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="range"
                min="0"
                max={input.stations.length > 0 ? Math.max(0, input.stations.length - 1) : 10}
                value={input.r}
                onChange={(e) => handleRChange(parseInt(e.target.value))}
                className="flex-1"
                disabled={input.stations.length === 0 || excelMode}
              />
              <input
                type="number"
                min="0"
                max={input.stations.length > 0 ? input.stations.length - 1 : 10}
                value={input.stations.length === 0 ? '' : input.r}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === '') return;
                  handleRChange(parseInt(inputValue) || 0);
                }}
                disabled={input.stations.length === 0 || excelMode}
                className={`w-16 px-2 py-1 bg-dark-card border rounded text-white font-mono text-sm ${
                  rError ? 'border-red-500' : 'border-dark-border'
                } ${(input.stations.length === 0 || excelMode) ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
            {rError && <p className="text-red-400 text-xs mt-1">{rError}</p>}
            {excelMode && (
              <p className="text-amber-400/80 text-xs mt-1">
                Excel mode: power flows directly from plants to cities; no range logic.
              </p>
            )}
            {!rError && !excelMode && input.stations.length > 0 && (
              <p className="text-green-400 text-xs mt-1">
                ✓ Valid range (0 to {input.stations.length - 1})
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Additional Stations (k)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={kDisplayValue}
              onChange={(e) => {
                const inputValue = e.target.value;
                setKDisplayValue(inputValue);
                // Allow empty input for deletion
                if (inputValue === '') {
                  handleKChange(null);
                  return;
                }
                const parsed = parseInt(inputValue);
                if (!isNaN(parsed)) {
                  handleKChange(parsed);
                }
              }}
              className={`w-full px-3 py-2 bg-dark-card border rounded text-white font-mono ${
                kError ? 'border-red-500' : 'border-dark-border'
              }`}
            />
            {kError && (
              <p className="text-red-400 text-xs mt-1">{kError}</p>
            )}
            {!kError && kDisplayValue !== '' && !isNaN(parseInt(kDisplayValue)) && parseInt(kDisplayValue) >= 0 && (
              <p className="text-green-400 text-xs mt-1">✓ Valid value</p>
            )}
          </div>
        </div>
      </div>

      {/* Stations Editor */}
      <StationsEditor
        stations={input.stations}
        onChange={(stations) => onChange({ stations })}
        onValidationChange={(isValid, error) => {
          setStationsError(error || '');
        }}
        excelMode={excelMode}
      />

      {/* Action Buttons */}
      <ActionButtons
        onSolve={onSolve}
        onSolveWithTrace={onSolveWithTrace}
        disabled={!isFormValid}
      />
      
      {/* Validation Summary */}
      {!isFormValid && (
        <div className="glass-card p-3 border border-red-500/50 bg-red-500/10">
          <p className="text-red-400 text-xs font-semibold mb-2">⚠️ Please fix the following errors:</p>
          <ul className="text-red-300 text-xs space-y-1 list-disc list-inside">
            {validation.errors.n && <li>{validation.errors.n}</li>}
            {validation.errors.stations && <li>{validation.errors.stations}</li>}
            {validation.errors.r && <li>{validation.errors.r}</li>}
            {validation.errors.k && <li>{validation.errors.k}</li>}
            {rError && <li>{rError}</li>}
            {kError && <li>{kError}</li>}
            {stationsError && <li>{stationsError}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
