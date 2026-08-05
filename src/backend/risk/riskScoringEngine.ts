// Risk Scoring Engine
import type { Finding, FileRiskMetrics, FolderScore, RepositoryScore, RiskSeverity, ScoringConfig } from '../shared/types';
import { DEFAULT_SCORING_CONFIG } from './defaultWeights';

export class RiskScoringEngine {
  private config: ScoringConfig;

  constructor(config: ScoringConfig = DEFAULT_SCORING_CONFIG) {
    this.config = config;
  }

  public computeFileMetrics(findings: Finding[], _linesOfCode: number, _commentLines: number): FileRiskMetrics {
    const penalties = this.config.severityPenalties;
    const weights = this.config.weights;

    const secFindings = findings.filter(f => f.category === 'security');
    const archFindings = findings.filter(f => f.category === 'architecture');
    const compFindings = findings.filter(f => f.category === 'complexity');
    const smellFindings = findings.filter(f => f.category === 'smell' || f.category === 'maintainability');
    const docFindings = findings.filter(f => f.category === 'documentation');
    const depFindings = findings.filter(f => f.category === 'dependency');

    const sumPenalty = (list: Finding[]) =>
      list.reduce((acc, f) => acc + (penalties[f.severity] || 5), 0);

    const securityScore = Math.max(0, 100 - sumPenalty(secFindings));
    const architectureScore = Math.max(0, 100 - sumPenalty(archFindings));
    const complexityScore = Math.max(0, 100 - sumPenalty(compFindings));
    const maintainabilityScore = Math.max(0, 100 - sumPenalty(smellFindings));
    const documentationScore = Math.max(0, 100 - sumPenalty(docFindings));
    const dependencyScore = Math.max(0, 100 - sumPenalty(depFindings));
    const testingScore = 75;

    const overallQualityScore = Math.round(
      securityScore * weights.security +
      architectureScore * weights.architecture +
      complexityScore * weights.complexity +
      maintainabilityScore * weights.maintainability +
      testingScore * weights.testing +
      dependencyScore * weights.dependency +
      documentationScore * weights.documentation
    );

    const overallRiskScore = 100 - overallQualityScore;

    let riskState: RiskSeverity = 'safe';
    if (secFindings.some(f => f.severity === 'critical') || overallRiskScore >= 60) {
      riskState = 'critical';
    } else if (secFindings.some(f => f.severity === 'high') || overallRiskScore >= 40) {
      riskState = 'high';
    } else if (overallRiskScore >= 20) {
      riskState = 'medium';
    }

    return {
      complexityScore,
      securityScore,
      maintainabilityScore,
      architectureScore,
      testingScore,
      documentationScore,
      dependencyScore,
      overallRiskScore,
      riskState
    };
  }

  public aggregateFolderScores(files: { path: string; metrics: FileRiskMetrics }[]): FolderScore[] {
    const folderMap = new Map<string, FileRiskMetrics[]>();

    files.forEach(f => {
      const parts = f.path.replace(/\\/g, '/').split('/');
      if (parts.length > 1) {
        const folderPath = parts.slice(0, parts.length - 1).join('/');
        if (!folderMap.has(folderPath)) {
          folderMap.set(folderPath, []);
        }
        folderMap.get(folderPath)!.push(f.metrics);
      }
    });

    const folderScores: FolderScore[] = [];

    folderMap.forEach((metricsList, path) => {
      const count = metricsList.length;
      const avg = (fn: (m: FileRiskMetrics) => number) =>
        Math.round(metricsList.reduce((acc, m) => acc + fn(m), 0) / count);

      const metrics: FileRiskMetrics = {
        complexityScore: avg(m => m.complexityScore),
        securityScore: avg(m => m.securityScore),
        maintainabilityScore: avg(m => m.maintainabilityScore),
        architectureScore: avg(m => m.architectureScore),
        testingScore: avg(m => m.testingScore),
        documentationScore: avg(m => m.documentationScore),
        dependencyScore: avg(m => m.dependencyScore),
        overallRiskScore: avg(m => m.overallRiskScore),
        riskState: metricsList.some(m => m.riskState === 'critical') ? 'critical'
                 : metricsList.some(m => m.riskState === 'high') ? 'high'
                 : metricsList.some(m => m.riskState === 'medium') ? 'medium' : 'safe'
      };

      folderScores.push({ path, metrics, fileCount: count });
    });

    return folderScores;
  }

  public aggregateRepositoryScore(fileMetrics: FileRiskMetrics[]): RepositoryScore {
    if (fileMetrics.length === 0) {
      return {
        overallScore: 100,
        securityScore: 100,
        architectureScore: 100,
        performanceScore: 100,
        maintainabilityScore: 100,
        testingScore: 100,
        documentationScore: 100,
        overallRiskState: 'safe'
      };
    }

    const count = fileMetrics.length;
    const avg = (fn: (m: FileRiskMetrics) => number) =>
      Math.round(fileMetrics.reduce((acc, m) => acc + fn(m), 0) / count);

    const securityScore = avg(m => m.securityScore);
    const architectureScore = avg(m => m.architectureScore);
    const maintainabilityScore = avg(m => m.maintainabilityScore);
    const testingScore = avg(m => m.testingScore);
    const documentationScore = avg(m => m.documentationScore);
    const performanceScore = avg(m => m.complexityScore);

    const overallScore = Math.round(
      securityScore * 0.35 +
      architectureScore * 0.25 +
      maintainabilityScore * 0.20 +
      performanceScore * 0.20
    );

    let overallRiskState: RiskSeverity = 'safe';
    if (fileMetrics.some(m => m.riskState === 'critical') || overallScore < 60) {
      overallRiskState = 'critical';
    } else if (fileMetrics.some(m => m.riskState === 'high') || overallScore < 75) {
      overallRiskState = 'high';
    } else if (overallScore < 90) {
      overallRiskState = 'medium';
    }

    return {
      overallScore,
      securityScore,
      architectureScore,
      performanceScore,
      maintainabilityScore,
      testingScore,
      documentationScore,
      overallRiskState
    };
  }
}
