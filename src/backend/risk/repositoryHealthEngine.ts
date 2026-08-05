import type {
  RepositoryHealthResult,
  RepositoryScore,
  RiskPrediction,
  FileAnalysisResult,
  RiskSeverity
} from '../shared/types';

export class RepositoryHealthEngine {
  /**
   * Compute composite Repository Health Score & Action Priority Rankings
   */
  public static calculateHealth(
    repoScore: RepositoryScore,
    predictions: RiskPrediction[],
    files: FileAnalysisResult[],
    trendDelta = 0
  ): RepositoryHealthResult {
    // 1. Metric Breakdown Weights
    const complexity = repoScore.overallScore;
    const architecture = repoScore.architectureScore;
    const security = repoScore.securityScore;
    const maintainability = repoScore.maintainabilityScore;
    const testing = repoScore.testingScore;
    const documentation = repoScore.documentationScore;
    const dependency = 85;

    // Apply Prediction Risk Penalty
    const avgPredictionRisk = predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.score, 0) / predictions.length
      : 0;
    const predictionPenalty = Math.round(avgPredictionRisk * 0.15);

    // Composite Weighted Calculation
    const rawHealth = Math.round(
      security * 0.30 +
      architecture * 0.20 +
      maintainability * 0.20 +
      complexity * 0.10 +
      testing * 0.10 +
      documentation * 0.10 +
      trendDelta -
      predictionPenalty
    );

    const overallHealth = Math.max(0, Math.min(100, rawHealth));

    // Determine Risk Level
    let riskLevel: RiskSeverity = 'safe';
    if (overallHealth < 50 || security < 50) riskLevel = 'critical';
    else if (overallHealth < 65 || security < 70) riskLevel = 'high';
    else if (overallHealth < 80) riskLevel = 'medium';

    // Confidence Score (based on files analyzed & parse completeness)
    const codeFilesCount = files.filter(f => f.isCode).length;
    const confidence = Math.min(99, Math.max(70, Math.round(80 + (codeFilesCount > 5 ? 15 : codeFilesCount * 2))));

    // Action Priority Ranking
    const priorityMap = new Map<string, { priority: number; reasons: string[] }>();

    // Rank from findings
    files.forEach(f => {
      const critCount = f.findings.filter(i => i.severity === 'critical').length;
      const highCount = f.findings.filter(i => i.severity === 'high').length;

      if (critCount > 0 || highCount > 0) {
        const score = critCount * 40 + highCount * 15;
        priorityMap.set(f.path, {
          priority: score,
          reasons: [`Contains ${critCount} critical and ${highCount} high severity security issues.`]
        });
      }
    });

    // Rank from predictions
    predictions.forEach(p => {
      const existing = priorityMap.get(p.file);
      const prio = (existing?.priority || 0) + p.score * 0.5;
      const reasons = existing?.reasons || [];
      reasons.push(p.explanation);
      priorityMap.set(p.file, { priority: prio, reasons });
    });

    const priorityRanking = Array.from(priorityMap.entries())
      .map(([file, data]) => ({
        file,
        priority: Math.min(100, Math.round(data.priority)),
        reason: data.reasons[0]
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);

    return {
      overallHealth,
      riskLevel,
      confidence,
      priorityRanking,
      metricBreakdown: {
        complexity,
        architecture,
        security,
        maintainability,
        testing,
        documentation,
        dependency,
        trendModifier: trendDelta
      }
    };
  }
}
