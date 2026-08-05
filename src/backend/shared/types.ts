// CodeMind AI v2 Backend Domain Types & Contracts

export type RiskSeverity = 'safe' | 'medium' | 'high' | 'critical';

export interface Finding {
  id: string;
  file: string;
  line: number;
  rule: string;
  severity: RiskSeverity;
  category: 'security' | 'architecture' | 'complexity' | 'maintainability' | 'documentation' | 'dependency' | 'testing' | 'smell';
  explanation: string;
  recommendedFix: string;
  confidence: number; // 0.0 to 1.0
  timestamp: string;
  applied?: boolean;
}

export interface ASTNode {
  type: string;
  name?: string;
  line: number;
  endLine?: number;
  children?: ASTNode[];
  metadata?: Record<string, any>;
}

export interface FunctionSymbol {
  name: string;
  line: number;
  endLine: number;
  length: number;
  paramCount: number;
  complexity: number;
  isExported: boolean;
}

export interface ClassSymbol {
  name: string;
  line: number;
  endLine: number;
  methodsCount: number;
  fieldsCount: number;
  isExported: boolean;
}

export interface ParseResult {
  filePath: string;
  language: string;
  ast: ASTNode;
  imports: string[];
  exports: string[];
  classes: ClassSymbol[];
  functions: FunctionSymbol[];
  variables: string[];
  dependencies: string[];
  linesOfCode: number;
  commentLines: number;
}

export interface RepositoryMetadata {
  projectName: string;
  sourceType: 'github' | 'zip' | 'folder' | 'file';
  projectType: string; // e.g. React/Vite, Next.js, Python/FastAPI, Java/Spring, Go, Rust, C++
  totalSize: number;
  totalFiles: number;
  totalFolders: number;
  totalCodeFiles: number;
  totalLinesOfCode: number;
  detectedLanguages: string[];
  discoveredAt: string;
}

export interface ScoringCategoryWeights {
  complexity: number;
  security: number;
  maintainability: number;
  architecture: number;
  testing: number;
  documentation: number;
  dependency: number;
}

export interface ScoringConfig {
  weights: ScoringCategoryWeights;
  severityPenalties: {
    critical: number;
    high: number;
    medium: number;
    safe: number;
  };
  thresholds: {
    maxFileLengthWarning: number;
    maxFunctionLengthWarning: number;
    maxComplexityWarning: number;
    minDocCoverageWarning: number;
  };
}

export interface FileRiskMetrics {
  complexityScore: number;     // 0 - 100
  securityScore: number;       // 0 - 100
  maintainabilityScore: number;// 0 - 100
  architectureScore: number;   // 0 - 100
  testingScore: number;        // 0 - 100
  documentationScore: number;  // 0 - 100
  dependencyScore: number;     // 0 - 100
  overallRiskScore: number;    // 0 - 100
  riskState: RiskSeverity;
}

export interface FileAnalysisResult {
  id: string;
  path: string;
  name: string;
  isDir: boolean;
  isCode: boolean;
  language: string;
  code?: string;
  size: number;
  hash: string;
  metrics: FileRiskMetrics;
  findings: Finding[];
  parseResult?: ParseResult;
}

export interface FolderScore {
  path: string;
  metrics: FileRiskMetrics;
  fileCount: number;
}

export interface RepositoryScore {
  overallScore: number;
  securityScore: number;
  architectureScore: number;
  performanceScore: number;
  maintainabilityScore: number;
  testingScore: number;
  documentationScore: number;
  overallRiskState: RiskSeverity;
}

export interface AnalysisProgress {
  step: 'scanning' | 'detecting' | 'parsing' | 'static_analysis' | 'risk_scoring' | 'memory_check' | 'completed';
  percentage: number;
  currentFile?: string;
  logMessage: string;
}

export interface HistoricalRunSnapshot {
  id: string;
  projectId: string;
  timestamp: string;
  scores: RepositoryScore;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  filesCount: number;
}

export interface ComparisonResult {
  improvements: string[];
  regressions: string[];
  scoreDiff: {
    overall: number;
    security: number;
    architecture: number;
    maintainability: number;
  };
  resolvedFindings: string[];
  newFindings: string[];
  trendSummary: string;
}

export interface AdaptiveRuleWeight {
  ruleId: string;
  ruleCategory: string;
  baseWeight: number;
  adjustedWeight: number;
  occurrenceCount: number;
  acceptedFixCount: number;
  userOverrideMultiplier: number;
}

export interface ILanguageParser {
  language: string;
  supportedExtensions: string[];
  parse(filePath: string, code: string): ParseResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Repository Intelligence Engine Types
// ─────────────────────────────────────────────────────────────────────────────

export type GraphNodeType = 'file' | 'class' | 'interface' | 'function' | 'variable' | 'module' | 'package';
export type GraphEdgeType = 'imports' | 'inheritance' | 'method_call' | 'composition' | 'ownership' | 'depends_on';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  filePath: string;
  line?: number;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
  weight?: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DependencyMetrics {
  afferentCoupling: Record<string, number>; // Ca
  efferentCoupling: Record<string, number>; // Ce
  instability: Record<string, number>;      // I = Ce / (Ca + Ce)
  circularDependencies: Array<{ file: string; cycle: string[] }>;
  unusedModules: string[];
  criticalNodes: string[];
}

export interface RiskPrediction {
  file: string;
  riskType: 'hotspot' | 'volatility' | 'bug_magnet' | 'coupling_warning';
  score: number; // 0 - 100
  explanation: string;
  metrics: Record<string, number>;
}

export interface TechDebtItem {
  id: string;
  file: string;
  line: number;
  smellType: 'large_method' | 'duplicate_code' | 'dead_code' | 'magic_number' | 'long_param_list' | 'deep_nesting' | 'missing_docs';
  location: string;
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendedFix: string;
}

export interface TechDebtReport {
  totalHours: number;
  totalCostEstimate: number; // In USD ($50/hr standard rate)
  items: TechDebtItem[];
  byCategory: Record<string, number>;
}

export interface ArchitecturePatternResult {
  detectedPattern: 'MVC' | 'Layered' | 'Clean Architecture' | 'Hexagonal' | 'Microservices' | 'Monolith' | 'Event Driven';
  confidence: number; // 0.0 - 1.0
  description: string;
  violations: Finding[];
}

export interface RepositoryHealthResult {
  overallHealth: number; // 0 - 100
  riskLevel: RiskSeverity;
  confidence: number;
  priorityRanking: Array<{ file: string; priority: number; reason: string }>;
  metricBreakdown: {
    complexity: number;
    architecture: number;
    security: number;
    maintainability: number;
    testing: number;
    documentation: number;
    dependency: number;
    trendModifier: number;
  };
}

export interface RepositoryTimelineSnapshot {
  id: string;
  projectId: string;
  timestamp: string;
  version: string;
  commitHash: string;
  healthScore: number;
  riskScore: number;
  architectureScore: number;
  securityScore: number;
  complexityScore: number;
  documentationScore: number;
  testingScore: number;
  dependencyScore: number;
  totalFindings: number;
  criticalFindings: number;
  resolvedFindings: number;
  techDebtHours: number;
  pattern: string;
}

