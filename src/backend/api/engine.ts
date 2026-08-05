// Unified Engine Orchestrator API for Phase 2 Repository Intelligence Platform
import type {
  AnalysisProgress,
  FileAnalysisResult,
  Finding,
  ParseResult,
  RepositoryScore,
  KnowledgeGraphData,
  DependencyMetrics,
  ArchitecturePatternResult,
  TechDebtReport,
  RiskPrediction,
  RepositoryHealthResult
} from '../shared/types';
import type { Project, ProjectFile } from '../../types';
import { RepositoryScanner, type RawFile } from '../scanner';
import { ParserRegistry } from '../parser/parserRegistry';
import { SecurityEngine } from '../security/securityEngine';
import { ArchitectureAnalyzer } from '../architecture/archAnalyzer';
import { StaticAnalysisEngine } from '../analysis/staticAnalysisEngine';
import { RiskScoringEngine } from '../risk/riskScoringEngine';
import { RepositoryMemoryEngine } from '../memory/repoMemory';
import { AdaptiveRuleEngine } from '../learning/adaptiveRuleEngine';
import { CacheManager } from '../cache/cacheManager';
import { KnowledgeGraphEngine } from '../graph/knowledgeGraph';
import { DependencyGraphEngine } from '../graph/dependencyGraph';
import { TrendEngine } from '../analysis/trendEngine';
import { RiskPredictionEngine } from '../risk/riskPredictionEngine';
import { RepositoryHealthEngine } from '../risk/repositoryHealthEngine';
import { TechnicalDebtAnalyzer } from '../analysis/techDebtAnalyzer';
import { ArchitecturePatternDetector } from '../architecture/patternDetector';

export interface ScanEngineInput {
  projectId: string;
  projectName: string;
  sourceType: 'github' | 'git' | 'zip' | 'folder' | 'file';
  files: RawFile[];
}

export class CodeMindEngine {
  private static scoringEngine = new RiskScoringEngine();

