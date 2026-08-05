import type {
  ArchitecturePatternResult,
  ParseResult,
  Finding
} from '../shared/types';

export class ArchitecturePatternDetector {
  /**
   * Automatically detect architecture style and flag boundary violations
   */
  public static analyzePattern(parseResults: ParseResult[]): ArchitecturePatternResult {
    const filePaths = parseResults.map(p => p.filePath.toLowerCase());

    let mvcScore = 0;
    let layeredScore = 0;
    let cleanScore = 0;
    let eventScore = 0;

    filePaths.forEach(path => {
      if (path.includes('controller') || path.includes('model') || path.includes('view')) mvcScore++;
      if (path.includes('service') || path.includes('repository') || path.includes('dao')) layeredScore++;
      if (path.includes('domain') || path.includes('usecase') || path.includes('adapter') || path.includes('infra')) cleanScore++;
      if (path.includes('event') || path.includes('publisher') || path.includes('subscriber') || path.includes('bus')) eventScore++;
    });

    let detectedPattern: ArchitecturePatternResult['detectedPattern'] = 'Layered';
    let maxScore = layeredScore;

    if (mvcScore > maxScore) {
      detectedPattern = 'MVC';
      maxScore = mvcScore;
    }
    if (cleanScore > maxScore) {
      detectedPattern = 'Clean Architecture';
      maxScore = cleanScore;
    }
    if (eventScore > maxScore) {
      detectedPattern = 'Event Driven';
      maxScore = eventScore;
    }

    if (maxScore === 0) {
      detectedPattern = parseResults.length > 30 ? 'Monolith' : 'Layered';
    }

    const confidence = Math.min(0.98, Math.max(0.70, 0.65 + (maxScore / Math.max(1, parseResults.length)) * 0.5));

    // Detect Architectural Layer Boundary Violations
    const violations: Finding[] = [];

    for (const res of parseResults) {
      const lowerPath = res.filePath.toLowerCase();
      const imports = res.imports || [];

      // Boundary Violation Rule 1: Repository / Data layer importing UI components
      if ((lowerPath.includes('repository') || lowerPath.includes('db') || lowerPath.includes('dao')) &&
          imports.some(imp => imp.toLowerCase().includes('component') || imp.toLowerCase().includes('view') || imp.toLowerCase().includes('react'))) {
        violations.push({
          id: 'arch-viol-' + Math.random().toString(36).substr(2, 9),
          file: res.filePath,
          line: 1,
          rule: 'architecture-layer-violation',
          severity: 'high',
          category: 'architecture',
          explanation: `Layer Boundary Violation: Data layer '${res.filePath}' directly imports UI/Presentation components. Violates strict separation of concerns.`,
          recommendedFix: `Invert dependency or pass UI callbacks/data structures into data layer.`,
          confidence: 0.95,
          timestamp: new Date().toISOString()
        });
      }

      // Boundary Violation Rule 2: Controller importing DB driver directly instead of Service layer
      if (lowerPath.includes('controller') && imports.some(imp => imp.toLowerCase().includes('pg') || imp.toLowerCase().includes('mysql') || imp.toLowerCase().includes('mongodb'))) {
        violations.push({
          id: 'arch-viol-' + Math.random().toString(36).substr(2, 9),
          file: res.filePath,
          line: 1,
          rule: 'architecture-bypassed-service-layer',
          severity: 'medium',
          category: 'architecture',
          explanation: `Bypassed Layer Violation: Controller '${res.filePath}' directly imports database driver.`,
          recommendedFix: `Encapsulate database access behind a Service / Repository abstraction interface.`,
          confidence: 0.90,
          timestamp: new Date().toISOString()
        });
      }
    }

    const description = `Repository adheres to ${detectedPattern} pattern (${Math.round(confidence * 100)}% structural match). Found ${violations.length} boundary violations.`;

    return {
      detectedPattern,
      confidence: Math.round(confidence * 100) / 100,
      description,
      violations
    };
  }
}
