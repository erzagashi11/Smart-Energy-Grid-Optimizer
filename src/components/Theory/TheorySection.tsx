'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const tabs = ['Intuition', 'Why Binary Search Works', 'Why Greedy Placement Works', 'Complexity'];

export default function TheorySection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-semibold mb-4 text-neon-blue">Academic Theory</h3>
      
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab, index) => (
          <motion.button
            key={tab}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeTab === index
                ? 'bg-neon-blue text-white neon-glow-blue'
                : 'bg-dark-card text-gray-400 border border-dark-border hover:border-neon-blue/50'
            }`}
          >
            {tab}
          </motion.button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="prose prose-invert max-w-none"
      >
        {activeTab === 0 && (
          <div className="space-y-4 text-gray-300">
            <p>
              The problem asks us to maximize the minimum power across all cities after placing k additional power stations optimally.
            </p>
            <p>
              Each power station at city i can provide power to all cities within range r (i.e., cities j where |i - j| ≤ r).
              The power of a city is the sum of all stations that can reach it.
            </p>
            <p>
              We use binary search to find the maximum feasible minimum power. For each candidate value, we check if it&apos;s possible
              to place k stations such that every city has at least that power level.
            </p>
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-4 text-gray-300">
            <p>
              Binary search works because the problem has a monotonic property: if we can achieve minimum power X,
              we can achieve any value less than X. If we cannot achieve X, we cannot achieve any value greater than X.
            </p>
            <div className="bg-dark-card/50 p-4 rounded-lg border border-dark-border font-mono text-sm">
              <div>Search space: [minPower, maxPower + k]</div>
              <div>For each mid value:</div>
              <div className="ml-4">- If feasible(mid): answer ≥ mid, search [mid+1, high]</div>
              <div className="ml-4">- Else: answer &lt; mid, search [low, mid-1]</div>
            </div>
            <p>
              This reduces the problem from exponential search space to O(log(maxPower + k)) binary search steps.
            </p>
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-4 text-gray-300">
            <p>
              The greedy placement strategy works by processing cities left to right. When we encounter a city with power below
              the target, we place stations as far right as possible (at i + r) to maximize coverage.
            </p>
            <p>
              <strong>Why this is optimal:</strong> If we place a station earlier (at i + r - d), it covers the same cities
              plus some to the left. However, since we process left to right, cities to the left are already satisfied.
              Placing further right (at i + r) extends coverage further right, helping future cities that might need it.
            </p>
            <div className="bg-dark-card/50 p-4 rounded-lg border border-dark-border font-mono text-sm">
              <div>For city i with power &lt; target:</div>
              <div className="ml-4">1. Calculate deficit = target - currentPower[i]</div>
              <div className="ml-4">2. Place deficit stations at position i + r</div>
              <div className="ml-4">3. Update difference array: diff[i+r] += deficit, diff[i+2r+1] -= deficit</div>
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div className="space-y-4 text-gray-300">
            <div className="bg-dark-card/50 p-4 rounded-lg border border-dark-border">
              <h4 className="font-semibold mb-2 text-neon-green">Time Complexity</h4>
              <ul className="space-y-2 font-mono text-sm">
                <li>• Build base power: <span className="text-neon-blue">O(n)</span></li>
                <li>• Binary search iterations: <span className="text-neon-blue">O(log(maxPower + k))</span></li>
                <li>• Feasibility check per iteration: <span className="text-neon-blue">O(n)</span></li>
                <li>• <strong>Total: O(n log(maxPower + k))</strong></li>
              </ul>
            </div>
            <div className="bg-dark-card/50 p-4 rounded-lg border border-dark-border">
              <h4 className="font-semibold mb-2 text-neon-green">Space Complexity</h4>
              <ul className="space-y-2 font-mono text-sm">
                <li>• Difference array: <span className="text-neon-blue">O(n)</span></li>
                <li>• <strong>Total: O(n)</strong></li>
              </ul>
            </div>
            <p>
              The difference array technique allows us to update range effects in O(1) time, making the greedy check efficient.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