  public static async analyzeRepository(
    input: ScanEngineInput,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<{
    project: Project;
    files: ProjectFile[];
    repoScore: RepositoryScore;
    findings: Finding[];
    comparison: ReturnType<typeof RepositoryMemoryEngine.compareRuns>;
    knowledgeGraph: KnowledgeGraphData;
    dependencyMetrics: DependencyMetrics;
    architecturePattern: ArchitecturePatternResult;
    techDebt: TechDebtReport;
    predictions: RiskPrediction[];
    healthResult: RepositoryHealthResult;
    trendAnalysis: ReturnType<typeof TrendEngine.analyzeTrend>;
  }> {
    const notify = (step: AnalysisProgress['step'], percentage: number, logMessage: string, currentFile?: string) => {
      if (onProgress) {
        onProgress({ step, percentage, currentFile, logMessage });
      }
    };

    const sourceType = input.sourceType === 'git' ? 'github' : input.sourceType;

    // 1. Scanner Step
    notify('scanning', 10, `Scanning ${input.files.length} files in repository: ${input.projectName}...`);
    const { metadata, validFiles } = RepositoryScanner.scan(input.projectName, sourceType, input.files);

    // 2. Language Detection & Parsing
    notify('detecting', 25, `Ecosystem: ${metadata.projectType}. Detecting languages across ${validFiles.length} files...`);

    const parsedResults: ParseResult[] = [];
    const fileAnalysisResults: FileAnalysisResult[] = [];
    const allFindings: Finding[] = [];

    let processedCount = 0;

    for (const file of validFiles) {
      processedCount++;
      const pct = 25 + Math.round((processedCount / validFiles.length) * 35);
      notify('parsing', pct, `Parsing AST and symbols: ${file.name}`, file.path);

      const code = file.code || '';
      const hash = CacheManager.computeHash(code);

      // Check cache for incremental analysis
      const cached = CacheManager.isCachedAndUnchanged(input.projectId, file.path, code);

      let parseRes: ParseResult;
      let fileFindings: Finding[] = [];

      if (cached) {
        parseRes = cached.parseResult;
        fileFindings = cached.findings;
      } else {
        parseRes = ParserRegistry.parse(file.path, code);

        // Security Analysis
        const secFindings = SecurityEngine.analyze(file.path, code, parseRes);

        // Architecture Single File Analysis
        const archFindings = ArchitectureAnalyzer.analyzeFile(parseRes, []);

        // Static Analysis
        const staticFindings = StaticAnalysisEngine.analyzeFile(file.path, code, parseRes);

        fileFindings = [...secFindings, ...archFindings, ...staticFindings];

        // Apply Adaptive Rule Engine Weighting & Learning
        AdaptiveRuleEngine.recordRuleOccurrences(
          fileFindings.map(f => ({ ruleId: f.rule, category: f.category }))
        );
      }

      parsedResults.push(parseRes);
      allFindings.push(...fileFindings);

      // Compute File-level Risk Scores
      const metrics = this.scoringEngine.computeFileMetrics(
        fileFindings,
        parseRes.linesOfCode,
        parseRes.commentLines
      );

      const fileResult: FileAnalysisResult = {
        id: 'file-' + Math.random().toString(36).substr(2, 9),
        path: file.path,
        name: file.name,
        isDir: false,
        isCode: parseRes.linesOfCode > 0,
        language: parseRes.language,
        code,
        size: file.size || code.length,
        hash,
        metrics,
        findings: fileFindings,
        parseResult: parseRes
      };

      fileAnalysisResults.push(fileResult);

      // Cache updated result
      CacheManager.updateCache(input.projectId, fileResult);
    }

    // 3. Cross-file Analysis (Duplicate Code & Circular Dependencies)
    notify('static_analysis', 65, `Running cross-file structural & circular dependency checks...`);
    const dupFindings = StaticAnalysisEngine.detectDuplicateLogic(
      validFiles.map(f => ({ filePath: f.path, code: f.code || '' }))
    );
    const circularCycles = ArchitectureAnalyzer.detectCircularDependencies(parsedResults);

    circularCycles.forEach(c => {
      allFindings.push({
        id: 'circ-' + Math.random().toString(36).substr(2, 9),
        file: c.file,
        line: 1,
        rule: 'circular-dependency',
        severity: 'high',
        category: 'architecture',
        explanation: `Circular import cycle detected: ${c.cycle.join(' -> ')}`,
        recommendedFix: 'Refactor shared dependencies into a separate module.',
        confidence: 0.95,
        timestamp: new Date().toISOString()
      });
    });

    allFindings.push(...dupFindings);

    // 4. Repository Knowledge Graph & Dependency Metrics
    notify('static_analysis', 75, `Building Repository Knowledge Graph & calculating coupling metrics...`);
    const graphEngine = new KnowledgeGraphEngine();
    const knowledgeGraph = graphEngine.buildGraph(parsedResults);
    const dependencyMetrics = DependencyGraphEngine.calculateMetrics(parsedResults);

    // 5. Architecture Pattern & Tech Debt Analysis
    const architecturePattern = ArchitecturePatternDetector.analyzePattern(parsedResults);
    allFindings.push(...architecturePattern.violations);

    const techDebt = TechnicalDebtAnalyzer.analyzeRepository(fileAnalysisResults);

    // 6. Intelligent Risk Prediction
    notify('risk_scoring', 85, `Predicting hotspot files, bug magnets, and volatility risks...`);
    const predictions = RiskPredictionEngine.predictRisks(
      input.projectId,
      fileAnalysisResults,
      dependencyMetrics,
      allFindings
    );

    // 7. Aggregate Risk Scoring & Health Score
    const repoScore = this.scoringEngine.aggregateRepositoryScore(
      fileAnalysisResults.map(f => f.metrics)
    );

    const trendAnalysis = TrendEngine.analyzeTrend(input.projectId);

    const healthResult = RepositoryHealthEngine.calculateHealth(
      repoScore,
      predictions,
      fileAnalysisResults,
      trendAnalysis.healthDelta
    );

    // 8. Repository Intelligence Memory & Historical Snapshots
    notify('memory_check', 95, `Saving snapshot to Repository Intelligence Memory Ledger...`);
    const comparison = RepositoryMemoryEngine.compareRuns(input.projectId, repoScore, allFindings);

    RepositoryMemoryEngine.saveRunSnapshot(
      input.projectId,
      repoScore,
      allFindings,
      validFiles.length,
      {
        healthScore: healthResult.overallHealth,
        techDebtHours: techDebt.totalHours,
        pattern: architecturePattern.detectedPattern
      }
    );

    // Build legacy Project UI file structures for total compatibility with existing UI
    const mappedFiles: ProjectFile[] = fileAnalysisResults.map(f => ({
      id: f.id,
      projectId: input.projectId,
      name: f.name,
      path: f.path,
      isDir: false,
      isCode: f.isCode,
      language: f.language,
      code: f.code,
      riskState: f.metrics.riskState,
      riskScore: f.metrics.overallRiskScore,
      imports: f.parseResult?.imports || [],
      exports: f.parseResult?.exports || [],
      dependencies: f.parseResult?.dependencies || [],
      size: f.size,
      issues: f.findings.map(finding => ({
        id: finding.id,
        line: finding.line,
        type: finding.rule,
        severity: finding.severity,
        explanation: finding.explanation,
        recommendedFix: finding.recommendedFix,
        applied: false
      }))
    }));

    const project: Project = {
      id: input.projectId,
      name: input.projectName,
      description: `${metadata.projectType} scanned with CodeMind Engine v2 (${architecturePattern.detectedPattern} Pattern)`,
      language: metadata.detectedLanguages.join(', ') || 'Mixed',
      status: 'ready',
      overallScore: healthResult.overallHealth,
      securityScore: repoScore.securityScore,
      architectureScore: repoScore.architectureScore,
      performanceScore: repoScore.performanceScore,
      maintainabilityScore: repoScore.maintainabilityScore,
      branch: 'main',
      commitHash: 'v2-intelligence',
      files: mappedFiles,
      analysisStats: {
        totalFilesFound: metadata.totalFiles,
        foldersFound: metadata.totalFolders,
        filesParsed: metadata.totalCodeFiles,
        filesFailed: 0,
        linesProcessed: metadata.totalLinesOfCode,
        detectedLanguages: metadata.detectedLanguages,
        analysisDurationMs: 1200,
        totalFindings: allFindings.length
      }
    };

    notify('completed', 100, `Intelligence complete. Health Score: ${healthResult.overallHealth}/100 (${healthResult.riskLevel.toUpperCase()})`);

    return {
      project,
      files: mappedFiles,
      repoScore,
      findings: allFindings,
      comparison,
      knowledgeGraph,
      dependencyMetrics,
      architecturePattern,
      techDebt,
      predictions,
      healthResult,
      trendAnalysis
    };
  }
}
