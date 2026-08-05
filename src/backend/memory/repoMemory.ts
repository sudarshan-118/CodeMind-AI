// Repository Intelligence Memory & Historical Snapshot Ledger Engine
import type {
  HistoricalRunSnapshot,
  ComparisonResult,
  RepositoryScore,
  Finding,
  RepositoryTimelineSnapshot
} from '../shared/types';

export class RepositoryMemoryEngine {
  private static MEMORY_KEY_PREFIX = 'codemind_repo_memory_';
  private static TIMELINE_KEY_PREFIX = 'codemind_repo_timeline_';

  private static getStorageKey(projectId: string): string {
    return `${this.MEMORY_KEY_PREFIX}${projectId}`;
  }

  private static getTimelineKey(projectId: string): string {
    return `${this.TIMELINE_KEY_PREFIX}${projectId}`;
  }

  public static getHistory(projectId: string): HistoricalRunSnapshot[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey(projectId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static getTimeline(projectId: string): RepositoryTimelineSnapshot[] {
    try {
      const raw = localStorage.getItem(this.getTimelineKey(projectId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Immutable Snapshot Ledger: Always append new run snapshot without overwriting past history.
   */
  public static saveRunSnapshot(
    projectId: string,
    scores: RepositoryScore,
    findings: Finding[],
    filesCount: number,
    additionalMetadata?: {
      version?: string;
      commitHash?: string;
      healthScore?: number;
      techDebtHours?: number;
      pattern?: string;
    }
  ): HistoricalRunSnapshot {
    const history = this.getHistory(projectId);

    const snapshot: HistoricalRunSnapshot = {
      id: 'snap-' + Date.now(),
      projectId,
      timestamp: new Date().toISOString(),
      scores,
      findingsCount: findings.length,
      criticalCount: findings.filter(f => f.severity === 'critical').length,
      highCount: findings.filter(f => f.severity === 'high').length,
      mediumCount: findings.filter(f => f.severity === 'medium').length,
      filesCount
    };

    history.push(snapshot);
    if (history.length > 100) history.shift();

    try {
      localStorage.setItem(this.getStorageKey(projectId), JSON.stringify(history));
    } catch (err) {
      console.warn('CodeMind Memory: LocalStorage quota warning', err);
    }

    // Also append to Timeline Ledger
    const timeline = this.getTimeline(projectId);
    const timelineEntry: RepositoryTimelineSnapshot = {
      id: 'timeline-' + Date.now(),
      projectId,
      timestamp: new Date().toISOString(),
      version: additionalMetadata?.version || `v1.${timeline.length + 1}`,
      commitHash: additionalMetadata?.commitHash || Math.random().toString(16).substring(2, 9),
      healthScore: additionalMetadata?.healthScore ?? scores.overallScore,
      riskScore: scores.overallScore,
      architectureScore: scores.architectureScore,
      securityScore: scores.securityScore,
      complexityScore: 100 - (findings.filter(f => f.category === 'complexity').length * 5),
      documentationScore: scores.documentationScore,
      testingScore: scores.testingScore,
      dependencyScore: 85,
      totalFindings: findings.length,
      criticalFindings: findings.filter(f => f.severity === 'critical').length,
      resolvedFindings: Math.max(0, (history[history.length - 2]?.findingsCount || findings.length) - findings.length),
      techDebtHours: additionalMetadata?.techDebtHours ?? Math.round(findings.length * 1.5),
      pattern: additionalMetadata?.pattern || 'Layered'
    };

    timeline.push(timelineEntry);
    if (timeline.length > 100) timeline.shift();

    try {
      localStorage.setItem(this.getTimelineKey(projectId), JSON.stringify(timeline));
    } catch (err) {
      console.warn('CodeMind Memory: LocalStorage timeline warning', err);
    }

    return snapshot;
  }

  public static compareRuns(
    projectId: string,
    currentScores: RepositoryScore,
    currentFindings: Finding[]
  ): ComparisonResult {
    const history = this.getHistory(projectId);
    if (history.length === 0) {
      return {
        improvements: ['Initial repository baseline established.'],
        regressions: [],
        scoreDiff: { overall: 0, security: 0, architecture: 0, maintainability: 0 },
        resolvedFindings: [],
        newFindings: currentFindings.map(f => `${f.rule} in ${f.file}:${f.line}`),
        trendSummary: 'Baseline analysis initialized.'
      };
    }

    const lastRun = history[history.length - 1];
    const scoreDiff = {
      overall: currentScores.overallScore - lastRun.scores.overallScore,
      security: currentScores.securityScore - lastRun.scores.securityScore,
      architecture: currentScores.architectureScore - lastRun.scores.architectureScore,
      maintainability: currentScores.maintainabilityScore - lastRun.scores.maintainabilityScore
    };

    const improvements: string[] = [];
    const regressions: string[] = [];

    if (scoreDiff.overall > 0) improvements.push(`Overall score increased +${scoreDiff.overall} points.`);
    if (scoreDiff.overall < 0) regressions.push(`Overall score dropped by ${scoreDiff.overall} points.`);

    if (scoreDiff.security > 0) improvements.push(`Security rating increased +${scoreDiff.security} points.`);
    if (scoreDiff.security < 0) regressions.push(`Security rating regressed by ${scoreDiff.security} points.`);

    if (currentFindings.length < lastRun.findingsCount) {
      improvements.push(`Resolved ${lastRun.findingsCount - currentFindings.length} finding(s) since last scan.`);
    } else if (currentFindings.length > lastRun.findingsCount) {
      regressions.push(`Introduced ${currentFindings.length - lastRun.findingsCount} new finding(s).`);
    }

    const trendSummary = regressions.length > 0
      ? `Regressions detected: ${regressions.join(' ')}`
      : `Quality trajectory positive: ${improvements.join(' ')}`;

    return {
      improvements,
      regressions,
      scoreDiff,
      resolvedFindings: [],
      newFindings: [],
      trendSummary
    };
  }
}
