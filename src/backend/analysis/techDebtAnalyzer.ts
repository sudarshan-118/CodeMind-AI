import type {
  TechDebtReport,
  TechDebtItem,
  FileAnalysisResult
} from '../shared/types';

export class TechnicalDebtAnalyzer {
  /**
   * Comprehensive Technical Debt analysis across parsed repository files
   */
  public static analyzeRepository(files: FileAnalysisResult[]): TechDebtReport {
    const items: TechDebtItem[] = [];

    for (const file of files) {
      if (!file.isCode || !file.code) continue;

      const code = file.code;
      const parseRes = file.parseResult;
      const lines = code.split('\n');

      // 1. Large Method Smell (> 50 lines)
      if (parseRes?.functions) {
        parseRes.functions.forEach(fn => {
          if (fn.length > 50) {
            items.push({
              id: 'debt-lm-' + Math.random().toString(36).substr(2, 9),
              file: file.path,
              line: fn.line,
              smellType: 'large_method',
              location: `Function ${fn.name}() (${fn.length} lines)`,
              estimatedHours: Math.round(fn.length / 25),
              priority: fn.length > 100 ? 'high' : 'medium',
              description: `Function '${fn.name}' is ${fn.length} lines. Large functions are difficult to test and maintain.`,
              recommendedFix: `Decompose '${fn.name}' into smaller single-responsibility sub-functions.`
            });
          }

          // 2. Long Parameter List (> 4 params)
          if (fn.paramCount > 4) {
            items.push({
              id: 'debt-lp-' + Math.random().toString(36).substr(2, 9),
              file: file.path,
              line: fn.line,
              smellType: 'long_param_list',
              location: `Function ${fn.name}() (${fn.paramCount} params)`,
              estimatedHours: 1.5,
              priority: 'medium',
              description: `Function '${fn.name}' accepts ${fn.paramCount} parameters. Exceeds standard limit of 4 parameters.`,
              recommendedFix: `Refactor parameters into a single structured configuration object or interface.`
            });
          }
        });
      }

      // 3. Deep Nesting (> 3 indentation levels)
      lines.forEach((line, i) => {
        const indentMatch = line.match(/^(\s+)/);
        if (indentMatch) {
          const spaces = indentMatch[1].replace(/\t/g, '  ').length;
          const level = Math.floor(spaces / 2);
          if (level >= 5 && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            // Avoid duplicate flags on consecutive lines
            const lastLine = items[items.length - 1]?.line;
            if (!lastLine || Math.abs(lastLine - (i + 1)) > 5) {
              items.push({
                id: 'debt-dn-' + Math.random().toString(36).substr(2, 9),
                file: file.path,
                line: i + 1,
                smellType: 'deep_nesting',
                location: `${file.name}:${i + 1}`,
                estimatedHours: 1.0,
                priority: 'medium',
                description: `Deep nesting detected (${level} levels). High cognitive complexity.`,
                recommendedFix: `Extract nested logic into helper methods or use guard clause returns.`
              });
            }
          }
        }

        // 4. Magic Numbers (hardcoded literal numbers > 10 outside configs)
        if (/\b(?:let|const|var|return|=|\+|-|\*|\/)\s*([1-9]\d{2,})\b/.test(line) &&
            !line.includes('http') && !line.includes('port') && !line.includes('1000') && !line.includes('8080') && !line.includes('3000')) {
          if (!line.trim().startsWith('//') && !line.includes('Date')) {
            const match = line.match(/\b([1-9]\d{2,})\b/);
            if (match && items.filter(it => it.file === file.path && it.smellType === 'magic_number').length < 3) {
              items.push({
                id: 'debt-mn-' + Math.random().toString(36).substr(2, 9),
                file: file.path,
                line: i + 1,
                smellType: 'magic_number',
                location: `${file.name}:${i + 1}`,
                estimatedHours: 0.5,
                priority: 'low',
                description: `Hardcoded numeric literal '${match[1]}' detected. Magic numbers reduce readability.`,
                recommendedFix: `Extract numeric literal '${match[1]}' into a named domain constant.`
              });
            }
          }
        }
      });

      // 5. Missing Documentation on Public Exports
      if (parseRes?.exports && parseRes.exports.length > 0 && parseRes.commentLines === 0 && lines.length > 30) {
        items.push({
          id: 'debt-md-' + Math.random().toString(36).substr(2, 9),
          file: file.path,
          line: 1,
          smellType: 'missing_docs',
          location: file.name,
          estimatedHours: 1.0,
          priority: 'low',
          description: `File exports ${parseRes.exports.length} public symbols without docstrings or comments.`,
          recommendedFix: `Add JSDoc / Docstring documentation for public exports.`
        });
      }
    }

    const totalHours = items.reduce((sum, item) => sum + item.estimatedHours, 0);
    const totalCostEstimate = totalHours * 50; // $50/hr standard dev rate

    const byCategory: Record<string, number> = {};
    items.forEach(item => {
      byCategory[item.smellType] = (byCategory[item.smellType] || 0) + 1;
    });

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalCostEstimate,
      items: items.sort((a, b) => (b.priority === 'high' ? 2 : 1) - (a.priority === 'high' ? 2 : 1)),
      byCategory
    };
  }
}
