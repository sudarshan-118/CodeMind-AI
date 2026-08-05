// Architecture Analysis Engine
import type { Finding, ParseResult } from '../shared/types';

export class ArchitectureAnalyzer {
  private static mkId(): string {
    return 'arch-' + Math.random().toString(36).substr(2, 9);
  }

  public static detectCircularDependencies(parsedFiles: ParseResult[]): { file: string; cycle: string[] }[] {
    const cycles: { file: string; cycle: string[] }[] = [];
    const fileMap = new Map<string, ParseResult>();
    parsedFiles.forEach(f => fileMap.set(f.filePath, f));

    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (currPath: string, trail: string[]): string[] | null => {
      if (stack.has(currPath)) {
        const startIdx = trail.indexOf(currPath);
        return [...trail.slice(startIdx), currPath];
      }
      if (visited.has(currPath)) return null;

      visited.add(currPath);
      stack.add(currPath);

      const parsed = fileMap.get(currPath);
      if (parsed) {
        for (const dep of parsed.dependencies) {
          const target = parsedFiles.find(f => f.filePath.endsWith(dep) || f.filePath.includes(dep));
          if (target) {
            const cycle = dfs(target.filePath, [...trail, currPath]);
            if (cycle) {
              stack.delete(currPath);
              return cycle;
            }
          }
        }
      }

      stack.delete(currPath);
      return null;
    };

    parsedFiles.forEach(f => {
      if (!visited.has(f.filePath)) {
        const cycle = dfs(f.filePath, []);
        if (cycle) {
          cycles.push({ file: f.filePath, cycle });
        }
      }
    });

    return cycles;
  }

  public static analyzeFile(parseResult: ParseResult, _allFiles: ParseResult[] = []): Finding[] {
    const findings: Finding[] = [];
    const timestamp = new Date().toISOString();

    const isUIFile = parseResult.filePath.includes('/components/') || parseResult.filePath.includes('/views/') || parseResult.filePath.includes('/pages/');
    const importsDB = parseResult.imports.some(imp => imp.includes('db') || imp.includes('supabase') || imp.includes('postgres') || imp.includes('mysql') || imp.includes('repository'));

    if (isUIFile && importsDB) {
      findings.push({
        id: this.mkId(),
        file: parseResult.filePath,
        line: 1,
        rule: 'architecture-layer-violation',
        severity: 'high',
        category: 'architecture',
        explanation: 'UI component directly accesses data layer / DB client bypassing service/controller layer.',
        recommendedFix: 'Encapsulate DB operations within a service module and call the service from UI.',
        confidence: 0.85,
        timestamp
      });
    }

    if (parseResult.imports.length > 15) {
      findings.push({
        id: this.mkId(),
        file: parseResult.filePath,
        line: 1,
        rule: 'excessive-dependencies',
        severity: 'medium',
        category: 'architecture',
        explanation: `Module has high fan-out coupling (${parseResult.imports.length} external imports).`,
        recommendedFix: 'Decompose module into smaller focused units to improve cohesion.',
        confidence: 0.80,
        timestamp
      });
    }

    return findings;
  }
}
