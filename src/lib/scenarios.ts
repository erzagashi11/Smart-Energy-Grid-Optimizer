import { Scenario } from './types';

export const scenarios: Scenario[] = [
  {
    name: 'Urban Grid',
    description: 'Dense city with high station density',
    stations: [4, 2, 1, 3, 5, 2, 4, 3, 1, 2],
    r: 2,
    k: 5,
    color: 'blue',
  },
  {
    name: 'Rural Area',
    description: 'Sparse distribution with wide coverage needed',
    stations: [1, 0, 2, 1, 0, 1, 2, 0, 1, 0],
    r: 3,
    k: 8,
    color: 'green',
  },
  {
    name: 'Industrial Zone',
    description: 'Mixed high and low power regions',
    stations: [5, 1, 6, 2, 3, 4, 1, 5, 2, 3],
    r: 1,
    k: 4,
    color: 'orange',
  },
];
