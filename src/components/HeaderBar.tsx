'use client';

import { motion } from 'framer-motion';

export default function HeaderBar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-card border-b border-dark-border/50 px-6 py-4"
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-3xl"
          >
            ⚡
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-blue to-neon-purple bg-clip-text text-transparent">
              Resource Distribution Optimization Dashboard
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Advanced Planning & Analysis Tools
            </p>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
