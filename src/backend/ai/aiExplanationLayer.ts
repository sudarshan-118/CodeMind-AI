// AI Explanation Layer (On-Demand AI Assistant for Explaining Findings)
import type { Finding } from '../shared/types';

export interface AIExplanationResult {
  explanation: string;
  suggestedFix: string;
  codePatch?: string;
  graphImpactSummary?: string;
}

export class AIExplanationLayer {
  private static getApiKeys(): string[] {
    return [
      import.meta.env.VITE_GROQ_API_KEY,
      import.meta.env.VITE_GROQ_API_KEY_FALLBACK,
      import.meta.env.VITE_GROQ_API_KEY_3,
      import.meta.env.VITE_GROQ_API_KEY_4
    ].filter((k): k is string => typeof k === 'string' && k.trim() !== '');
  }

  public static async explainFinding(
    finding: Finding,
    codeContext: string,
    graphMetadata?: { impactedFiles?: string[]; couplingScore?: number }
  ): Promise<AIExplanationResult> {
    const keys = this.getApiKeys();

    const graphImpactSummary = graphMetadata?.impactedFiles && graphMetadata.impactedFiles.length > 0
      ? `Changes to ${finding.file} potentially impact ${graphMetadata.impactedFiles.length} dependent module(s): ${graphMetadata.impactedFiles.slice(0, 3).join(', ')}.`
      : 'Isolated finding with localized file impact.';

    if (keys.length === 0) {
      return {
        explanation: finding.explanation,
        suggestedFix: finding.recommendedFix,
        codePatch: `// Refactor: ${finding.recommendedFix}\n// Location: ${finding.file}:${finding.line}`,
        graphImpactSummary
      };
    }

    const systemPrompt = `You are CodeMind AI Explanation Assistant.
Your ONLY role is to explain a specific deterministic finding and provide a clean code fix.
NEVER analyze whole repositories directly or alter findings.
Return ONLY valid JSON with keys: "explanation", "suggestedFix", "codePatch"`;

    const userPrompt = `Finding: ${finding.rule} (${finding.severity})
File: ${finding.file}:${finding.line}
Rule Explanation: ${finding.explanation}
Graph Impact Context: ${graphImpactSummary}

Code Context:
\`\`\`
${codeContext.slice(0, 2000)}
\`\`\``;

    for (const key of keys) {
      try {
        const baseUrl = import.meta.env.DEV ? '/api-groq' : 'https://api.groq.com';
        const res = await fetch(`${baseUrl}/openai/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        });

        if (res.ok) {
          const data = await res.json();
          let content = data.choices?.[0]?.message?.content ?? '{}';
          const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (match) content = match[1].trim();

          const parsed = JSON.parse(content);
          return {
            explanation: parsed.explanation || finding.explanation,
            suggestedFix: parsed.suggestedFix || finding.recommendedFix,
            codePatch: parsed.codePatch || `// ${finding.recommendedFix}`,
            graphImpactSummary
          };
        }
      } catch (err) {
        console.warn('AI Explanation Layer: Key attempt failed', err);
      }
    }

    return {
      explanation: finding.explanation,
      suggestedFix: finding.recommendedFix,
      codePatch: `// Refactor: ${finding.recommendedFix}`,
      graphImpactSummary
    };
  }
}
