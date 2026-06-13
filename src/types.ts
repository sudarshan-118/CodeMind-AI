export interface Issue {
  id: string;
  line: number;
  type: string;
  severity: 'safe' | 'medium' | 'high' | 'critical';
  explanation: string;
  recommendedFix: string;
  applied: boolean;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  path: string;
  isDir: boolean;
  isCode?: boolean;       // true = analysed, false = display-only (assets, config, docs…)
  language?: string;      // detected language label
  code?: string;
  riskState: 'safe' | 'medium' | 'high' | 'critical';
  issues: Issue[];
  parentId?: string;
  dependencies?: string[];
  riskScore?: number;
  imports?: string[];
  exports?: string[];
  size?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  language: string;
  status: 'scanning' | 'ready';
  overallScore: number;
  securityScore: number;
  architectureScore: number;
  performanceScore: number;
  maintainabilityScore: number;
  branch: string;
  commitHash: string;
  files: ProjectFile[];
  ownerId?: string;
  analysisStats?: {
    totalFilesFound: number;    // every file discovered (code + non-code)
    foldersFound: number;       // directory count
    filesParsed: number;        // code files successfully scanned
    filesFailed: number;
    linesProcessed: number;
    detectedLanguages: string[];
    analysisDurationMs: number;
    totalFindings: number;
  };
}

export interface Memory {
  id: string;
  issue: string;
  fix: string;
  outcome: string;
  recommendation: string;
  date: string;
  matchPercentage?: number;
  ownerId?: string;
}

export interface Standard {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  ruleKeyword: string;
  severity: 'warning' | 'critical';
  ownerId?: string;
}

export interface Activity {
  id: string;
  text: string;
  type: 'critical' | 'warning' | 'success' | 'info';
  time: string;
  projectId?: string;
  ownerId?: string;
}
