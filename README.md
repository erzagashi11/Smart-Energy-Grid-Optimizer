# Smart Energy Grid Optimizer

An interactive frontend-only web application that visualizes and demonstrates the algorithm for the LeetCode problem **"Maximize the Minimum Powered City"** (Problem 2528).

## Features

- 🎨 **Futuristic Dark Dashboard UI** - Modern glass-morphism design with neon accents
- 📊 **Real-time Skyline Visualization** - Interactive bar chart showing city power levels
- 🎬 **Step-by-step Playback** - Animated visualization of the binary search + greedy algorithm
- 🔍 **Binary Search Dashboard** - Live tracking of search bounds and feasibility checks
- 📚 **Academic Theory Section** - Detailed explanations of algorithm correctness and complexity
- ⚡ **Frontend-Only** - All computation happens in the browser (no backend/API)

## Tech Stack

- **Framework**: Next.js 14 (frontend-only, no API routes)
- **Language**: TypeScript
- **Styling**: TailwindCSS with custom dark theme
- **Animations**: Framer Motion
- **Visualization**: HTML5 Canvas

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tema-e-diplomes
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main application page
├── components/
│   ├── HeaderBar.tsx       # Top navigation bar
│   ├── ScenarioCards.tsx   # Predefined scenario selector
│   ├── ParamsPanel/        # Input controls
│   ├── Visualization/      # Skyline chart and overlays
│   ├── Playback/           # Step-by-step playback controls
│   ├── Dashboard/          # Binary search bounds dashboard
│   ├── Results/            # Solution results panel
│   └── Theory/             # Academic explanations
├── lib/
│   ├── solver/
│   │   ├── maxPower.ts     # Fast solver (no trace)
│   │   ├── traceSolver.ts  # Solver with step-by-step trace
│   │   └── powerUtils.ts   # Utility functions
│   ├── types.ts            # TypeScript type definitions
│   └── scenarios.ts        # Predefined test scenarios
└── styles/
    └── globals.css          # Global styles and Tailwind config
```

## Algorithm Overview

The application solves the problem using:

1. **Difference Array Technique**: Efficiently computes base power distribution using prefix sums
2. **Binary Search**: Finds the maximum feasible minimum power value
3. **Greedy Feasibility Check**: For each candidate value, checks if k stations can be placed to achieve it

### Complexity

- **Time**: O(n log(maxPower + k))
- **Space**: O(n)

## Usage

1. **Select a Scenario**: Choose from Urban Grid, Rural Area, or Industrial Zone
2. **Configure Parameters**: Adjust n (cities), r (range), and k (additional stations)
3. **Edit Stations**: Modify the stations array via text input or visual bars
4. **Solve**: 
   - Click "Solve (Instant)" for quick results
   - Click "Solve & Visualize" for step-by-step animation
5. **Playback**: Use controls to step through the algorithm execution
6. **Explore**: View binary search trials, feasibility checks, and final results

## Key Components

### Visualization Stage
- **Skyline Chart**: Bar chart showing power levels per city
- **Target Line**: Horizontal line indicating the current binary search target
- **Range Overlay**: Highlights coverage range for active city
- **Added Layer**: Shows where new stations are placed

### Binary Search Dashboard
- **Bounds Cards**: Displays low, mid, and high values
- **Feasibility Card**: Shows whether current trial is feasible
- **History Timeline**: List of all binary search trials with ✅/❌ indicators

### Theory Section
- **Intuition**: Problem overview and approach
- **Why Binary Search Works**: Monotonicity explanation
- **Why Greedy Placement Works**: Optimality proof
- **Complexity**: Time and space analysis

## Performance Notes

- For visualization mode (trace enabled): Recommended n ≤ 150-300
- For instant solve: Can handle larger n values
- Heavy computations can optionally run in a Web Worker (still frontend-only)

## License

This project is created for academic/thesis purposes.

## Acknowledgments

Based on LeetCode Problem 2528: "Maximize the Minimum Powered City"
