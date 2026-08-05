// Configurable Risk Scoring Weights and Penalties
import type { ScoringConfig } from '../shared/types';

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    security: 0.30,
    architecture: 0.20,
    complexity: 0.15,
    maintainability: 0.15,
    testing: 0.10,
    dependency: 0.05,
    documentation: 0.05
  },
  severityPenalties: {
    critical: 45,
    high: 25,
    medium: 12,
    safe: 5
  },
  thresholds: {
    maxFileLengthWarning: 250,
    maxFunctionLengthWarning: 50,
    maxComplexityWarning: 8,
    minDocCoverageWarning: 0.20
  }
};
