'use client';

import { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { kosovoBoundsToLayoutRect } from '@/lib/mapUtils';
import { KOSOVO_SW, KOSOVO_NE } from '@/lib/geo/kosovoBounds';
import kosovoMapPng from '@/styles/images/kosovomap.png';

const DEFAULT_KOSOVO_MAP_IMAGE_URL = kosovoMapPng.src;

interface City {
  id: number;
  x: number;
  y: number;
  power: number;
  basePower: number;
  targetPower?: number;
  /** Excel mode: human-readable label and demand for tooltips */
  displayName?: string;
  demand?: number;
  gapVsDemand?: number;
  /** Excel mode: contribution breakdown by plant */
  coveredBy?: Array<{ plant_name: string; contribution: number }>;
}

interface PlantMarker {
  id: number;
  x: number;
  y: number;
  plantName: string;
  netPower: number;
  radius: number;
  coveredCityCount: number;
  addedK?: number;
}

interface Station {
  id: number;
  x: number;
  y: number;
  addedPower: number;
  coverageRadius: number;
  citiesCovered: number[];
  isExisting?: boolean;
  isNewPlacement?: boolean;
  isActivePlacement?: boolean;
}

interface CleanMapViewProps {
  cities: City[];
  stations: Station[];
  /** Excel mode: plant markers to display */
  plants?: PlantMarker[];
  targetPower?: number;
  r: number;
  activeCityId?: number;
  activePlacementStationId?: number;
  activePlacementAffectedCities?: number[]; // Cities affected by active placement
  activePlacementAdd?: number; // Amount of power being added in active placement
  mode?: 'static' | 'step';
  isFinalSolution?: boolean; // Whether we're showing final solution
  finalAnswer?: number; // Final minimum power achieved
  allPlacements?: Array<{ cityId: number; addedPower: number }>; // All placements from final solution
  showPlacementsOverlay?: boolean; // Whether to show placements overlay
  /** Excel mode: tier colors (red/yellow/green) and weakest-city highlight */
  excelMode?: boolean;
  weakestCityId?: number;
  /** Excel Real mode: placements on plants; Simple mode: on cities */
  plantPlacements?: Array<{ plantIndex: number; addedPower: number }>;
  /** Excel Real mode: active plant placement during step */
  activePlantPlacementId?: number;
  onCityClick?: (cityId: number) => void;
  onStationClick?: (stationId: number) => void;
  // Callbacks to expose data for external panels
  onPowerStatsReady?: (stats: {
    minPower: number;
    maxPower: number;
    avgPower: number;
    citiesBelowTarget: number;
    minCity: City | undefined;
    maxCity: City | undefined;
    bottom3: City[];
    top3: City[];
  }) => void;
  onCityHover?: (city: City | null) => void;
  onCitySelect?: (city: City | null) => void;
  showKosovoSvgOverlay?: boolean;
  excelLatLngs?: Array<{ lat: number; lng: number }>;
  excelPlantLatLngs?: Array<{ lat: number; lng: number }>;
  kosovoImageUrl?: string;
}

export default function CleanMapView({
  cities,
  stations,
  plants = [],
  targetPower,
  r,
  activeCityId,
  activePlacementStationId,
  activePlacementAffectedCities = [],
  activePlacementAdd = 0,
  mode = 'static',
  isFinalSolution = false,
  finalAnswer,
  allPlacements = [],
  showPlacementsOverlay: externalShowPlacementsOverlay = false,
  excelMode = false,
  weakestCityId,
  plantPlacements = [],
  activePlantPlacementId,
  onCityClick,
  onStationClick,
  onPowerStatsReady,
  onCityHover,
  onCitySelect,
  showKosovoSvgOverlay = false,
  excelLatLngs,
  excelPlantLatLngs = [],
  kosovoImageUrl = DEFAULT_KOSOVO_MAP_IMAGE_URL,
}: CleanMapViewProps) {
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [hoveredCity, setHoveredCity] = useState<number | null>(null);
  const [hoveredPlant, setHoveredPlant] = useState<number | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  /** User drag offset; base centering is recomputed from zoom/bounds (see basePan). */
  const [panDrag, setPanDrag] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Track placement animation state for atomic updates
  const [placementAnimationPhase, setPlacementAnimationPhase] = useState<'before' | 'animating' | 'committed'>('before');
  const [showPlacementBadge, setShowPlacementBadge] = useState(false);
  
  // Use ref to prevent duplicate animations
  const animationInProgressRef = useRef(false);
  const lastAnimationKeyRef = useRef<string>('');
  
  // Use external showPlacementsOverlay if provided, otherwise use internal state
  const [internalShowPlacementsOverlay, setInternalShowPlacementsOverlay] = useState(() => {
    // Auto-show if instant solve (has allPlacements but no trials)
    return isFinalSolution && allPlacements && allPlacements.length > 0;
  });
  const showPlacementsOverlay = externalShowPlacementsOverlay !== undefined 
    ? externalShowPlacementsOverlay 
    : internalShowPlacementsOverlay;
  
  // Track power values for counter animation
  const [animatedPower, setAnimatedPower] = useState<Map<number, number>>(new Map());
  
  // Track selected city for info panel
  const [selectedCityInfo, setSelectedCityInfo] = useState<City | null>(null);
  
  // Calculate total added power per city from all placements (for placement history)
  // Aggregate by city ID (where station was placed) - Simple mode
  const placementHistory = useMemo(() => {
    if (!isFinalSolution) return new Map<number, number>();
    if (plantPlacements.length > 0) return new Map<number, number>(); // Real mode uses plantPlacements
    if (!allPlacements || allPlacements.length === 0) return new Map<number, number>();
    const history = new Map<number, number>();
    allPlacements.forEach(({ cityId, addedPower }) => {
      const current = history.get(cityId) || 0;
      history.set(cityId, current + addedPower);
    });
    return history;
  }, [isFinalSolution, allPlacements, plantPlacements]);

  // Plant placement history for Real mode
  const plantPlacementHistory = useMemo(() => {
    if (!isFinalSolution || plantPlacements.length === 0) return new Map<number, number>();
    const history = new Map<number, number>();
    plantPlacements.forEach(({ plantIndex, addedPower }) => {
      const current = history.get(plantIndex) || 0;
      history.set(plantIndex, current + addedPower);
    });
    return history;
  }, [isFinalSolution, plantPlacements]);
  
  // Auto-show placements is now handled in OptimizationMode.tsx
  
  // Create a stable animation key based on placement parameters
  const animationKey = useMemo(() => {
    return `${activePlacementStationId}-${activePlacementAdd}-${activePlacementAffectedCities.join(',')}`;
  }, [activePlacementStationId, activePlacementAdd, activePlacementAffectedCities]);
  
  // Reset animation phase when active placement changes
  useEffect(() => {
    // Skip if this is the same animation already in progress or completed
    if (lastAnimationKeyRef.current === animationKey) {
      return;
    }
    
    if (activePlacementStationId !== undefined && activePlacementAdd > 0 && mode === 'step') {
      // Mark animation as in progress
      animationInProgressRef.current = true;
      lastAnimationKeyRef.current = animationKey;
      
      // Phase A: Before state (show current power, no changes yet)
      setPlacementAnimationPhase('before');
      setShowPlacementBadge(false);
      
      // Store initial power values for counter animation
      const initialPowers = new Map<number, number>();
      activePlacementAffectedCities.forEach(cityId => {
        const city = cities.find(c => c.id === cityId);
        if (city) {
          initialPowers.set(cityId, city.power);
        }
      });
      setAnimatedPower(initialPowers);
      
      // Phase B: Start animation after a brief delay
      const animTimer = setTimeout(() => {
        setPlacementAnimationPhase('animating');
        setShowPlacementBadge(true);
        
        // Animate counter for affected cities
        activePlacementAffectedCities.forEach(cityId => {
          const city = cities.find(c => c.id === cityId);
          if (city) {
            const startPower = city.power;
            const endPower = city.power + activePlacementAdd;
            const duration = 1200; // ms - slower animation
            const steps = 30; // More steps for smoother animation
            const stepDuration = duration / steps;
            const powerDiff = endPower - startPower;
            
            for (let i = 0; i <= steps; i++) {
              setTimeout(() => {
                const currentPower = Math.round(startPower + (powerDiff * i / steps));
                setAnimatedPower(prev => {
                  const newMap = new Map(prev);
                  newMap.set(cityId, currentPower);
                  return newMap;
                });
              }, i * stepDuration);
            }
          }
        });
      }, 200); // Slightly longer delay
      
      // Phase C: Commit changes after animation completes (1200ms + delay)
      const commitTimer = setTimeout(() => {
        setPlacementAnimationPhase('committed');
        // Reset animation flag after commit
        setTimeout(() => {
          animationInProgressRef.current = false;
        }, 100);
      }, 1500); // Total: 200ms delay + 1200ms animation
      
      return () => {
        clearTimeout(animTimer);
        clearTimeout(commitTimer);
        animationInProgressRef.current = false;
      };
    } else {
      setPlacementAnimationPhase('before');
      setShowPlacementBadge(false);
      setAnimatedPower(new Map());
      animationInProgressRef.current = false;
      lastAnimationKeyRef.current = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationKey, mode]);
  
  // Hide badge after showing for 1 second
  useEffect(() => {
    if (showPlacementBadge) {
      const hideTimer = setTimeout(() => {
        setShowPlacementBadge(false);
      }, 1000);
      return () => clearTimeout(hideTimer);
    }
  }, [showPlacementBadge]);

  /** Kosovo PNG fringe / artwork slightly past strict NE corner — extra width in layout space */
  const kosovoLayoutRect = useMemo(() => {
    if (!showKosovoSvgOverlay || !excelLatLngs?.length) return null;
    const r = kosovoBoundsToLayoutRect(excelLatLngs, excelPlantLatLngs, KOSOVO_SW, KOSOVO_NE);
    const w = r.maxX - r.minX;
    return { ...r, maxX: r.maxX + w * 0.08 };
  }, [showKosovoSvgOverlay, excelLatLngs, excelPlantLatLngs]);

  // Bounds: cities/plants, and when Kosovo map is on include its full rect so SVG fit doesn’t clip the image
  const bounds = useMemo(() => {
    if (cities.length === 0 && plants.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    const xs = [...cities.map((c) => c.x), ...plants.map((p) => p.x)];
    const ys = [...cities.map((c) => c.y), ...plants.map((p) => p.y)];
    const padding = 30;
    let minX = Math.min(...xs) - padding;
    let maxX = Math.max(...xs) + padding;
    let minY = Math.min(...ys) - padding;
    let maxY = Math.max(...ys) + padding;
    if (showKosovoSvgOverlay && kosovoLayoutRect) {
      minX = Math.min(minX, kosovoLayoutRect.minX);
      maxX = Math.max(maxX, kosovoLayoutRect.maxX);
      minY = Math.min(minY, kosovoLayoutRect.minY);
      maxY = Math.max(maxY, kosovoLayoutRect.maxY);
    }
    return { minX, maxX, minY, maxY };
  }, [cities, plants, showKosovoSvgOverlay, kosovoLayoutRect]);

  const width = showKosovoSvgOverlay ? 880 : 800;
  const height = showKosovoSvgOverlay ? 520 : 500;

  /** One source of truth: same scale for transforms and centering (avoids drift). */
  const { scale, basePan } = useMemo(() => {
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    if (!(bw > 0 && bh > 0)) {
      return { scale: 1, basePan: { x: 0, y: 0 } };
    }
    const sx = width / bw;
    const sy = height / bh;
    const s = Math.min(sx, sy) * zoom;
    return {
      scale: s,
      basePan: { x: (width - bw * s) / 2, y: (height - bh * s) / 2 },
    };
  }, [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, width, height, zoom]);

  useLayoutEffect(() => {
    setPanDrag({ x: 0, y: 0 });
  }, [zoom, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, width, height]);

  const pan = { x: basePan.x + panDrag.x, y: basePan.y + panDrag.y };

  const transformX = (x: number) => (x - bounds.minX) * scale + pan.x;
  const transformY = (y: number) => (y - bounds.minY) * scale + pan.y;

  // Calculate cities within range r of active city
  const citiesInRange = useMemo(() => {
    if (activeCityId === undefined || mode !== 'step') return [];
    
    const activeCity = cities.find(c => c.id === activeCityId);
    if (!activeCity) return [];
    
    // Cities affected by active city (within range r)
    const start = Math.max(0, activeCityId - r);
    const end = Math.min(cities.length, activeCityId + r + 1);
    const inRange: number[] = [];
    
    for (let i = start; i < end; i++) {
      if (i !== activeCityId) {
        inRange.push(i);
      }
    }
    
    return inRange;
  }, [activeCityId, r, cities, mode]);

  // Calculate power statistics
  const powerStats = useMemo(() => {
    if (cities.length === 0) return null;
    
    const powers = cities.map(c => c.power);
    const minPower = Math.min(...powers);
    const maxPower = Math.max(...powers);
    const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
    const citiesBelowTarget = targetPower !== undefined 
      ? cities.filter(c => c.power < targetPower).length 
      : 0;
    
    const minCity = cities.find(c => c.power === minPower);
    const maxCity = cities.find(c => c.power === maxPower);
    const sorted = [...cities].sort((a, b) => a.power - b.power);
    const bottom3 = sorted.slice(0, 3);
    const top3 = sorted.slice(-3).reverse();
    
    return {
      minPower,
      maxPower,
      avgPower,
      citiesBelowTarget,
      minCity,
      maxCity,
      bottom3,
      top3,
    };
  }, [cities, targetPower]);
  
  // Expose power stats to parent
  useEffect(() => {
    if (powerStats && onPowerStatsReady) {
      onPowerStatsReady(powerStats);
    }
  }, [powerStats, onPowerStatsReady]);
  
  // Expose city hover/select to parent
  useEffect(() => {
    if (onCityHover) {
      const city = hoveredCity !== null ? cities.find(c => c.id === hoveredCity) : null;
      onCityHover(city || null);
    }
  }, [hoveredCity, cities, onCityHover]);
  
  useEffect(() => {
    if (onCitySelect) {
      const city = selectedCity !== null ? cities.find(c => c.id === selectedCity) : null;
      onCitySelect(city || null);
    }
  }, [selectedCity, cities, onCitySelect]);

  // Relative power tiers for Excel mode (red = weakest cohort, yellow, green = strongest)
  const getExcelTierColor = (city: City) => {
    if (cities.length === 0) return '#4DA0E1';
    const powers = cities.map((c) => c.power);
    const minP = Math.min(...powers);
    const maxP = Math.max(...powers);
    const span = maxP - minP || 1;
    const t = (city.power - minP) / span;
    if (t < 1 / 3) return '#E53935';
    if (t < 2 / 3) return '#FDD835';
    return '#43A047';
  };

  // Get city color based on target with heat map (darker = more power, lighter = less power)
  const getCityColor = (city: City) => {
    if (excelMode) {
      return getExcelTierColor(city);
    }
    if (targetPower === undefined) {
      return '#4DA0E1'; // Blue if no target
    }
    
    const deficit = city.power - targetPower;
    
    // Heat map logic:
    // If above target: darker green = more surplus
    // If below target: lighter red = less deficit, darker red = more deficit
    
    if (deficit >= 0) {
      // Above target: darker green for more surplus
      const allSurpluses = cities.map(c => Math.max(0, c.power - (targetPower || 0)));
      const maxSurplus = Math.max(...allSurpluses, 1);
      if (maxSurplus === 0) return '#66BB6A';
      const normalized = Math.min(deficit / maxSurplus, 1);
      // Darker green: from #66BB6A (light) to #2E7D32 (dark)
      const r = Math.floor(102 - (102 - 46) * normalized);
      const g = Math.floor(187 - (187 - 125) * normalized);
      const b = Math.floor(106 - (106 - 50) * normalized);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Below target: lighter red for less deficit, darker red for more deficit
      const allDeficits = cities.map(c => Math.min(0, c.power - (targetPower || 0)));
      const minDeficit = Math.min(...allDeficits, -1);
      if (minDeficit === 0) return '#F44336';
      const normalized = Math.min(Math.abs(deficit) / Math.abs(minDeficit), 1);
      // Lighter red for less deficit, darker red for more deficit
      // From #FFCDD2 (very light) to #F44336 (normal) to #C62828 (dark)
      if (normalized < 0.5) {
        // Light red range
        const factor = normalized * 2; // 0 to 1
        const r = Math.floor(255 - (255 - 244) * factor);
        const g = Math.floor(205 - (205 - 67) * factor);
        const b = Math.floor(210 - (210 - 54) * factor);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        // Dark red range
        const factor = (normalized - 0.5) * 2; // 0 to 1
        const r = Math.floor(244 - (244 - 198) * factor);
        const g = Math.floor(67 - (67 - 40) * factor);
        const b = Math.floor(54 - (54 - 40) * factor);
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
  };

  // Get city size based on power (relative)
  const getCitySize = (city: City) => {
    if (cities.length === 0) return 5;
    const powers = cities.map(c => c.power);
    const minPower = Math.min(...powers);
    const maxPower = Math.max(...powers);
    const range = maxPower - minPower || 1;
    const normalized = (city.power - minPower) / range;
    return 4 + normalized * 4; // 4-8 range
  };

  // Get deficit/surplus
  const getDeficitStatus = (city: City) => {
    if (targetPower === undefined) return null;
    const deficit = city.power - targetPower;
    return {
      value: deficit,
      meets: deficit >= 0,
    };
  };

  // Get city state for rendering
  const getCityState = (city: City) => {
    const isActive = activeCityId === city.id;
    const isInRange = citiesInRange.includes(city.id);
    const isAffectedByPlacement = activePlacementAffectedCities.includes(city.id);
    const isSelected = selectedCity === city.id;
    const isHovered = hoveredCity === city.id;
    
    return {
      isActive,
      isInRange,
      isAffectedByPlacement,
      isSelected,
      isHovered,
    };
  };

  const handleFitToCities = () => {
    setZoom(1);
    setPanDrag({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const tx = e.clientX - dragStart.x;
      const ty = e.clientY - dragStart.y;
      setPanDrag({ x: tx - basePan.x, y: ty - basePan.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const currentCity = selectedCity !== null ? cities.find(c => c.id === selectedCity) : null;
  const hoveredCityData = hoveredCity !== null ? cities.find(c => c.id === hoveredCity) : null;
  const selectedPlantData = selectedPlant !== null ? plants.find(p => p.id === selectedPlant) : null;
  const activePlacementStation = activePlacementStationId !== undefined 
    ? stations.find(s => s.id === activePlacementStationId || s.isActivePlacement)
    : null;

  return (
    <div
      className="relative w-full h-full bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-slate-900/40 rounded-lg overflow-hidden"
      style={{ minHeight: showKosovoSvgOverlay ? 520 : 500 }}
    >
      {/* Top-left Badge - Final Solution / Step Info */}
      {isFinalSolution && finalAnswer !== undefined && mode === 'static' && (
        <div className="absolute top-4 left-4 glass-card px-3 py-2 rounded-lg border border-accent-green/50 bg-accent-green/10 z-20">
          <div className="text-xs font-semibold text-accent-green">Final Solution</div>
          <div className="text-[10px] text-text-secondary mt-0.5">Min Power: {finalAnswer}</div>
          {placementHistory.size > 0 && (
            <div className="text-[10px] text-text-secondary mt-1">
              Placements:{' '}
              {Array.from(placementHistory.entries())
                .map(([cityId, power]) => {
                  const label = cities.find((c) => c.id === cityId)?.displayName ?? `City ${cityId}`;
                  return `${label} (+${power})`;
                })
                .join(', ')}
            </div>
          )}
        </div>
      )}
      
      {mode === 'static' && targetPower !== undefined && !isFinalSolution && (
        <div className="absolute top-4 left-4 glass-card px-3 py-2 rounded-lg border border-accent-green/50 bg-accent-green/10 z-20">
          <div className="text-xs font-semibold text-accent-green">Final Solution</div>
          <div className="text-[10px] text-text-secondary mt-0.5">Target: {targetPower}</div>
        </div>
      )}
      
      {mode === 'step' && activeCityId !== undefined && !isFinalSolution && (
        <div className="absolute top-4 left-4 glass-card px-3 py-2 rounded-lg border border-accent-blue/50 bg-accent-blue/10 z-20">
          <div className="text-xs font-semibold text-accent-blue">Step Mode</div>
          <div className="text-[10px] text-text-secondary mt-0.5">
            Checking{' '}
            {cities.find((c) => c.id === activeCityId)?.displayName ?? `City ${activeCityId}`}
          </div>
        </div>
      )}
      
      {/* Show Placements button is now in the header (OptimizationMode) */}
      <div className="absolute inset-0 pointer-events-none">
        {!showKosovoSvgOverlay ? (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'url(https://www.shutterstock.com/image-vector/map-navigation-route-planning-location-600nw-2623915333.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                filter: 'blur(3px)',
                opacity: 0.7,
                transform: `translate(${pan.x * 0.1}px, ${pan.y * 0.1}px) scale(${1 + (zoom - 1) * 0.05})`,
                transition: 'transform 0.1s ease-out',
              }}
            />
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(15, 23, 42, 0.35)' }} />
        )}
        
        {/* Map UI Elements */}
        {/* Compass */}
        <div className="absolute top-4 right-4 pointer-events-none z-10">
          <div className="glass-card px-3 py-2 rounded-lg border border-white/10 bg-black/30">
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <line x1="20" y1="2" x2="20" y2="8" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
              <text x="20" y="12" textAnchor="middle" className="text-[8px] fill-white/60 font-semibold">N</text>
              <line x1="20" y1="32" x2="20" y2="38" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="2" y1="20" x2="8" y2="20" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="32" y1="20" x2="38" y2="20" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        
        {/* Scale Bar */}
        <div className="absolute bottom-4 left-4 pointer-events-none z-10">
          <div className="glass-card px-3 py-2 rounded-lg border border-white/10 bg-black/30">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-12 h-1 bg-white/40"></div>
                <div className="w-1 h-3 bg-white/40"></div>
                <div className="w-12 h-1 bg-white/40"></div>
                <div className="w-1 h-3 bg-white/40"></div>
                <div className="w-12 h-1 bg-white/40"></div>
              </div>
              <span className="text-[9px] text-white/50 font-medium">5 km</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mini Floating Info Panel for Selected City - Bottom Right */}
      {selectedCityInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-4 right-4 glass-card px-4 py-3 rounded-lg border border-accent-blue/50 bg-accent-blue/10 z-30 min-w-[180px] shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-accent-blue">
              {selectedCityInfo.displayName ?? `City ${selectedCityInfo.id}`}
            </h3>
            <button
              onClick={() => {
                setSelectedCityInfo(null);
                setSelectedCity(null);
              }}
              className="text-text-secondary hover:text-accent-red text-[14px] leading-none w-5 h-5 flex items-center justify-center rounded-full hover:bg-accent-red/20 transition-colors"
              title="Close"
            >
              ×
            </button>
          </div>
          <div className="space-y-1 text-[11px] text-text-secondary">
            <div className="flex justify-between">
              <span>Base Power:</span>
              <span className="font-semibold text-text-primary">
                {excelMode ? Math.floor(selectedCityInfo.basePower) : selectedCityInfo.basePower}
              </span>
            </div>
            {excelMode && selectedCityInfo.demand !== undefined && (
              <div className="flex justify-between">
                <span>Demand:</span>
                <span className="font-semibold text-text-primary">{Math.floor(selectedCityInfo.demand)}</span>
              </div>
            )}
            {excelMode && selectedCityInfo.coveredBy && selectedCityInfo.coveredBy.length > 0 && (
              <div className="mt-1 pt-1 border-t border-white/10">
                <span className="text-[10px] text-text-secondary block mb-0.5">By plant:</span>
                {selectedCityInfo.coveredBy.map((x, i) => (
                  <div key={i} className="flex justify-between text-[10px]">
                    <span className="text-white/70">{x.plant_name}</span>
                    <span className="font-mono">{Math.floor(x.contribution)}</span>
                  </div>
                ))}
              </div>
            )}
            {targetPower !== undefined && (
              <>
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span className="font-semibold text-text-primary">{targetPower}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deficit:</span>
                  <span className={`font-semibold ${selectedCityInfo.power >= targetPower ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedCityInfo.power >= targetPower ? '+' : ''}
                    {Math.floor(selectedCityInfo.power - targetPower)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span>Current Power:</span>
              <span className="font-semibold text-text-primary">
                {excelMode ? Math.floor(selectedCityInfo.power) : selectedCityInfo.power}
              </span>
            </div>
            {stations.filter(s => s.citiesCovered.includes(selectedCityInfo.id)).length > 0 && (
              <div className="flex justify-between">
                <span>Stations used:</span>
                <span className="font-semibold text-text-primary">
                  {stations.filter(s => s.citiesCovered.includes(selectedCityInfo.id)).length}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Plant info panel (Excel mode) */}
      {selectedPlantData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-4 right-4 glass-card px-4 py-3 rounded-lg border border-amber-500/50 bg-amber-500/10 z-30 min-w-[180px] shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-amber-400">{selectedPlantData.plantName}</h3>
            <button
              onClick={() => { setSelectedPlant(null); }}
              className="text-text-secondary hover:text-accent-red text-[14px] leading-none w-5 h-5 flex items-center justify-center rounded-full hover:bg-accent-red/20 transition-colors"
              title="Close"
            >
              ×
            </button>
          </div>
          <div className="space-y-1 text-[11px] text-text-secondary">
            <div className="flex justify-between">
              <span>Net power:</span>
              <span className="font-semibold text-text-primary">{selectedPlantData.netPower}</span>
            </div>
            <div className="flex justify-between">
              <span>Radius:</span>
              <span className="font-semibold text-text-primary">{selectedPlantData.radius} km</span>
            </div>
            <div className="flex justify-between">
              <span>Cities covered:</span>
              <span className="font-semibold text-text-primary">{selectedPlantData.coveredCityCount}</span>
            </div>
            {selectedPlantData.addedK !== undefined && selectedPlantData.addedK > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Added k:</span>
                <span className="font-semibold">+{selectedPlantData.addedK}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        className="relative z-10 block h-full w-full max-h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', overflow: 'hidden' }}
      >
        {kosovoLayoutRect &&
          (() => {
            const { minX, maxX, minY, maxY } = kosovoLayoutRect;
            const ix = transformX(minX);
            const iy = transformY(minY);
            const iw = transformX(maxX) - transformX(minX);
            const ih = transformY(maxY) - transformY(minY);
            return (
              <image
                href={kosovoImageUrl}
                x={ix}
                y={iy}
                width={iw}
                height={ih}
                preserveAspectRatio="none"
                opacity={0.52}
                pointerEvents="none"
              />
            );
          })()}
        {/* Step Mode: Coverage circles for Active City and Affected Cities */}
        {mode === 'step' && activeCityId !== undefined && (
          <>
            {/* Active City: Large coverage circle with dashed border, thick, strong glow */}
            {(() => {
              const activeCity = cities.find(c => c.id === activeCityId);
              if (!activeCity) return null;
              const activeSize = getCitySize(activeCity);
              const coverageRadius = r * 25; // Slightly larger coverage radius
              
              return (
                <g key={`active-coverage-${activeCityId}`}>
                  {/* Strong glow behind */}
                  <motion.circle
                    cx={transformX(activeCity.x)}
                    cy={transformY(activeCity.y)}
                    r={coverageRadius}
                    fill="none"
                    stroke="rgba(77, 160, 225, 0.4)"
                    strokeWidth="4"
                    strokeDasharray="12,6"
                    animate={{
                      opacity: [0.4, 0.6, 0.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="pointer-events-none"
                    style={{ filter: 'blur(2px)' }}
                  />
                  {/* Main dashed border - thick */}
                  <circle
                    cx={transformX(activeCity.x)}
                    cy={transformY(activeCity.y)}
                    r={coverageRadius}
                    fill="none"
                    stroke="rgba(77, 160, 225, 0.8)"
                    strokeWidth="3"
                    strokeDasharray="12,6"
                    className="pointer-events-none"
                  />
                </g>
              );
            })()}
            
            {/* Affected Cities: Large coverage circles with dashed border, thin, light glow */}
            {citiesInRange.map((cityId) => {
              const city = cities.find(c => c.id === cityId);
              if (!city) return null;
              const coverageRadius = r * 25; // Same scale, slightly larger
              
              return (
                <g key={`affected-coverage-${cityId}`}>
                  {/* Light glow behind */}
                  <circle
                    cx={transformX(city.x)}
                    cy={transformY(city.y)}
                    r={coverageRadius}
                    fill="rgba(102, 187, 106, 0.1)"
                    className="pointer-events-none"
                    style={{ filter: 'blur(3px)' }}
                  />
                  {/* Main dashed border - thin (changed from solid to dashed) */}
                  <circle
                    cx={transformX(city.x)}
                    cy={transformY(city.y)}
                    r={coverageRadius}
                    fill="none"
                    stroke="rgba(102, 187, 106, 0.6)"
                    strokeWidth="1.5"
                    strokeDasharray="8,4"
                    className="pointer-events-none"
                  />
                </g>
              );
            })}
          </>
        )}

        {/* Road Network - Connect cities with curved roads (before cities for layering) */}
        {cities.length > 1 && (
          <g className="pointer-events-none" style={{ opacity: 0.08 }}>
            {cities.map((city, i) => {
              // Connect to nearby cities (within reasonable distance)
              const nearbyCities = cities
                .slice(i + 1)
                .filter(other => {
                  const dx = other.x - city.x;
                  const dy = other.y - city.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  return dist < 150 && dist > 30; // Reasonable road distance
                })
                .slice(0, 2); // Max 2 connections per city
              
              return nearbyCities.map((other, idx) => {
                const x1 = transformX(city.x);
                const y1 = transformY(city.y);
                const x2 = transformX(other.x);
                const y2 = transformY(other.y);
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                // Add curve control point with slight randomness (use city IDs for consistent randomness)
                const seed = (city.id * 7 + other.id * 13) % 100 / 100;
                const curveX = midX + (seed - 0.5) * 15;
                const curveY = midY + ((seed * 0.7) - 0.35) * 15;
                
                return (
                  <path
                    key={`road-${i}-${other.id}`}
                    d={`M ${x1} ${y1} Q ${curveX} ${curveY} ${x2} ${y2}`}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={idx % 2 === 0 ? "1" : "0.8"}
                    strokeDasharray={idx % 2 === 0 ? "none" : "4,4"}
                    fill="none"
                    style={{ filter: 'blur(0.5px)' }}
                  />
                );
              });
            })}
          </g>
        )}

        {/* Lightning Strike Effect - Micro Explosion */}
        {mode === 'step' && placementAnimationPhase === 'animating' && activePlacementStationId !== undefined && (
          <>
            {(() => {
              const placementCity = cities.find(c => c.id === activePlacementStationId);
              if (!placementCity) return null;
              
              return (
                <g key="lightning-explosion">
                  {/* Lightning strike from top */}
                  <motion.line
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 1, 0.8, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    x1={transformX(placementCity.x)}
                    y1={0}
                    x2={transformX(placementCity.x)}
                    y2={transformY(placementCity.y)}
                    stroke="rgba(255, 193, 7, 0.9)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="pointer-events-none"
                    style={{ filter: 'drop-shadow(0 0 4px rgba(255, 193, 7, 0.8))' }}
                  />
                  {/* Ripple wave expanding */}
                  {[0, 1, 2].map((i) => (
                    <motion.circle
                      key={`ripple-${i}`}
                      initial={{ r: 0, opacity: 0.8 }}
                      animate={{ 
                        r: r * 25 * (1 + i * 0.5),
                        opacity: [0.8, 0.5, 0.2, 0]
                      }}
                      transition={{ 
                        duration: 1.2,
                        delay: i * 0.2,
                        ease: "easeOut"
                      }}
                      cx={transformX(placementCity.x)}
                      cy={transformY(placementCity.y)}
                      fill="none"
                      stroke="rgba(255, 193, 7, 0.6)"
                      strokeWidth="2"
                      className="pointer-events-none"
                    />
                  ))}
                </g>
              );
            })()}
          </>
        )}

        {/* Step Mode: Pulse effect and "+X" bubbles for cities affected by active placement */}
        {mode === 'step' && activePlacementAffectedCities.length > 0 && activePlacementAdd > 0 && (
          <>
            {activePlacementAffectedCities.map((cityId) => {
              const city = cities.find(c => c.id === cityId);
              if (!city) return null;
              
              // Don't highlight the city where station is placed (it has its own orange color)
              const isPlacementCity = activePlacementStationId !== undefined && cityId === activePlacementStationId;
              const citySize = getCitySize(city);
              
              return (
                <motion.g 
                  key={`affected-${cityId}`}
                  animate={placementAnimationPhase === 'animating' ? {
                    x: [0, -2, 2, -2, 2, 0],
                    y: [0, -1, 1, -1, 1, 0]
                  } : {}}
                  transition={{
                    duration: 0.4,
                    ease: "easeInOut"
                  }}
                >
                  {/* Pulse glow animation - only during animating phase */}
                  {placementAnimationPhase === 'animating' && !isPlacementCity && (
                    <motion.circle
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: [0.2, 0.5, 0.2],
                        scale: [1, 1.15, 1]
                      }}
                      transition={{ duration: 0.4, repeat: 1 }}
                      cx={transformX(city.x)}
                      cy={transformY(city.y)}
                      r={citySize + 8}
                      fill="rgba(255, 138, 101, 0.3)"
                      className="pointer-events-none"
                      style={{ filter: 'blur(4px)' }}
                    />
                  )}
                  
                  {/* Mini "+X" bubble with lightning - appears during animating phase, fades out quickly */}
                  {placementAnimationPhase === 'animating' && (
                    <AnimatePresence>
                      <motion.g
                        initial={{ opacity: 0, scale: 0, y: 0 }}
                        animate={{ opacity: 1, scale: 1, y: -citySize - 15 }}
                        exit={{ opacity: 0, scale: 0.5, y: -citySize - 25 }}
                        transition={{ 
                          duration: 0.3,
                          delay: 0.2,
                          exit: { duration: 0.2, delay: 0.3 }
                        }}
                      >
                        {/* Lightning icon above bubble */}
                        <motion.text
                          x={transformX(city.x)}
                          y={transformY(city.y) - citySize - 40}
                          textAnchor="middle"
                          className="text-xl font-bold fill-accent-orange pointer-events-none"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                          transition={{ 
                            duration: 0.5,
                            delay: 0.1,
                            type: "spring",
                            stiffness: 200
                          }}
                          style={{ 
                            filter: 'drop-shadow(0 0 4px rgba(255, 138, 101, 0.8))',
                            textShadow: '0 0 8px rgba(255, 138, 101, 0.6)'
                          }}
                        >
                          ⚡
                        </motion.text>
                        {/* Bubble background */}
                        <rect
                          x={transformX(city.x) - 18}
                          y={transformY(city.y) - citySize - 25}
                          width={36}
                          height={18}
                          rx="9"
                          fill="rgba(255, 138, 101, 0.9)"
                          stroke="#FF8A65"
                          strokeWidth="1.5"
                          className="pointer-events-none"
                          style={{ filter: 'drop-shadow(0 0 4px rgba(255, 138, 101, 0.6))' }}
                        />
                        {/* "+X" text */}
                        <text
                          x={transformX(city.x)}
                          y={transformY(city.y) - citySize - 14}
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-white pointer-events-none"
                        >
                          +{activePlacementAdd}
                        </text>
                      </motion.g>
                    </AnimatePresence>
                  )}
                </motion.g>
              );
            })}
          </>
        )}

        {/* Placement History Overlay - Show all placements when toggle is on */}
        {showPlacementsOverlay && isFinalSolution && placementHistory.size > 0 && (
          <>
            {Array.from(placementHistory.entries()).map(([cityId, totalAdded]) => {
              const city = cities.find(c => c.id === cityId);
              if (!city) return null;
              
              return (
                <g key={`placement-history-${cityId}`}>
                  {/* City name label */}
                  <text
                    x={transformX(city.x)}
                    y={transformY(city.y) - 55}
                    textAnchor="middle"
                    className="text-[11px] font-semibold fill-accent-orange pointer-events-none"
                    style={{ 
                      filter: 'drop-shadow(0 0 2px rgba(255, 138, 101, 0.8))'
                    }}
                  >
                    {city.displayName ?? `City ${cityId}`}
                  </text>
                  {/* Total added power badge */}
                  <rect
                    x={transformX(city.x) - 20}
                    y={transformY(city.y) - 40}
                    width={40}
                    height={16}
                    rx="8"
                    fill="rgba(255, 138, 101, 0.95)"
                    stroke="#FF8A65"
                    strokeWidth="1.5"
                    className="pointer-events-none"
                    style={{ filter: 'drop-shadow(0 0 4px rgba(255, 138, 101, 0.6))' }}
                  />
                  <text
                    x={transformX(city.x)}
                    y={transformY(city.y) - 28}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-white pointer-events-none"
                  >
                    +{totalAdded}
                  </text>
                </g>
              );
            })}
          </>
        )}

        {/* Plant markers (Excel mode) - triangle shape to distinguish from cities */}
        {plants.map((plant) => {
          const hasPlacement = plantPlacementHistory.has(plant.id);
          const totalAdded = plantPlacementHistory.get(plant.id) ?? 0;
          const isActivePlant = activePlantPlacementId === plant.id;
          return (
            <g key={`plant-${plant.id}`}>
              {/* Placement badge for Real mode */}
              {hasPlacement && isFinalSolution && (
                <>
                  <rect
                    x={transformX(plant.x) - 22}
                    y={transformY(plant.y) - 42}
                    width={44}
                    height={16}
                    rx="8"
                    fill="rgba(255, 138, 101, 0.95)"
                    stroke="#FF8A65"
                    strokeWidth="1.5"
                    className="pointer-events-none"
                  />
                  <text
                    x={transformX(plant.x)}
                    y={transformY(plant.y) - 31}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-white pointer-events-none"
                  >
                    +{totalAdded}
                  </text>
                </>
              )}
              {/* Plant marker - diamond/triangle */}
              <polygon
                points={`${transformX(plant.x)},${transformY(plant.y) - 8} ${transformX(plant.x) + 8},${transformY(plant.y) + 6} ${transformX(plant.x)},${transformY(plant.y) + 10} ${transformX(plant.x) - 8},${transformY(plant.y) + 6}`}
                fill={isActivePlant ? '#FF8A65' : '#F59E0B'}
                stroke="#fff"
                strokeWidth="2"
                opacity={hoveredPlant === plant.id ? 1 : 0.9}
                className="cursor-pointer"
                onClick={() => { setSelectedPlant(plant.id); }}
                onMouseEnter={() => setHoveredPlant(plant.id)}
                onMouseLeave={() => setHoveredPlant(null)}
              />
              <text
                x={transformX(plant.x)}
                y={transformY(plant.y) + 22}
                textAnchor="middle"
                className="text-[9px] fill-white/80 pointer-events-none"
              >
                {plant.plantName}
              </text>
            </g>
          );
        })}

        {/* Station markers - only in final mode or existing stations */}
        {stations.map((station, index) => {
          const isExisting = station.isExisting ?? false;
          const isActive = station.id === activePlacementStationId || station.isActivePlacement;
          
          // In step mode, only show active placement prominently
          if (mode === 'step' && !isActive && !isExisting) {
            return null;
          }
          
          // Hide stations in final solution when placements overlay is shown (overlay shows them instead)
          if (isFinalSolution && showPlacementsOverlay && !isExisting) {
            return null;
          }
          
          return (
            <g key={`station-${station.id}-${index}`}>
              {/* Active placement orange glow */}
              {isActive && mode === 'step' && (
                <motion.circle
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  cx={transformX(station.x)}
                  cy={transformY(station.y)}
                  r={18}
                  fill="rgba(255, 138, 101, 0.2)"
                  className="pointer-events-none"
                  style={{ filter: 'blur(6px)' }}
                />
              )}
              
              <circle
                cx={transformX(station.x)}
                cy={transformY(station.y)}
                r={isActive && mode === 'step' ? 10 : (isExisting ? 7 : 8)}
                fill={isExisting ? "#4DA0E1" : "#FF8A65"}
                stroke="#fff"
                strokeWidth={isActive && mode === 'step' ? "3" : "2"}
                className="cursor-pointer"
                onClick={() => onStationClick?.(station.id)}
              />
              
              {/* "+X added" badge - only show during animation phase, then fade out */}
              {isActive && mode === 'step' && (
                <AnimatePresence>
                  {showPlacementBadge && (
                    <motion.g
                      initial={{ opacity: 0, y: -10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                      {/* Badge background with orange gradient effect */}
                      <rect
                        x={transformX(station.x) - 28}
                        y={transformY(station.y) + 35}
                        width={56}
                        height={20}
                        rx="10"
                        fill="rgba(255, 138, 101, 0.95)"
                        stroke="#FF8A65"
                        strokeWidth="2"
                        className="pointer-events-none"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(255, 138, 101, 0.6))' }}
                      />
                      {/* "+X added" text */}
                      <text
                        x={transformX(station.x)}
                        y={transformY(station.y) + 48}
                        textAnchor="middle"
                        className="text-xs font-bold fill-white pointer-events-none"
                      >
                        +{station.addedPower} added
                      </text>
                    </motion.g>
                  )}
                </AnimatePresence>
              )}
            </g>
          );
        })}

        {/* City markers */}
        {cities.map((city) => {
          const state = getCityState(city);
          // Calculate effective power based on placement animation phase
          // ATOMIC STEP UPDATE: Power updates only after animation commits
          // Phase A (before): Show power before placement (all cities)
          // Phase B (animating): Still show power before placement (during animation)
          // Phase C (committed): Show power after placement (affected cities get +activePlacementAdd)
          let effectivePower = city.power;
          
          // CRITICAL: Update power for all affected cities after animation commits
          // This ensures all affected cities (including active city if it's in range) update simultaneously
          // During animating phase, use animated counter value
          if (placementAnimationPhase === 'animating' && animatedPower.has(city.id)) {
            effectivePower = animatedPower.get(city.id) || city.power;
          } else if (placementAnimationPhase === 'committed' && 
              state.isAffectedByPlacement && 
              activePlacementAdd > 0) {
            // Update power for ALL affected cities, including active city if it's in the range
            effectivePower = city.power + activePlacementAdd;
          }
          // Create a modified city object with effective power for color/size calculations
          const cityWithEffectivePower = { ...city, power: effectivePower };
          const color = getCityColor(cityWithEffectivePower);
          const size = getCitySize(cityWithEffectivePower);
          const deficitStatus = getDeficitStatus(cityWithEffectivePower);
          
          // Opacity based on state
          let opacity = 1;
          if (mode === 'step') {
            if (state.isActive) opacity = 1; // Full opacity for active
            else if (state.isInRange) opacity = 0.75; // Slightly lower for affected cities
            else if (state.isAffectedByPlacement) opacity = 0.8;
            else opacity = 0.4; // Dim other cities in step mode
          } else {
            opacity = state.isSelected || state.isHovered ? 0.9 : 0.7;
          }
          
          return (
            <g key={`city-${city.id}`}>
              {/* Active city: white center with strong visual emphasis */}
              {state.isActive && mode === 'step' && (
                <>
                  {/* Strong glow pulse - outer ring */}
                  <motion.circle
                    cx={transformX(city.x)}
                    cy={transformY(city.y)}
                    r={size + 15}
                    fill="none"
                    stroke="rgba(77, 160, 225, 0.8)"
                    strokeWidth="2"
                    animate={{
                      opacity: [0.8, 0.3, 0.8],
                      r: [size + 15, size + 20, size + 15],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="pointer-events-none"
                    style={{ filter: 'blur(3px)' }}
                  />
                  {/* Dashed outline - thick */}
                  <circle
                    cx={transformX(city.x)}
                    cy={transformY(city.y)}
                    r={size + 8}
                    fill="none"
                    stroke="rgba(77, 160, 225, 0.9)"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                    className="pointer-events-none"
                  />
                </>
              )}
              
              {/* City marker */}
              <circle
                cx={transformX(city.x)}
                cy={transformY(city.y)}
                r={size}
                fill={
                  // Orange for city where station is placed (active placement)
                  (activePlacementStationId !== undefined && city.id === activePlacementStationId && mode === 'step')
                    ? '#FF8A65' // Orange
                    : state.isActive && mode === 'step' 
                      ? '#FFFFFF' // White for active city
                      : color
                }
                stroke={
                  (activePlacementStationId !== undefined && city.id === activePlacementStationId && mode === 'step')
                    ? '#FF8A65' // Orange border
                    : state.isActive && mode === 'step' 
                      ? '#4DA0E1' // Blue for active city
                      : '#fff'
                }
                strokeWidth={state.isActive && mode === 'step' ? "3" : "2"}
                opacity={opacity}
                className="cursor-pointer transition-all"
                onClick={() => {
                  setSelectedCity(city.id);
                  setSelectedCityInfo(city);
                  onCityClick?.(city.id);
                }}
                onMouseEnter={() => setHoveredCity(city.id)}
                onMouseLeave={() => setHoveredCity(null)}
              />

              {excelMode && weakestCityId === city.id && isFinalSolution && mode === 'static' && (
                <circle
                  cx={transformX(city.x)}
                  cy={transformY(city.y)}
                  r={size + 14}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.95)"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  className="pointer-events-none"
                />
              )}
              
              {/* City name — always visible (static + step), not only for the active city */}
              <text
                x={transformX(city.x)}
                y={transformY(city.y) - size - 8}
                textAnchor="middle"
                className={`pointer-events-none ${
                  mode === 'step' && state.isActive
                    ? 'text-sm font-bold fill-white'
                    : 'text-[11px] font-semibold fill-white'
                }`}
                style={{
                  filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.85))',
                  textShadow: '0 0 4px rgba(0, 0, 0, 0.55)',
                  opacity: mode === 'step' && !state.isActive ? 0.9 : 1,
                }}
              >
                {city.displayName ?? `City ${city.id}`}
              </text>
              
              {/* Power label with deficit/surplus in parentheses - positioned to avoid overlap with "+x added" */}
              {/* Make power labels brighter when power is being added */}
              {!(state.isAffectedByPlacement && mode === 'step' && activePlacementStationId !== undefined) && (
                <g>
                  <motion.rect
                    x={transformX(city.x) - 28}
                    y={transformY(city.y) + size + 5}
                    width={56}
                    height={14}
                    rx="7"
                    fill={deficitStatus && deficitStatus.value < 0 
                      ? "rgba(244, 67, 54, 0.25)" // Light red background for negative (below target)
                      : deficitStatus && deficitStatus.value > 0
                      ? "rgba(76, 175, 80, 0.25)" // Light green background for positive (above target)
                      : "rgba(0, 0, 0, 0.7)"} // Default dark for zero
                    stroke={deficitStatus && deficitStatus.value < 0 
                      ? "rgba(244, 67, 54, 0.4)" // Light red border for negative
                      : deficitStatus && deficitStatus.value > 0
                      ? "rgba(76, 175, 80, 0.4)" // Light green border for positive
                      : "rgba(255, 255, 255, 0.3)"} // Default border for zero
                    strokeWidth="1"
                    className="pointer-events-none"
                    animate={{
                      opacity: state.isAffectedByPlacement && placementAnimationPhase === 'animating' ? [0.7, 1, 0.7] : 1,
                      filter: state.isAffectedByPlacement && placementAnimationPhase === 'animating' 
                        ? ['drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))', 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))', 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))']
                        : 'none'
                    }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                  <motion.text
                    x={transformX(city.x)}
                    y={transformY(city.y) + size + 14}
                    textAnchor="middle"
                    className="text-[10px] font-semibold fill-white pointer-events-none"
                    animate={{
                      opacity: state.isAffectedByPlacement && placementAnimationPhase === 'animating' ? [0.8, 1, 0.8] : 1,
                    }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    {excelMode ? Math.floor(effectivePower) : effectivePower}
                    {excelMode && city.demand !== undefined ? (
                      <tspan className="text-[10px] fill-text-secondary">
                        {' '}
                        D:{Math.floor(city.demand)} (Δ
                        {effectivePower >= city.demand ? '+' : ''}
                        {Math.floor(effectivePower - city.demand)})
                      </tspan>
                    ) : (
                      targetPower !== undefined && (
                        <tspan className="text-[10px] fill-text-secondary">
                          {' '}({deficitStatus && deficitStatus.meets ? '+' : ''}{deficitStatus?.value || 0})
                        </tspan>
                      )
                    )}
                  </motion.text>
                </g>
              )}
              
              {/* Power label for affected cities - keep in normal position (below), not above */}
              {state.isAffectedByPlacement && mode === 'step' && activePlacementStationId !== undefined && (
                <g>
                  <motion.rect
                    x={transformX(city.x) - 28}
                    y={transformY(city.y) + size + 5}
                    width={56}
                    height={14}
                    rx="7"
                    fill={deficitStatus && deficitStatus.value < 0 
                      ? "rgba(244, 67, 54, 0.25)" // Light red background for negative (below target)
                      : deficitStatus && deficitStatus.value > 0
                      ? "rgba(76, 175, 80, 0.25)" // Light green background for positive (above target)
                      : "rgba(0, 0, 0, 0.7)"} // Default dark for zero
                    stroke={deficitStatus && deficitStatus.value < 0 
                      ? "rgba(244, 67, 54, 0.4)" // Light red border for negative
                      : deficitStatus && deficitStatus.value > 0
                      ? "rgba(76, 175, 80, 0.4)" // Light green border for positive
                      : "rgba(255, 255, 255, 0.3)"} // Default border for zero
                    strokeWidth="1"
                    className="pointer-events-none"
                    animate={{
                      opacity: placementAnimationPhase === 'animating' ? [0.7, 1, 0.7] : 1,
                      filter: placementAnimationPhase === 'animating' 
                        ? ['drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))', 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))', 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))']
                        : 'none'
                    }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <motion.text
                    x={transformX(city.x)}
                    y={transformY(city.y) + size + 14}
                    textAnchor="middle"
                    className="text-[10px] font-semibold fill-white pointer-events-none"
                    animate={{
                      opacity: placementAnimationPhase === 'animating' ? [0.8, 1, 0.8] : 1,
                    }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    {excelMode ? Math.floor(effectivePower) : effectivePower}
                    {targetPower !== undefined && (
                      <tspan className="text-[10px] fill-text-secondary">
                        {' '}({deficitStatus && deficitStatus.meets ? '+' : ''}{deficitStatus?.value || 0})
                      </tspan>
                    )}
                  </motion.text>
                </g>
              )}
              
              {/* Check mark for cities that meet or exceed target (in step mode when checking) */}
              {deficitStatus && deficitStatus.meets && mode === 'step' && state.isActive && (
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <circle
                    cx={transformX(city.x)}
                    cy={transformY(city.y) - size - 8}
                    r="10"
                    fill="rgba(102, 187, 106, 0.9)"
                    stroke="#66BB6A"
                    strokeWidth="2"
                    className="pointer-events-none"
                  />
                  <text
                    x={transformX(city.x)}
                    y={transformY(city.y) - size - 5}
                    textAnchor="middle"
                    className="text-sm font-bold fill-white pointer-events-none"
                  >
                    ✓
                  </text>
                </motion.g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Map Controls - Top right, compact */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-30">
        <button
          onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
          className="glass-card px-2.5 py-1.5 rounded-lg border border-dark-border hover:border-accent-blue transition-colors text-xs font-semibold shadow-md"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
          className="glass-card px-2.5 py-1.5 rounded-lg border border-dark-border hover:border-accent-blue transition-colors text-xs font-semibold shadow-md"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleFitToCities}
          className="glass-card px-2.5 py-1.5 rounded-lg border border-dark-border hover:border-accent-blue transition-colors text-[10px] font-semibold shadow-md"
          title="Fit to all cities"
        >
          Fit
        </button>
      </div>

      {/* Collapsed Legend Panel - Below Map */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        {/* Collapsed Button */}
        {!isLegendExpanded && (
          <button
            onClick={() => setIsLegendExpanded(true)}
            className="w-full py-1.5 px-3 bg-slate-800/60 backdrop-blur-sm border-t border-slate-700/50 hover:bg-slate-700/60 transition-colors flex items-center justify-center gap-2 text-xs text-text-secondary hover:text-text-primary"
          >
            <span className="text-sm">ℹ</span>
            <span className="font-medium">Legend</span>
          </button>
        )}

        {/* Expanded Legend Strip */}
        <AnimatePresence>
          {isLegendExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-800/80 backdrop-blur-sm border-t border-slate-700/50 overflow-hidden"
            >
              <div className="px-4 py-2.5 flex items-center justify-center gap-6 flex-wrap">
                {/* Close button */}
                <button
                  onClick={() => setIsLegendExpanded(false)}
                  className="absolute top-2 right-2 text-text-secondary hover:text-text-primary transition-colors text-xs"
                  title="Close legend"
                >
                  ✕
                </button>

                {/* Step Mode Legend Items */}
                {mode === 'step' && (
                  <>
                    {/* Active City */}
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                      <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-dashed bg-blue-400/10"></div>
                      <span>Active city</span>
                    </div>

                    {/* Cities in Range */}
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                      <div className="w-3 h-3 rounded-full border border-green-400 border-dashed bg-green-400/10"></div>
                      <span>Within range (r)</span>
                    </div>

                    {/* Station Placement */}
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                      <span className="text-orange-400 text-sm">⚡</span>
                      <span>Station placed</span>
                    </div>

                    {/* +X Bubble */}
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                      <div className="px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[9px] font-semibold">
                        +X
                      </div>
                      <span>Power added (step)</span>
                    </div>
                  </>
                )}

                {/* Final Mode Legend Items */}
                {mode === 'static' && (
                  <>
                    {/* Meets Target */}
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                      <div className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500/50"></div>
                      <span>Meets target</span>
                    </div>

                    {/* Below Target */}
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                      <div className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500/50"></div>
                      <span>Below target</span>
                    </div>

                    {/* Station Placement */}
                    {isFinalSolution && allPlacements.length > 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                        <span className="text-orange-400 text-sm">⚡</span>
                        <span>Station placement</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
