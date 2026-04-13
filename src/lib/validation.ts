export interface ValidationErrors {
  n?: string;
  stations?: string;
  r?: string;
  k?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

export function validateInput(input: {
  stations: number[];
  r: number;
  k: number;
}): ValidationResult {
  const errors: ValidationErrors = {};
  const n = input.stations.length;

  // Validate n (Number of Cities)
  if (n === 0) {
    errors.n = 'Number of cities cannot be 0';
  } else if (n < 0) {
    errors.n = 'Number of cities cannot be negative';
  } else if (n > 1000) {
    errors.n = 'Number of cities cannot exceed 1000';
  }

  // Validate stations array
  if (input.stations.length === 0) {
    errors.stations = 'Stations array cannot be empty';
  } else {
    // Check for NaN values
    const hasNaN = input.stations.some(val => isNaN(val));
    if (hasNaN) {
      errors.stations = 'Stations must be valid numbers';
    }

    // Check for negative values
    const hasNegative = input.stations.some(val => val < 0);
    if (hasNegative) {
      errors.stations = 'Stations cannot have negative values';
    }

    // Check for non-integers
    const hasNonInteger = input.stations.some(val => val !== Math.floor(val));
    if (hasNonInteger) {
      errors.stations = 'Stations must be integers';
    }

    // Check length match - stations array length should match n
    if (input.stations.length !== n) {
      errors.stations = `Number of cities (${n}) must match the number of station values provided (${input.stations.length})`;
    }
  }

  // Validate r (Range)
  if (input.r < 0) {
    errors.r = 'Range must be non-negative';
  } else if (n > 0 && input.r >= n) {
    errors.r = `Range must be between 0 and n-1 (0 to ${n - 1})`;
  }

  // Validate k (Additional Stations)
  if (input.k < 0) {
    errors.k = 'Additional stations must be non-negative';
  } else if (input.k !== Math.floor(input.k)) {
    errors.k = 'Additional stations must be an integer';
  } else if (input.k > 1000000000) {
    errors.k = 'Additional stations value is too large';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
