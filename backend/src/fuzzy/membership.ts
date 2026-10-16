import type { FuzzySetDefinition } from './types.js';

/**
 * Evaluates trapezoidal membership function with degenerate shoulder support.
 * @param x Input crisp value
 * @param a Left foot
 * @param b Left shoulder
 * @param c Right shoulder
 * @param d Right foot
 */
export function trapezoid(x: number, a: number, b: number, c: number, d: number): number {
  // Degenerate left shoulder: a === b (e.g. [0, 0, 1, 3])
  if (a === b && x <= a) {
    return 1.0;
  }

  // Degenerate right shoulder: c === d (e.g. [4, 7, 10, 10])
  if (c === d && x >= d) {
    return 1.0;
  }

  // Left of support
  if (x < a) {
    return 0.0;
  }

  // Rising slope
  if (x < b) {
    if (b === a) return 1.0;
    return Math.max(0.0, Math.min(1.0, (x - a) / (b - a)));
  }

  // Plateau
  if (x <= c) {
    return 1.0;
  }

  // Falling slope
  if (x <= d) {
    if (d === c) return 1.0;
    return Math.max(0.0, Math.min(1.0, (d - x) / (d - c)));
  }

  // Right of support
  return 0.0;
}

/**
 * Evaluates triangular membership function.
 * @param x Input crisp value
 * @param a Left foot
 * @param b Peak
 * @param c Right foot
 */
export function triangle(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) {
    return 0.0;
  }

  if (x === b) {
    return 1.0;
  }

  // Rising slope
  if (x < b) {
    if (b === a) return 1.0;
    return Math.max(0.0, Math.min(1.0, (x - a) / (b - a)));
  }

  // Falling slope
  if (c === b) return 1.0;
  return Math.max(0.0, Math.min(1.0, (c - x) / (c - b)));
}

/**
 * Evaluates membership of x in a defined fuzzy set
 */
export function evaluateSetMembership(x: number, set: FuzzySetDefinition): number {
  if (set.type === 'trapezoid') {
    const [a = 0, b = 0, c = 0, d = 0] = set.params;
    return trapezoid(x, a, b, c, d);
  }

  if (set.type === 'triangle') {
    const [a = 0, b = 0, c = 0] = set.params;
    return triangle(x, a, b, c);
  }

  return 0.0;
}
