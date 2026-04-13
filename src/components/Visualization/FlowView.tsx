'use client';

import { useMemo } from 'react';
import { computeCityPowersWithPlantPowers } from '@/lib/excel/excelMode';
import type { ParsedCityRow, ParsedPlantRow } from '@/lib/excel/excelMode';

type Connection = { plantIdx: number; cityIdx: number; value: number };

interface FlowViewProps {
  cities: ParsedCityRow[];
  plants: ParsedPlantRow[];
  plantPowers: number[];
  finalCityPowers?: number[] | null;
  strategy: 'simple' | 'real';
}

export default function FlowView({
  cities,
  plants,
  plantPowers,
  finalCityPowers,
  strategy,
}: FlowViewProps) {
  type PlantNode = { id: number; name: string; power: number; radius: number; addedK: number };
  type CityNode = { id: number; name: string; demand: number; power: number; covered_by: Array<{ plant_name: string; contribution: number }> };
  const { plantNodes, cityNodes, connections, maxContribution } = useMemo((): {
    plantNodes: PlantNode[];
    cityNodes: CityNode[];
    connections: Connection[];
    maxContribution: number;
  } => {
    const computed = computeCityPowersWithPlantPowers(cities, plants, plantPowers);
    const contributions: Array<{ plantIdx: number; cityIdx: number; value: number }> = [];
    let maxC = 0;

    computed.forEach((city, cityIdx) => {
      city.covered_by.forEach((cb) => {
        const plantIdx = plants.findIndex((p) => p.plant_name === cb.plant_name);
        if (plantIdx >= 0) {
          contributions.push({ plantIdx, cityIdx, value: cb.contribution });
          if (cb.contribution > maxC) maxC = cb.contribution;
        }
      });
    });

    const cityPowers = finalCityPowers ?? computed.map((c) => c.current_power);

    return {
      plantNodes: plants.map((p: ParsedPlantRow, i: number) => ({
        id: i,
        name: p.plant_name,
        power: plantPowers[i],
        radius: p.radius,
        addedK: strategy === 'real' ? Math.max(0, plantPowers[i] - p.power) : 0,
      })),
      cityNodes: computed.map((c, i) => ({
        id: i,
        name: c.city_name,
        demand: c.demand,
        power: cityPowers[i] ?? c.current_power,
        covered_by: c.covered_by,
      })),
      connections: contributions,
      maxContribution: maxC || 1,
    };
  }, [cities, plants, plantPowers, finalCityPowers, strategy]);

  const width = 800;
  const height = 500;
  const leftCol = 120;
  const rightCol = width - 120;
  const plantYs = plantNodes.map((_, i) => 80 + (i / Math.max(plantNodes.length - 1, 1)) * (height - 160));
  const cityYs = cityNodes.map((_, i) => 80 + (i / Math.max(cityNodes.length - 1, 1)) * (height - 160));

  return (
    <div className="relative w-full min-h-[500px] bg-dark-card/30 rounded-lg p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full min-h-[450px]"
      >
        {connections.map((conn, i) => {
          const { plantIdx, cityIdx, value } = conn;
          const x1 = leftCol;
          const y1 = plantYs[plantIdx];
          const x2 = rightCol;
          const y2 = cityYs[cityIdx];
          const strokeW = Math.max(0.5, (value / maxContribution) * 4);
          const opacity = 0.3 + (value / maxContribution) * 0.5;
          return (
            <line
              key={`${plantIdx}-${cityIdx}-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(77, 160, 225, 0.6)"
              strokeWidth={strokeW}
              opacity={opacity}
            />
          );
        })}

        {plantNodes.map((p, i) => (
          <g key={`plant-${i}`}>
            <circle cx={leftCol} cy={plantYs[i]} r={28} fill="#1e3a5f" stroke="#4DA0E1" strokeWidth="2" />
            <text x={leftCol} y={plantYs[i] - 35} textAnchor="middle" className="text-[10px] fill-white font-semibold">
              {p.name}
            </text>
            <text x={leftCol} y={plantYs[i]} textAnchor="middle" className="text-[9px] fill-white/90">
              {p.power.toFixed(0)} MW
            </text>
            <text x={leftCol} y={plantYs[i] + 12} textAnchor="middle" className="text-[8px] fill-white/60">
              r: {p.radius} km
            </text>
            {p.addedK > 0 && (
              <text x={leftCol} y={plantYs[i] + 24} textAnchor="middle" className="text-[8px] fill-emerald-400">
                +{p.addedK} k
              </text>
            )}
          </g>
        ))}

        {cityNodes.map((c, i) => (
          <g key={`city-${i}`}>
            <circle cx={rightCol} cy={cityYs[i]} r={26} fill="#2d1f3d" stroke="#a78bfa" strokeWidth="2" />
            <text x={rightCol} y={cityYs[i] - 32} textAnchor="middle" className="text-[10px] fill-white font-semibold">
              {c.name}
            </text>
            <text x={rightCol} y={cityYs[i]} textAnchor="middle" className="text-[9px] fill-white/90">
              {c.power.toFixed(0)} / D:{c.demand}
            </text>
            <text x={rightCol} y={cityYs[i] + 12} textAnchor="middle" className="text-[8px] fill-white/60">
              {c.covered_by?.length
                ? c.covered_by!.slice(0, 2).map((x) => `${x.plant_name}: ${x.contribution.toFixed(0)}`).join('; ') +
                  (c.covered_by.length > 2 ? ` +${c.covered_by.length - 2}` : '')
                : '-'}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
