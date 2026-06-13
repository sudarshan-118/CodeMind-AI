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
  code?: string;
  riskState: 'safe' | 'medium' | 'high' | 'critical';
  issues: Issue[];
  parentId?: string;
  dependencies?: string[]; // relative paths of other files this file imports
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
    filesParsed: number;
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
  ruleKeyword: string; // keyword indicating violation if found in code
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
