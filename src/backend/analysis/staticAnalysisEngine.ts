// Static Analysis Engine (Complexity, Smells, Maintainability, Documentation, Testing)
import type { Finding, ParseResult } from '../shared/types';

export class StaticAnalysisEngine {
  private static mkId(): string {
    return 'sa-' + Math.random().toString(36).substr(2, 9);
  }

  public static detectDuplicateLogic(allFiles: { filePath: string; code: string }[]): Finding[] {
    const findings: Finding[] = [];
    const seenBlocks = new Map<string, { file: string; line: number }>();
    const timestamp = new Date().toISOString();

    allFiles.forEach(f => {
      const lines = f.code.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));
      for (let i = 0; i <= lines.length - 5; i++) {
        const block = lines.slice(i, i + 5).join('\n');
        if (block.length < 60) continue;

        if (seenBlocks.has(block)) {
          const original = seenBlocks.get(block)!;
          if (original.file !== f.filePath) {
            findings.push({
              id: this.mkId(),
              file: f.filePath,
              line: i + 1,
              rule: 'duplicate-code-block',
              severity: 'medium',
              category: 'smell',
              explanation: `5-line duplicate code block identified in ${original.file}:${original.line}.`,
              recommendedFix: 'Extract common code block into a shared helper utility function.',
              confidence: 0.90,
              timestamp
            });
            break;
          }
        } else {
          seenBlocks.set(block, { file: f.filePath, line: i + 1 });
        }
      }
    });

    return findings;
  }

  public static analyzeFile(filePath: string, code: string, parseResult: ParseResult): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');
    const timestamp = new Date().toISOString();

    if (lines.length > 250) {
      findings.push({
        id: this.mkId(),
        file: filePath,
        line: 1,
        rule: 'large-file',
        severity: 'medium',
        category: 'complexity',
        explanation: `File exceeds recommended length (${lines.length} lines of code).`,
        recommendedFix: 'Decompose file into smaller modular files.',
        confidence: 0.95,
        timestamp
      });
    }

    parseResult.functions.forEach(func => {
      if (func.length > 50) {
        findings.push({
          id: this.mkId(),
          file: filePath,
          line: func.line,
          rule: 'large-function',
          severity: 'medium',
          category: 'complexity',
          explanation: `Function "${func.name}" is too long (${func.length} lines).`,
          recommendedFix: 'Split function into smaller helper methods.',
          confidence: 0.90,
          timestamp
        });
      }

      if (func.paramCount > 5) {
        findings.push({
          id: this.mkId(),
          file: filePath,
          line: func.line,
          rule: 'long-parameter-list',
          severity: 'medium',
          category: 'smell',
          explanation: `Function "${func.name}" has ${func.paramCount} parameters.`,
          recommendedFix: 'Group parameters into a configuration parameter object.',
          confidence: 0.90,
          timestamp
        });
      }

      if (func.complexity > 8) {
        findings.push({
          id: this.mkId(),
          file: filePath,
          line: func.line,
          rule: 'high-cyclomatic-complexity',
          severity: 'high',
          category: 'complexity',
          explanation: `Function "${func.name}" has high cyclomatic complexity (${func.complexity}).`,
          recommendedFix: 'Simplify conditional logic or extract sub-decisions into helper routines.',
          confidence: 0.85,
          timestamp
        });
      }
    });

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(trimmed) || /except\s*:\s*pass/.test(trimmed)) {
        findings.push({
          id: this.mkId(),
          file: filePath,
          line: lineNum,
          rule: 'empty-catch-block',
          severity: 'high',
          category: 'smell',
          explanation: 'Swallowed exception in empty catch/except block hides runtime failures.',
          recommendedFix: 'Log the error or handle exception gracefully.',
          confidence: 0.95,
          timestamp
        });
      }
    });

    const totalPublicSymbols = parseResult.functions.filter(f => f.isExported).length + parseResult.classes.filter(c => c.isExported).length;
    if (totalPublicSymbols > 0 && parseResult.commentLines < 2) {
      findings.push({
        id: this.mkId(),
        file: filePath,
        line: 1,
        rule: 'missing-documentation',
        severity: 'safe',
        category: 'documentation',
        explanation: 'Module contains public exports without JSDoc/docstring documentation.',
        recommendedFix: 'Add docstrings describing function signatures and return types.',
        confidence: 0.80,
        timestamp
      });
    }

    return findings;
  }
}
