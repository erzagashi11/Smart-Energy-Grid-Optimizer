'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlaybackState, TrialTrace } from '@/lib/types';

interface PlaybackControlsProps {
  playback: PlaybackState | null;
  trials: TrialTrace[];
  onChange: (playback: Partial<PlaybackState>) => void;
}

export default function PlaybackControls({
  playback,
  trials,
  onChange,
}: PlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!playback || !isPlaying) return;

    const interval = setInterval(() => {
      const currentTrial = trials[playback.currentTrialIndex];
      if (!currentTrial) {
        setIsPlaying(false);
        return;
      }

      if (playback.currentStepIndex < currentTrial.steps.length - 1) {
        onChange({ currentStepIndex: playback.currentStepIndex + 1 });
      } else if (playback.currentTrialIndex < trials.length - 1) {
        onChange({
          currentTrialIndex: playback.currentTrialIndex + 1,
          currentStepIndex: 0,
        });
      } else {
        setIsPlaying(false);
      }
    }, (1000 / playback.speed) * 4); // 4x slower for better visualization

    return () => clearInterval(interval);
  }, [isPlaying, playback, trials, onChange]);

  if (!playback) return null;

  const currentTrial = trials[playback.currentTrialIndex];
  const totalSteps = currentTrial?.steps.length || 0;
  const progress = totalSteps > 0 ? (playback.currentStepIndex / totalSteps) * 100 : 0;

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold mb-4 text-neon-purple">Playback Controls</h3>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsPlaying(!isPlaying);
              onChange({ isPlaying: !isPlaying });
            }}
            className="px-4 py-2 bg-neon-blue rounded-lg font-semibold neon-glow-blue"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (playback.currentStepIndex > 0) {
                onChange({ currentStepIndex: playback.currentStepIndex - 1 });
              }
            }}
            className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg font-semibold"
          >
            ⏮ Previous
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (playback.currentStepIndex < totalSteps - 1) {
                onChange({ currentStepIndex: playback.currentStepIndex + 1 });
              }
            }}
            className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg font-semibold"
          >
            ⏭ Next
          </motion.button>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Speed: {playback.speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.125"
            max="5"
            step="0.125"
            value={playback.speed}
            onChange={(e) => onChange({ speed: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Trial {playback.currentTrialIndex + 1} / {trials.length}</span>
            <span>Step {playback.currentStepIndex + 1} / {totalSteps}</span>
          </div>
          <div className="w-full bg-dark-card rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-neon-blue to-neon-purple h-2 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>

        <div className="flex gap-2 text-xs font-mono">
          <button
            onClick={() => onChange({ currentStepIndex: 0 })}
            className="px-2 py-1 bg-dark-card border border-dark-border rounded hover:border-neon-blue transition-colors"
          >
            Jump to Start
          </button>
          <button
            onClick={() => onChange({ currentStepIndex: totalSteps - 1 })}
            className="px-2 py-1 bg-dark-card border border-dark-border rounded hover:border-neon-blue transition-colors"
          >
            Jump to End
          </button>
        </div>
      </div>
    </div>
  );
}
