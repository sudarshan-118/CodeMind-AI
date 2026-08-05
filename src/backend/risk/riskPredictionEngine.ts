import type {
  RiskPrediction,
  FileAnalysisResult,
  DependencyMetrics,
  Finding
} from '../shared/types';


export class RiskPredictionEngine {
  /**
   * Run deterministic risk prediction algorithms across repository artifacts
   */
  public static predictRisks(
    projectId: string,
    files: FileAnalysisResult[],
    depMetrics: DependencyMetrics,
    findings: Finding[]
  ): RiskPrediction[] {
    const predictions: RiskPrediction[] = [];
    void projectId;

    for (const file of files) {
      if (!file.isCode) continue;

      const loc = file.parseResult?.linesOfCode || 0;
      const complexity = file.metrics.complexityScore;
      const instability = depMetrics.instability[file.path] || 0;
      const efferent = depMetrics.efferentCoupling[file.path] || 0;
      const afferent = depMetrics.afferentCoupling[file.path] || 0;
      const fileFindings = findings.filter(f => f.file === file.path);

      // Algorithm 1: Hotspot File Detection
      if (loc > 150 && file.metrics.overallRiskScore > 40) {
        const score = Math.min(100, Math.round((loc / 500) * 40 + complexity * 0.6));
        predictions.push({
          file: file.path,
          riskType: 'hotspot',
          score,
          explanation: `Hotspot Risk: File is ${loc} lines with complexity score of ${complexity}/100. High likelihood of defect accumulation.`,
          metrics: { linesOfCode: loc, complexityScore: complexity }
        });
      }

      // Algorithm 2: Volatility / Instability Risk
      if (instability >= 0.75 && efferent >= 3) {
        const score = Math.min(100, Math.round(instability * 80 + efferent * 4));
        predictions.push({
          file: file.path,
          riskType: 'volatility',
          score,
          explanation: `High Instability Risk: Instability index is ${instability} (depends on ${efferent} external modules). Changes to dependencies will break this file.`,
          metrics: { instability, efferentCoupling: efferent }
        });
      }

      // Algorithm 3: Bug Magnet Prediction
      const criticalOrHighCount = fileFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length;
      if (criticalOrHighCount >= 2) {
        const score = Math.min(100, criticalOrHighCount * 25 + 30);
        predictions.push({
          file: file.path,
          riskType: 'bug_magnet',
          score,
          explanation: `Bug Magnet Risk: ${criticalOrHighCount} critical/high findings detected in current & past scans. High defect density cluster.`,
          metrics: { findingCount: fileFindings.length, criticalOrHighCount }
        });
      }

      // Algorithm 4: Excessive Architectural Coupling Warning
      if (efferent > 6 || (afferent > 5 && efferent > 5)) {
        const score = Math.min(100, (efferent + afferent) * 8);
        predictions.push({
          file: file.path,
          riskType: 'coupling_warning',
          score,
          explanation: `Architectural Coupling Risk: High Fan-In (${afferent}) and Fan-Out (${efferent}). Violates single responsibility principle.`,
          metrics: { afferentCoupling: afferent, efferentCoupling: efferent }
        });
      }
    }

    return predictions.sort((a, b) => b.score - a.score);
  }
}
