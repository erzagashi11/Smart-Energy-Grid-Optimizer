'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SolveOutput } from '@/lib/types';
import { bruteForceSolve } from '@/lib/solver/bruteForceSolver';

interface BruteForceVerificationProps {
  output: SolveOutput | null;
  input: { stations: number[]; r: number; k: number };
}

export default function BruteForceVerification({
  output,
  input,
}: BruteForceVerificationProps) {
  const [verification, setVerification] = useState<{
    running: boolean;
    result: number | null;
    executionTimeMs: number | null;
    matches: boolean | null;
  }>({
    running: false,
    result: null,
    executionTimeMs: null,
    matches: null,
  });

  const n = input.stations.length;

  useEffect(() => {
    if (n > 15 || !output || !output.answer) return;
    
    // Reset verification state
    setVerification({ running: true, result: null, executionTimeMs: null, matches: null });
    
    // Run brute force in next tick to avoid blocking UI
    const timeoutId = setTimeout(() => {
      try {
        const { answer, executionTimeMs } = bruteForceSolve(
          input.stations,
          input.r,
          input.k
        );
        const matches = answer === output.answer;
        
        setVerification({
          running: false,
          result: answer,
          executionTimeMs,
          matches,
        });
      } catch (error) {
        console.error('Brute force verification failed:', error);
        setVerification({
          running: false,
          result: null,
          executionTimeMs: null,
          matches: null,
        });
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [output?.answer, input.stations.join(','), input.r, input.k, n]);

  // Only show for small inputs
  if (n > 15) {
    return null;
  }
  
  // Don't show if no output yet
  if (!output || output.answer === undefined) {
    return null;
  }

  return (
    <div className="glass-card p-4 mt-4">
      <h3 className="text-lg font-semibold mb-3 text-neon-blue">Brute Force Verification</h3>
      
      {verification.running ? (
        <div className="flex items-center gap-3 p-3 bg-dark-card/50 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-blue"></div>
          <span className="text-sm text-text-secondary">Computing optimal solution...</span>
        </div>
      ) : verification.result !== null ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            verification.matches
              ? 'bg-accent-green/10 border-accent-green/50'
              : 'bg-accent-red/10 border-accent-red/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            {verification.matches ? (
              <>
                <span className="text-2xl">✅</span>
                <h4 className="text-sm font-semibold text-accent-green">
                  Verification Passed
                </h4>
              </>
            ) : (
              <>
                <span className="text-2xl">❌</span>
                <h4 className="text-sm font-semibold text-accent-red">
                  Verification Failed
                </h4>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-text-secondary">Optimized Algorithm:</span>
              <div className="font-mono font-bold text-accent-blue text-lg">
                {output.answer}
              </div>
            </div>
            <div>
              <span className="text-text-secondary">Brute Force Result:</span>
              <div className="font-mono font-bold text-neon-purple text-lg">
                {verification.result}
              </div>
            </div>
          </div>

          {/* Algorithm Comparison Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-dark-border">
                <tr className="text-text-secondary">
                  <th className="py-2 text-left">Metric</th>
                  <th className="py-2 text-left">Optimized (Binary Search)</th>
                  <th className="py-2 text-left">Brute Force</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-dark-border/30">
                  <td className="py-2 text-text-secondary">Result</td>
                  <td className="font-mono text-accent-blue">{output.answer}</td>
                  <td className="font-mono text-neon-purple">{verification.result}</td>
                </tr>
                <tr className="border-b border-dark-border/30">
                  <td className="py-2 text-text-secondary">Execution Time</td>
                  <td className="font-mono">
                    {(output.executionTimeMs ?? 0) < 0.01 
                      ? '< 0.01 ms' 
                      : `${(output.executionTimeMs ?? 0).toFixed(2)} ms`}
                  </td>
                  <td className="font-mono">
                    {verification.executionTimeMs! < 0.01 
                      ? '< 0.01 ms' 
                      : `${verification.executionTimeMs!.toFixed(2)} ms`}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-text-secondary">Speedup</td>
                  <td colSpan={2} className="font-mono">
                    {verification.executionTimeMs! > 0 && output.executionTimeMs 
                      ? `${(verification.executionTimeMs! / output.executionTimeMs).toFixed(2)}x ${verification.executionTimeMs! > output.executionTimeMs ? 'faster' : 'slower'}`
                      : 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {verification.executionTimeMs !== null && (
            <div className="mt-3 pt-3 border-t border-dark-border/30">
              <div className="text-xs text-text-secondary mb-2">
                Execution Times:
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-text-secondary">Brute Force:</span>
                  <div className="font-mono font-semibold text-accent-orange mt-0.5">
                    {verification.executionTimeMs < 0.01 
                      ? '< 0.01 ms' 
                      : `${verification.executionTimeMs.toFixed(2)} ms`}
                  </div>
                </div>
                <div>
                  <span className="text-text-secondary">Optimized:</span>
                  <div className="font-mono font-semibold text-accent-green mt-0.5">
                    {(output.executionTimeMs ?? 0) < 0.01 
                      ? '< 0.01 ms' 
                      : `${(output.executionTimeMs ?? 0).toFixed(2)} ms`}
                  </div>
                </div>
              </div>
              {verification.executionTimeMs < (output.executionTimeMs ?? 0) && (
                <div className="mt-2 p-2 bg-dark-card/50 rounded text-xs text-text-secondary border border-dark-border/30">
                  <div className="font-semibold text-accent-orange mb-1">ℹ️ Performance Note:</div>
                  <div>
                    For very small inputs (n ≤ 15), brute force can be faster because:
                    <ul className="list-disc list-inside mt-1 ml-2 space-y-0.5">
                      <li>Brute force starts from the maximum and often finds the answer quickly</li>
                      <li>Binary search has logarithmic overhead that may not pay off for tiny ranges</li>
                      <li>For larger inputs (n &gt; 15), optimized binary search algorithm is significantly faster (O(n log M) vs O(n * M))</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {verification.matches && (
            <div className="mt-3 p-2 bg-accent-green/20 rounded text-xs text-accent-green">
              ✓ Both algorithms produce the same result, confirming correctness.
            </div>
          )}
        </motion.div>
      ) : output ? (
        <div className="text-sm text-text-secondary">
          Computing verification...
        </div>
      ) : (
        <div className="text-sm text-text-secondary">
          Click &quot;Solve & Visualize&quot; to run verification.
        </div>
      )}
    </div>
  );
}
