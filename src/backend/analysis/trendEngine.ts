import type { RepositoryTimelineSnapshot } from '../shared/types';
import { RepositoryMemoryEngine } from '../memory/repoMemory';

export class TrendEngine {
  /**
   * Analyze trend delta across historical timeline snapshots
   */
  public static analyzeTrend(projectId: string): {
    qualityTrajectory: 'improving' | 'declining' | 'stable';
    securityTrajectory: 'improving' | 'declining' | 'stable';
    techDebtTrend: 'accumulating' | 'reducing' | 'stable';
    healthDelta: number;
    timeline: RepositoryTimelineSnapshot[];
    summary: string;
  } {
    const timeline = RepositoryMemoryEngine.getTimeline(projectId);

    if (timeline.length < 2) {
      return {
        qualityTrajectory: 'stable',
        securityTrajectory: 'stable',
        techDebtTrend: 'stable',
        healthDelta: 0,
        timeline,
        summary: 'Baseline metrics recorded. Additional scans required for multi-run trend analysis.'
      };
    }

    const latest = timeline[timeline.length - 1];
    const previous = timeline[timeline.length - 2];

    const healthDelta = latest.healthScore - previous.healthScore;
    const secDelta = latest.securityScore - previous.securityScore;
    const debtDelta = latest.techDebtHours - previous.techDebtHours;

    let qualityTrajectory: 'improving' | 'declining' | 'stable' = 'stable';
    if (healthDelta > 2) qualityTrajectory = 'improving';
    else if (healthDelta < -2) qualityTrajectory = 'declining';

    let securityTrajectory: 'improving' | 'declining' | 'stable' = 'stable';
    if (secDelta > 2) securityTrajectory = 'improving';
    else if (secDelta < -2) securityTrajectory = 'declining';

    let techDebtTrend: 'accumulating' | 'reducing' | 'stable' = 'stable';
    if (debtDelta > 1) techDebtTrend = 'accumulating';
    else if (debtDelta < -1) techDebtTrend = 'reducing';

    const summaryParts: string[] = [];
    if (qualityTrajectory === 'improving') summaryParts.push(`Health score improved by +${healthDelta} points.`);
    if (qualityTrajectory === 'declining') summaryParts.push(`Health score declined by ${healthDelta} points.`);
    if (techDebtTrend === 'accumulating') summaryParts.push(`Technical debt increased by +${debtDelta} hours.`);
    if (techDebtTrend === 'reducing') summaryParts.push(`Technical debt reduced by ${Math.abs(debtDelta)} hours.`);

    return {
      qualityTrajectory,
      securityTrajectory,
      techDebtTrend,
      healthDelta,
      timeline,
      summary: summaryParts.join(' ') || 'Repository quality metrics stable across scans.'
    };
  }
}
