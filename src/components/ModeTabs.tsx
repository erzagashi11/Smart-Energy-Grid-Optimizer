'use client';

import { motion } from 'framer-motion';
import { AppMode } from '@/lib/types';

interface ModeTabsProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export default function ModeTabs({ currentMode, onModeChange }: ModeTabsProps) {
  const modes: { id: AppMode; label: string; icon: string }[] = [
    { id: 'optimization', label: 'Optimization Simulator', icon: '⚡' },
  ];

  return (
    <div className="glass-card border-b border-dark-border/50">
      <div className="container mx-auto px-6">
        <div className="flex gap-2">
          {modes.map((mode) => {
            const isActive = currentMode === mode.id;
            return (
              <motion.button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative px-6 py-4 font-semibold text-sm transition-all
                  ${isActive 
                    ? 'text-accent-blue' 
                    : 'text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">{mode.icon}</span>
                  <span>{mode.label}</span>
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
