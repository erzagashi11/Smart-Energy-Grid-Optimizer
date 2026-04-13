import { AppState, PlanningResult, ComparisonMetrics, SolveOutput } from './types';
import { diffToPower, buildBasePowerDiff } from './solver/powerUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

/**
 * Calculate statistics for power distribution
 */
function calculatePowerStats(power: number[]) {
  const min = Math.min(...power);
  const max = Math.max(...power);
  const avg = power.reduce((a, b) => a + b, 0) / power.length;
  const median = [...power].sort((a, b) => a - b)[Math.floor(power.length / 2)];
  return { min, max, avg, median };
}

/**
 * Export data as JSON
 */
export function exportToJSON(data: any, filename: string = 'optimization-report.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate comprehensive academic PDF report
 */
export function exportToPDF(
  mode: 'optimization' | 'planning' | 'scenario-analysis',
  state: AppState | null,
  planningResult: PlanningResult | null,
  comparison: ComparisonMetrics | null
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const basePower = state?.input.stations 
    ? diffToPower(buildBasePowerDiff(state.input.stations, state.input.r))
    : [];
  const baseStats = basePower.length > 0 ? calculatePowerStats(basePower) : null;
  
  const finalPower = state?.output?.finalDistribution || planningResult?.finalDistribution || [];
  const finalStats = finalPower.length > 0 ? calculatePowerStats(finalPower) : null;

  let yPos = 20;

  const addSectionTitle = (text: string) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'bold');
    doc.text(text, 14, yPos);
    yPos += 8;
  };

  const addSubtitle = (text: string) => {
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'bold');
    doc.text(text, 14, yPos);
    yPos += 7;
  };

  const addText = (text: string, indent: number = 0, fontSize: number = 11) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(fontSize);
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'normal');
    const lines = doc.splitTextToSize(text, pageWidth - 34 - indent);
    doc.text(lines, 14 + indent, yPos, { align: 'left' });
    yPos += lines.length * 6;
  };

  const addTable = (head: string[][], body: any[][]) => {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    autoTable(doc, {
      head,
      body,
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0] },
      margin: { top: 10, bottom: 10 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  };

  // Title
  doc.setFontSize(18);
  doc.setFont('times', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Smart Energy Grid Optimization Analysis', 14, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('times', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text('Report Generated: ' + new Date().toLocaleString(), 14, yPos);
  yPos += 12;

  if (mode === 'optimization' && state) {
    
    // SECTION 1: PROBLEM DESCRIPTION
    addSectionTitle('1. Problem Description');
    addText('Objective: This report analyzes the optimal distribution of additional energy stations across cities to maximize minimum power coverage. The goal is to determine the highest possible minimum power level achievable after placing up to k additional stations, where each station affects cities within radius r.');
    yPos += 2;
    
    addSubtitle('System Overview');
    const overviewData = [
      ['Total Cities (n)', String(state.input.stations.length)],
      ['Range (r)', String(state.input.r)],
      ['Additional Stations (k)', String(state.input.k)]
    ];
    addTable(
      [['Metric', 'Value']],
      overviewData
    );

    // SECTION 2: INPUT DATA EXPLANATION
    addSectionTitle('2. Input Data Explanation');
    addTable(
      [['Parameter', 'Symbol', 'Description', 'Value']],
      [
        ['Number of Cities', 'n', 'Total number of cities in energy grid', String(state.input.stations.length)],
        ['Stations Array', 'stations[i]', 'Initial power stations in city i', '[' + state.input.stations.join(', ') + ']'],
        ['Range', 'r', 'Coverage radius (cities affected)', String(state.input.r)],
        ['Additional Stations', 'k', 'Max new stations allowed', String(state.input.k)]
      ]
    );
    addText('System Configuration: ' + state.input.stations.length + ' cities with initial station distribution. Each station covers radius r=' + state.input.r + '. Up to ' + state.input.k + ' additional stations can be deployed.');
    yPos += 2;

    // SECTION 3: INITIAL SYSTEM STATE
    addSectionTitle('3. Initial System State');
    addText('Before optimization, the power distribution across cities was:');
    const initialTableData = basePower.map((power, idx) => [
      'City ' + idx,
      String(power)
    ]);
    addTable(
      [['City ID', 'Initial Power']],
      initialTableData
    );
    
    // Stats boxes
    const statsData = [
      ['Min Power (Before)', String(baseStats?.min)],
      ['Max Power (Before)', String(baseStats?.max)],
      ['Avg Power (Before)', baseStats?.avg.toFixed(2)],
      ['Median (Before)', String(baseStats?.median || 0)]
    ];
    addTable(
      [['Metric', 'Value']],
      statsData
    );
    addText('Before optimization, minimum power was ' + baseStats?.min + ', indicating that some cities had significantly lower power levels than others.');
    yPos += 2;

    // SECTION 4: OPTIMIZATION METHOD
    addSectionTitle('4. Optimization Method');
    addText('Algorithm: Binary Search + Greedy Feasibility Check. Uses binary search to find maximum achievable minimum power.');
    yPos += 2;
    
    addSubtitle('Algorithm Steps:');
    addText('1. Initialize bounds: low = min(initial power), high = max(initial power) + k');
    addText('2. Binary search: While low ≤ high:');
    addText('   - Calculate mid = (low + high) / 2', 15);
    addText('   - Check feasibility for minimum power = mid', 15);
    addText('   - If feasible: try higher (low = mid + 1)', 15);
    addText('   - If not feasible: try lower (high = mid - 1)', 15);
    addText('3. Return: Highest feasible minimum power');
    yPos += 2;
    
    addSubtitle('Complexity Analysis:');
    addTable(
      [['Metric', 'Complexity', 'Explanation']],
      [
        ['Time Complexity', 'O(n log M)', 'n = cities, M = power range'],
        ['Feasibility Check', 'O(n)', 'Linear scan through cities'],
        ['Space Complexity', 'O(n)', 'Difference array storage']
      ]
    );

    // SECTION 5: BINARY SEARCH PROCESS
    addSectionTitle('5. Binary Search Process');
    if (state.output?.trials && state.output.trials.length > 0) {
      addText('The algorithm narrowed down optimal power through ' + state.output.trials.length + ' trials:');
      const trialsTableData = state.output.trials.map((trial, idx) => [
        String(idx + 1),
        String(trial.low),
        String(trial.mid),
        String(trial.high),
        trial.feasible ? 'Feasible' : 'Not Feasible',
        String(trial.kUsed || 0)
      ]);
      addTable(
        [['Trial #', 'Low Bound', 'Mid (Tested)', 'High Bound', 'Result', 'Stations Used']],
        trialsTableData
      );
      addText('Search converged from [' + state.output.trials[0]?.low + ', ' + state.output.trials[0]?.high + '] to optimal solution ' + state.output.answer + ' in ' + state.output.trials.length + ' iterations.');
    } else {
      addText('No execution trace available.');
    }
    yPos += 2;

    // SECTION 6: STATION PLACEMENT DECISIONS
    addSectionTitle('6. Station Placement Decisions');
    if (state.output?.trials && state.output.trials.length > 0) {
      const finalTrial = state.output.trials[state.output.trials.length - 1];
      const placements = finalTrial.steps.filter(s => s.placedAt !== null && s.add > 0);
      
      if (placements.length > 0) {
        addText('Strategic placement of ' + placements.length + ' stations to maximize coverage:');
        const placementsTableData = placements.map((step, idx) => {
          const startCity = Math.max(0, step.placedAt! - state.input.r);
          const endCity = Math.min(state.input.stations.length - 1, step.placedAt! + state.input.r);
          return [
            String(idx + 1),
            'City ' + step.placedAt,
            '+' + step.add,
            '[' + startCity + '–' + endCity + ']',
            (endCity - startCity + 1) + ' cities',
            'Maximize weak city coverage'
          ];
        });
        addTable(
          [['#', 'City', 'Power Added', 'Interval', 'Affected', 'Rationale']],
          placementsTableData
        );
        addText('Strategy: Stations placed at strategic positions to maximize overlap and raise lowest power levels. Priority given to cities with largest deficit.');
      } else {
        addText('No additional placements required - target already achieved with initial configuration.');
      }
    }

    // SECTION 7: FINAL POWER DISTRIBUTION
    addSectionTitle('7. Final Power Distribution');
    if (state.output?.finalDistribution && state.output.finalDistribution.length > 0) {
      const finalTableData = state.output.finalDistribution.map((power, idx) => {
        const initialPower = basePower[idx];
        const delta = power - initialPower;
        return [
          'City ' + idx,
          String(initialPower),
          String(power),
          (delta >= 0 ? '+' : '') + delta
        ];
      });
      addTable(
        [['City', 'Initial', 'Final', 'Change']],
        finalTableData
      );
      
      // Stats boxes
      const finalStatsData = [
        ['Min Power (After)', String(finalStats?.min)],
        ['Max Power (After)', String(finalStats?.max)],
        ['Avg Power (After)', finalStats?.avg.toFixed(2)],
        ['Median (After)', String(finalStats?.median || 0)]
      ];
      addTable(
        [['Metric', 'Value']],
        finalStatsData
      );
    }

    // NEW SECTION 7.5: POWER DISTRIBUTION COMPARISON GRAPH
    if (state.output?.finalDistribution && state.output.finalDistribution.length > 0 && basePower.length > 0) {
      addSectionTitle('Power Distribution Comparison');
      addText('The following comparison illustrates power distribution across cities before and after optimization:');
      
      // Create comparison table for visualization reference
      const finalDist = state.output?.finalDistribution || [];
      const comparisonData = basePower.map((power, idx) => [
        'City ' + idx,
        String(power),
        String(finalDist[idx] || 0),
        String((finalDist[idx] || 0) - power)
      ]);
      addTable(
        [['City', 'Initial Power', 'Final Power', 'Change']],
        comparisonData
      );
      
      addText('The comparison shows how strategic station placement increased the minimum power level across low-coverage cities while maintaining or improving power in already well-covered areas.');
      yPos += 2;
    }

    // SECTION 8: PERFORMANCE ANALYSIS
    addSectionTitle('8. Performance Analysis');
    addTable(
      [['Metric', 'Value', 'Interpretation']],
      [
        ['Execution Time', (state.output?.executionTimeMs ?? 0).toFixed(2) + ' ms', (state.output?.executionTimeMs ?? 0) < 10 ? 'Excellent' : 'Good'],
        ['Number of Trials', String(state.output?.trials.length || 0), 'Binary search iterations'],
        ['Total Steps', String(state.output?.totalSteps || 0), 'Cumulative feasibility steps'],
        ['Avg Steps/Trial', String(state.output?.trials.length && state.output?.totalSteps ? (state.output.totalSteps / state.output.trials.length).toFixed(1) : 'N/A'), 'Efficiency per iteration']
      ]
    );
    addText('Time Complexity: O(n log M) where n=' + state.input.stations.length + '. Algorithm efficiently finds optimal with logarithmic search.');
    yPos += 2;

    // SECTION 9: IMPROVEMENT SUMMARY
    addSectionTitle('9. Improvement Summary');
    if (finalStats && baseStats) {
      const improvementPct = ((finalStats.min - baseStats.min) / baseStats.min * 100).toFixed(1);
      const maxImprovementPct = ((finalStats.max - baseStats.max) / baseStats.max * 100).toFixed(1);
      const avgImprovementPct = ((finalStats.avg - baseStats.avg) / baseStats.avg * 100).toFixed(1);
      
      addTable(
        [['Metric', 'Before', 'After', 'Improvement', '% Change']],
        [
          ['Minimum Power', String(baseStats.min), String(finalStats.min), '+' + (finalStats.min - baseStats.min).toFixed(2), '+' + improvementPct + '%'],
          ['Maximum Power', String(baseStats.max), String(finalStats.max), '+' + (finalStats.max - baseStats.max).toFixed(2), '+' + maxImprovementPct + '%'],
          ['Average Power', baseStats.avg.toFixed(2), finalStats.avg.toFixed(2), '+' + (finalStats.avg - baseStats.avg).toFixed(2), '+' + avgImprovementPct + '%']
        ]
      );
      addText('The optimization increased the minimum city power from ' + baseStats.min + ' to ' + finalStats.min + ', representing ' + improvementPct + '% improvement.');
    }
    yPos += 2;

    // SECTION 10: ANALYSIS AND OBSERVATIONS
    addSectionTitle('10. Analysis and Observations');
    
    // ALGORITHM SCALABILITY (new subsection)
    addSubtitle('Algorithm Scalability:');
    addText('The proposed optimization approach scales efficiently with the number of cities. Since the algorithm applies binary search over the possible power range and performs a linear feasibility check for each candidate value, the total time complexity is O(n log M).');
    yPos += 2;
    
    addSubtitle('Critical Observations:');
    const criticalCities = basePower
      .map((p, i) => ({ city: i, power: p }))
      .sort((a, b) => a.power - b.power)
      .slice(0, 3);
    const criticalCitiesStr = criticalCities.map(c => 'City ' + c.city + ' (' + c.power + ')').join(', ');
    addText('• Critical cities: ' + criticalCitiesStr, 10);
    addText('• Cities with lowest initial power determine the achievable minimum coverage', 10);
    addText('• Strategic station placement significantly improves overall coverage stability', 10);
    const budgetUtilization = state.output?.kUsed ? ((state.output.kUsed / state.input.k) * 100).toFixed(1) : '0';
    addText('• Budget utilization: ' + state.output?.kUsed + ' of ' + state.input.k + ' stations used (' + budgetUtilization + '%)', 10);
  }

  doc.save(`${mode}-analysis-${new Date().toISOString().split('T')[0]}.pdf`);
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

function calculateVarianceReduction(before: number[], after: number[]): number {
  if (before.length === 0 || after.length === 0) return 0;
  const varBefore = calculateStdDev(before);
  const varAfter = calculateStdDev(after);
  if (varBefore === 0) return 0;
  return ((varBefore - varAfter) / varBefore) * 100;
}
