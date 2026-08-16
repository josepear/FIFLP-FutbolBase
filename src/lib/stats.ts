import { TEST_DEFINITIONS, type TestType } from './types';

export function bestOf(values: number[], higherIsBetter: boolean): number | null {
  if (values.length === 0) return null;
  return higherIsBetter ? Math.max(...values) : Math.min(...values);
}

export function avgOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function improvementPct(prev: number, last: number, higherIsBetter: boolean): number {
  if (prev === 0) return 0;
  return ((last - prev) / Math.abs(prev)) * 100 * (higherIsBetter ? 1 : -1);
}

export function percentileOf(value: number, peers: number[], higherIsBetter: boolean): number | null {
  if (peers.length === 0) return null;
  const worseCount = higherIsBetter ? peers.filter(v => v < value).length : peers.filter(v => v > value).length;
  return Math.round((worseCount / peers.length) * 100);
}

export function unitLabel(testType: TestType): string {
  const d = TEST_DEFINITIONS[testType];
  switch (d.unit) {
    case 'seconds': return 's';
    case 'meters': return 'm';
    case 'cm': return 'cm';
    case 'level': return 'nivel';
    case 'points': return 'pts';
    default: return '';
  }
}

export function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
