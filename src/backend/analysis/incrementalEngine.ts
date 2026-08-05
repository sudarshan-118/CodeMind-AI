import type {
  FileAnalysisResult,
  Finding,
  ParseResult
} from '../shared/types';
import { ParserRegistry } from '../parser/parserRegistry';
import { SecurityEngine } from '../security/securityEngine';
import { ArchitectureAnalyzer } from '../architecture/archAnalyzer';
import { StaticAnalysisEngine } from '../analysis/staticAnalysisEngine';
import { CacheManager } from '../cache/cacheManager';

export class IncrementalAnalysisEngine {
  /**
   * Process incremental file edit: re-parse only changed file and compute delta
   */
  public static processFileEdit(
    projectId: string,
    filePath: string,
    code: string,
    existingFiles: FileAnalysisResult[]
  ): {
    updatedFileResult: FileAnalysisResult;
    updatedFileList: FileAnalysisResult[];
    affectedFilesCount: number;
  } {
    const hash = CacheManager.computeHash(code);
    const parseRes: ParseResult = ParserRegistry.parse(filePath, code);

    const secFindings = SecurityEngine.analyze(filePath, code, parseRes);
    const archFindings = ArchitectureAnalyzer.analyzeFile(parseRes, []);
    const staticFindings = StaticAnalysisEngine.analyzeFile(filePath, code, parseRes);
    const fileFindings: Finding[] = [...secFindings, ...archFindings, ...staticFindings];

    const existingFile = existingFiles.find(f => f.path === filePath);

    const updatedFileResult: FileAnalysisResult = {
      id: existingFile?.id || 'file-' + Math.random().toString(36).substr(2, 9),
      path: filePath,
      name: filePath.split('/').pop() || filePath,
      isDir: false,
      isCode: parseRes.linesOfCode > 0,
      language: parseRes.language,
      code,
      size: code.length,
      hash,
      metrics: {
        complexityScore: Math.min(100, Math.round(parseRes.functions.reduce((acc, fn) => acc + fn.complexity, 0) * 5)),
        securityScore: Math.max(0, 100 - secFindings.length * 20),
        maintainabilityScore: Math.max(0, 100 - staticFindings.length * 15),
        architectureScore: Math.max(0, 100 - archFindings.length * 15),
        testingScore: 80,
        documentationScore: parseRes.commentLines > 0 ? 85 : 40,
        dependencyScore: 85,
        overallRiskScore: Math.min(100, fileFindings.length * 15),
        riskState: secFindings.some(f => f.severity === 'critical') ? 'critical' : 'safe'
      },
      findings: fileFindings,
      parseResult: parseRes
    };

    // Update in-memory file list
    const updatedFileList = existingFiles.map(f => f.path === filePath ? updatedFileResult : f);
    if (!existingFiles.some(f => f.path === filePath)) {
      updatedFileList.push(updatedFileResult);
    }

    // Cache updated file
    CacheManager.updateCache(projectId, updatedFileResult);

    return {
      updatedFileResult,
      updatedFileList,
      affectedFilesCount: 1
    };
  }
}
