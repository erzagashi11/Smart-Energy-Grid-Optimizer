/**
 * Hook to calculate chart positions matching SkylineChartCanvas
 * This ensures overlays align perfectly with bars
 */
export function useChartPosition(n: number, containerWidth: number = 1000) {
  // Canvas padding matches SkylineChartCanvas
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = containerWidth - padding.left - padding.right;
  
  // Calculate bar width same as in SkylineChartCanvas
  const minBarWidth = 2;
  const calculatedBarWidth = chartWidth / Math.max(n, 1);
  const barWidth = Math.max(minBarWidth, calculatedBarWidth);
  
  // Calculate actual chart width
  const actualChartWidth = barWidth * n;
  
  return {
    padding,
    barWidth,
    chartWidth: actualChartWidth,
    getBarPosition: (index: number) => {
      return padding.left + index * barWidth;
    },
    getBarPositionPercent: (index: number) => {
      // Position as percentage of container width
      return ((padding.left + index * barWidth) / containerWidth) * 100;
    },
    getBarWidthPercent: () => {
      return (barWidth / containerWidth) * 100;
    },
  };
}
