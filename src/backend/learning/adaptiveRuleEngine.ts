// Statistical Adaptive Rule Engine (100% Deterministic Learning System)
import type { AdaptiveRuleWeight } from '../shared/types';

export class AdaptiveRuleEngine {
  private static STORAGE_KEY = 'codemind_adaptive_rule_weights';

  private static getRuleWeights(): Map<string, AdaptiveRuleWeight> {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const list: AdaptiveRuleWeight[] = JSON.parse(raw);
        return new Map(list.map(w => [w.ruleId, w]));
      }
    } catch {
      // Fallback
    }
    return new Map();
  }

  private static saveRuleWeights(map: Map<string, AdaptiveRuleWeight>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(map.values())));
    } catch (err) {
      console.warn('CodeMind Adaptive Learning: Could not persist weights', err);
    }
  }

  public static getAdjustedWeight(ruleId: string, _category: string, baseWeight: number): number {
    const weights = this.getRuleWeights();
    const entry = weights.get(ruleId);
    if (!entry) return baseWeight;

    const frequencyFactor = Math.min(2.0, 1 + (entry.occurrenceCount * 0.05));
    const resolutionFactor = entry.acceptedFixCount > 0 ? 0.8 : 1.0;

    return Math.round(baseWeight * frequencyFactor * resolutionFactor * entry.userOverrideMultiplier * 100) / 100;
  }

  public static recordRuleOccurrences(ruleIds: { ruleId: string; category: string }[]): void {
    const weights = this.getRuleWeights();

    ruleIds.forEach(({ ruleId, category }) => {
      const existing = weights.get(ruleId) || {
        ruleId,
        ruleCategory: category,
        baseWeight: 1.0,
        adjustedWeight: 1.0,
        occurrenceCount: 0,
        acceptedFixCount: 0,
        userOverrideMultiplier: 1.0
      };

      existing.occurrenceCount += 1;
      existing.adjustedWeight = this.getAdjustedWeight(ruleId, category, existing.baseWeight);
      weights.set(ruleId, existing);
    });

    this.saveRuleWeights(weights);
  }

  public static recordAcceptedFix(ruleId: string): void {
    const weights = this.getRuleWeights();
    const existing = weights.get(ruleId);
    if (existing) {
      existing.acceptedFixCount += 1;
      weights.set(ruleId, existing);
      this.saveRuleWeights(weights);
    }
  }
}
