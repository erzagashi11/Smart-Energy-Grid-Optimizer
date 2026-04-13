'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface StationsEditorProps {
  stations: number[];
  onChange: (stations: number[]) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  /** When true, stations come from Excel — manual editing is disabled */
  excelMode?: boolean;
}

export default function StationsEditor({ stations, onChange, onValidationChange, excelMode = false }: StationsEditorProps) {
  const [textValue, setTextValue] = useState(stations.join(', '));
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Sync textValue when stations change externally, but only if the change didn't come from user typing
  // We use a ref to track if the change is from user input
  const isUserInputRef = useRef(false);
  
  useEffect(() => {
    // Only sync if the change didn't come from user input
    if (!isUserInputRef.current) {
      setTextValue(stations.join(', '));
    }
    isUserInputRef.current = false;
  }, [stations]);

  const handleTextChange = (value: string) => {
    isUserInputRef.current = true;
    
    // Only allow numbers, commas, and spaces
    // Filter out any other characters
    const filteredValue = value.replace(/[^0-9,\s]/g, '');
    
    // Don't allow multiple consecutive commas
    const noDoubleCommas = filteredValue.replace(/,+/g, ',');
    
    // Don't allow comma at the end (must end with a number)
    // But allow it temporarily while typing (user might be in the middle of typing)
    const finalValue = noDoubleCommas;
    
    setTextValue(finalValue);
    
    // Allow empty field
    if (finalValue === '' || finalValue.trim() === '') {
      setIsValid(true);
      setErrorMessage('');
      onChange([]);
      onValidationChange?.(true);
      return;
    }

    // Parse the input
    const trimmedValue = finalValue.trim();
    const parts = trimmedValue.split(',').map((s) => s.trim()).filter(s => s !== '');
    
    // Check if ends with comma (incomplete input)
    const endsWithComma = trimmedValue.endsWith(',');
    
    // Check for empty values between commas (double commas)
    if (finalValue.includes(',,')) {
      setIsValid(false);
      setErrorMessage('Stations array cannot have empty values');
      onValidationChange?.(false, 'Stations array cannot have empty values');
      return;
    }

    // If no valid parts yet, don't update stations
    if (parts.length === 0) {
      setIsValid(true);
      setErrorMessage('');
      return;
    }

    // Try to parse all parts
    const parsed = parts.map((p) => {
      const num = parseInt(p, 10);
      return isNaN(num) ? NaN : num;
    });

    // Check if there are any invalid numbers
    const hasInvalid = parsed.some(n => isNaN(n));
    const hasNegative = parsed.some(n => !isNaN(n) && n < 0);

    // Only validate and update stations if all parts are valid and doesn't end with comma
    if (!hasInvalid && !hasNegative && !endsWithComma) {
      setIsValid(true);
      setErrorMessage('');
      onChange(parsed);
      onValidationChange?.(true);
    } else {
      // Show error
      if (endsWithComma) {
        setIsValid(false);
        setErrorMessage('Input must end with a number, not a comma');
        onValidationChange?.(false, 'Input must end with a number, not a comma');
      } else if (hasInvalid) {
        setIsValid(false);
        setErrorMessage('All values must be valid numbers');
        onValidationChange?.(false, 'All values must be valid numbers');
      } else if (hasNegative) {
        setIsValid(false);
        setErrorMessage('Stations cannot have negative values');
        onValidationChange?.(false, 'Stations cannot have negative values');
      }
      // Don't call onChange - keep current stations while user is typing
    }
  };

  const handleNChange = (n: number) => {
    if (n < 0 || n > 1000) return;
    
    const newStations = [...stations];
    if (n > stations.length) {
      // Add zeros at the end
      newStations.push(...new Array(n - stations.length).fill(0));
    } else if (n < stations.length) {
      // Remove from the beginning (first numbers) when decreasing n
      newStations.splice(0, stations.length - n);
    }
    // Don't set isUserInputRef - this is an external change
    isUserInputRef.current = false;
    onChange(newStations);
    setTextValue(newStations.join(', '));
  };
  
  // Handle key presses to only allow valid characters
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow control keys (backspace, delete, arrows, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    
    // Allow navigation and editing keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Escape'
    ) {
      // Handle backspace specially to remove first number when cursor is at start
      if (e.key === 'Backspace') {
        const cursorPos = e.currentTarget.selectionStart;
        const selectionEnd = e.currentTarget.selectionEnd;
        
        // If there's a selection, let default behavior handle it
        if (cursorPos !== selectionEnd) {
          return;
        }
        
        // If cursor is at the very beginning (position 0) and there are numbers
        if (cursorPos === 0 && textValue.length > 0) {
          const parts = textValue.split(',').map(s => s.trim()).filter(s => s !== '');
          
          if (parts.length > 0) {
            // Remove first number
            const newParts = parts.slice(1);
            const newValue = newParts.length > 0 ? newParts.join(', ') : '';
            handleTextChange(newValue);
            e.preventDefault();
          }
        }
      }
      return;
    }
    
    // Only allow digits, comma, and space
    if (!/^\d|,| $/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold mb-4 text-neon-green">Stations Array</h3>
      {excelMode && (
        <p className="text-xs text-amber-400/90 mb-3">
          Excel mode: values are computed from uploaded files. Clear Excel uploads in the panel above to edit manually.
        </p>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Number of Cities (n)</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={stations.length === 0 ? '' : stations.length}
            onChange={(e) => {
              const inputValue = e.target.value;
              // Allow empty input for deletion
              if (inputValue === '') {
                onChange([]);
                setTextValue('');
                return;
              }
              const val = parseInt(inputValue);
              if (!isNaN(val) && val >= 1 && val <= 1000) {
                handleNChange(val);
              }
            }}
            disabled={excelMode}
            className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded text-white font-mono disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {stations.length === 0 && (
            <p className="text-red-400 text-xs mt-1">Number of cities cannot be 0</p>
          )}
          {stations.length > 1000 && (
            <p className="text-red-400 text-xs mt-1">Number of cities cannot exceed 1000</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Stations (comma-separated)</label>
          <textarea
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={excelMode}
            className={`w-full px-3 py-2 bg-dark-card border rounded text-white font-mono text-sm min-h-[100px] ${
              isValid ? 'border-dark-border' : 'border-red-500'
            } ${excelMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder="1, 2, 4, 5, 0"
          />
          {!isValid && errorMessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-xs mt-1"
            >
              {errorMessage}
            </motion.p>
          )}
          {isValid && stations.length > 0 && (
            <p className="text-green-400 text-xs mt-1">
              ✓ {stations.length} station{stations.length !== 1 ? 's' : ''} entered
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
