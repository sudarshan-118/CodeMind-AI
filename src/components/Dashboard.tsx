import React, { useState } from 'react';
import type { Project, Activity, Memory, Standard, ProjectFile, Issue } from '../types';
import { GitBranch, FolderOpen, Play, Plus, X, Globe, Upload, File, Loader } from 'lucide-react';
import { INITIAL_PROJECTS } from '../mockData';
import JSZip from 'jszip';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Paths / segments that should be ignored during ingestion */
const IGNORED_SEGMENTS = new Set([
  'node_modules', 'venv', '.git', 'dist', 'build',
  '.next', 'out', '.idea', '.vscode', '__pycache__',
  '.DS_Store', 'coverage', '.nyc_output', '.turbo',
  'target', 'bin', 'obj', 'vendor'
]);

const isIgnoredPath = (path: string): boolean => {
  const parts = path.toLowerCase().replace(/\\/g, '/').split('/');
  return parts.some(p => IGNORED_SEGMENTS.has(p));
};

const CODE_EXTENSIONS = new Set([
  'js', 'ts', 'tsx', 'jsx', 'py', 'go', 'java', 'cpp', 'c', 'h', 'hpp',
  'cs', 'rb', 'rs', 'swift', 'kt', 'php', 'vue', 'svelte', 'mjs', 'cjs'
]);

const isCodeFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return CODE_EXTENSIONS.has(ext);
};

// ─── Import/Export Extractor ─────────────────────────────────────────────────

const extractImportsExports = (
  filename: string,
  code: string
): { imports: string[]; exports: string[] } => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const imports: string[] = [];
  const exports: string[] = [];

  try {
    if (['js', 'ts', 'tsx', 'jsx', 'mjs', 'cjs', 'vue', 'svelte'].includes(ext)) {
      const importRegex = /from\s+['"]([^'"]+)['"]/g;
      const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
      const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
      let m;
      while ((m = importRegex.exec(code)) !== null) imports.push(m[1]);
      while ((m = requireRegex.exec(code)) !== null) imports.push(m[1]);
      while ((m = exportRegex.exec(code)) !== null) exports.push(m[1]);
    } else if (ext === 'py') {
      const imp1 = /^import\s+(\w+)/gm;
      const imp2 = /^from\s+([\w.]+)\s+import/gm;
      const exp1 = /^(?:def|class)\s+(\w+)/gm;
      let m;
      while ((m = imp1.exec(code)) !== null) imports.push(m[1]);
      while ((m = imp2.exec(code)) !== null) imports.push(m[1]);
      while ((m = exp1.exec(code)) !== null) exports.push(m[1]);
    } else if (ext === 'go') {
      const single = /import\s+"([^"]+)"/g;
      const multi  = /import\s*\(\s*([\s\S]*?)\)/g;
      const funcs  = /^func\s+(\w+)/gm;
      let m;
      while ((m = single.exec(code)) !== null) imports.push(m[1]);
      while ((m = multi.exec(code)) !== null) {
        m[1].split('\n').forEach(l => { const mm = l.match(/"([^"]+)"/); if (mm) imports.push(mm[1]); });
      }
      while ((m = funcs.exec(code)) !== null) {
        if (m[1][0] === m[1][0].toUpperCase()) exports.push(m[1]);
      }
    } else if (ext === 'java') {
      const imp = /import\s+([\w.]+);/g;
      const cls = /public\s+(?:class|interface|enum)\s+(\w+)/g;
      let m;
      while ((m = imp.exec(code)) !== null) imports.push(m[1]);
      while ((m = cls.exec(code)) !== null) exports.push(m[1]);
    } else if (['cpp', 'c', 'h', 'hpp'].includes(ext)) {
      const inc = /#include\s+["<]([^">]+)[">]/g;
      const cls = /(?:class|struct)\s+(\w+)/g;
      let m;
      while ((m = inc.exec(code)) !== null) imports.push(m[1]);
      while ((m = cls.exec(code)) !== null) exports.push(m[1]);
    } else if (ext === 'cs') {
      const us  = /using\s+([\w.]+);/g;
      const cls = /public\s+(?:class|interface|struct)\s+(\w+)/g;
      let m;
      while ((m = us.exec(code))  !== null) imports.push(m[1]);
      while ((m = cls.exec(code)) !== null) exports.push(m[1]);
    }
  } catch {/* ignore */}

  return {
    imports: [...new Set(imports)],
    exports: [...new Set(exports)]
  };
};

// ─── Local Static Scanner ────────────────────────────────────────────────────

const scanCodeFile = (code: string, activeStandards: Standard[]): Issue[] => {
  const issues: Issue[] = [];
  const lines = code.split('\n');
  const mkId = () => `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  lines.forEach((lineText, idx) => {
    const ln = idx + 1;
    const inComment = lineText.trimStart().startsWith('//') || lineText.trimStart().startsWith('#');

    if (!inComment) {
      // Hardcoded secrets
      if (/(?:api_key|secret|password|passwd|private_key|token)\s*=\s*['"][a-zA-Z0-9_\-+=/]{15,}['"]/i.test(lineText)) {
        issues.push({ id: mkId(), line: ln, type: 'Hardcoded API Keys', severity: 'critical',
          explanation: 'Hardcoded secret token or private API key detected in variable assignment.',
          recommendedFix: '// Move secrets to environment variables\nconst apiKey = process.env.API_KEY || "";', applied: false });
      }
      // SQL Injection
      if (/(SELECT|INSERT|UPDATE|DELETE).*\+.*\b/i.test(lineText) || /(SELECT|INSERT|UPDATE|DELETE).*\$\{.*\}/i.test(lineText)) {
        issues.push({ id: mkId(), line: ln, type: 'SQL Injection', severity: 'critical',
          explanation: 'SQL query built via string concatenation / interpolation — injection risk.',
          recommendedFix: 'db.query("SELECT * FROM users WHERE id = ?", [userId], callback);', applied: false });
      }
      // eval
      if (/\beval\s*\(/.test(lineText)) {
        issues.push({ id: mkId(), line: ln, type: 'Unsafe eval()', severity: 'high',
          explanation: 'eval() enables arbitrary code execution and RCE vulnerabilities.',
          recommendedFix: '// Replace with structured data lookups or safe JSON.parse()', applied: false });
      }
      // Command injection
      if (/os\.system\(/i.test(lineText) || /exec\s*\(/i.test(lineText) || /spawn\s*\(/i.test(lineText)) {
        issues.push({ id: mkId(), line: ln, type: 'Command Injection', severity: 'high',
          explanation: 'Shell command executed with possibly unsanitized inputs.',
          recommendedFix: '// Use array arguments: subprocess.run(["cmd", arg], check=True)', applied: false });
      }
      // Sensitive logging
      if (/console\.log\(.*(password|secret|token|key|pwd).*\)/i.test(lineText)) {
        issues.push({ id: mkId(), line: ln, type: 'Sensitive Logging', severity: 'medium',
          explanation: 'Sensitive credential printed to console — credential leakage risk.',
          recommendedFix: '// Remove credential parameters from log calls.', applied: false });
      }
      // Weak encryption
      if (/\bmd5\b|\bsha1\b|\bDES\b/i.test(lineText)) {
        issues.push({ id: mkId(), line: ln, type: 'Weak Encryption', severity: 'high',
          explanation: 'Deprecated weak hash algorithm (MD5/SHA1/DES) detected.',
          recommendedFix: '// Use SHA-256 or bcrypt for password hashing', applied: false });
      }
    }

    // Team standard rules
    activeStandards.forEach(std => {
      if (!std.enabled || !std.ruleKeyword) return;
      if (lineText.toLowerCase().includes(std.ruleKeyword.toLowerCase())) {
        if (issues.some(i => i.line === ln && i.type === std.name)) return;
        issues.push({
          id: mkId(), line: ln, type: std.name,
          severity: std.severity === 'critical' ? 'critical' : 'medium',
          explanation: `Team standard violation: "${std.description}"`,
          recommendedFix: `// Refactor to satisfy: ${std.description}`, applied: false
        });
      }
    });
  });

  // File too large
  if (lines.length > 100) {
    issues.push({ id: `${mkId()}-large`, line: 1, type: 'Large File', severity: 'medium',
      explanation: `File is ${lines.length} lines. Large files reduce readability and testability.`,
      recommendedFix: '// Decompose into smaller focused modules.', applied: false });
  }

  return issues;
};

// ─── Groq AI Scanner ────────────────────────────────────────────────────────

const scanWithGroq = async (
  filename: string, path: string, code: string, activeStandards: Standard[]
): Promise<Issue[]> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return scanCodeFile(code, activeStandards);

  const mkId = () => `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const enabledStds = activeStandards.filter(s => s.enabled);

  const systemPrompt = `You are CodeMind AI, an engineering intelligence security review agent.
Analyze ONLY the actual code provided below. Do NOT hallucinate or invent issues.
Detect ONLY these issue categories:
1. Hardcoded API Keys - credentials/secrets/tokens hardcoded in source
2. SQL Injection - raw string concatenation in DB queries
3. Command Injection - unsanitized input passed to shell/exec functions
4. Unsafe eval() - use of eval() or Function() for dynamic execution
5. Exposed Secrets - passwords, private keys, database URLs in code
6. Sensitive Logging - printing sensitive data to logs/console
7. Weak Encryption - MD5, SHA1, DES usage for security
8. Missing Authentication - unprotected endpoints/functions
9. Weak Validation - absent or regex-only input sanitization
10. Large Functions - functions/methods exceeding 80 lines
11. JWT Problems - weak secrets, no expiry, unsafe claims

Team standards to check:
${JSON.stringify(enabledStds.map(s => ({ name: s.name, description: s.description, keyword: s.ruleKeyword })))}

Return ONLY a valid JSON object:
{"issues":[{"line":15,"type":"SQL Injection","severity":"critical","explanation":"...","recommendedFix":"// fix code"}]}
If no real issues found, return {"issues":[]}.
IMPORTANT: Only report what you can OBSERVE in the code text. Never guess.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `File: ${path}\n\n${code.slice(0, 8000)}` }
        ],
        temperature: 0.05,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) return scanCodeFile(code, activeStandards);

    const data = await res.json();
    let text = data.choices?.[0]?.message?.content ?? '{}';
    // Strip markdown fences if any
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) text = fenced[1].trim();

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.issues)) return scanCodeFile(code, activeStandards);

    return parsed.issues.map((iss: any) => ({
      id: mkId(),
      line: Number(iss.line) || 1,
      type: iss.type || 'AI Finding',
      severity: ['critical', 'high', 'medium', 'safe'].includes(iss.severity) ? iss.severity : 'medium',
      explanation: iss.explanation || 'Potential code quality issue.',
      recommendedFix: iss.recommendedFix || '// Refactor as per best practices',
      applied: false
    }));
  } catch (err) {
    console.warn('Groq scan failed, falling back to local scan:', err);
    return scanCodeFile(code, activeStandards);
  }
};

// ─── Dependency Resolver ─────────────────────────────────────────────────────

const resolveDependencies = (filePath: string, code: string, allPaths: string[]): string[] => {
  const { imports } = extractImportsExports(filePath.split('/').pop() ?? '', code);
  const deps = new Set<string>();
  const dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : '';

  for (const imp of imports) {
    if (imp.startsWith('.')) {
      // Resolve relative import
      const dirParts = dir ? dir.split('/') : [];
      for (const seg of imp.split('/')) {
        if (seg === '.') { /* noop */ }
        else if (seg === '..') dirParts.pop();
        else dirParts.push(seg);
      }
      const base = dirParts.join('/');
      const match = allPaths.find(p => {
        const withoutExt = p.includes('.') ? p.slice(0, p.lastIndexOf('.')) : p;
        return withoutExt === base || p === base;
      });
      if (match) deps.add(match);
    } else {
      // Try to match by filename stem
      const impBase = imp.split('/').pop()?.split('.')[0]?.toLowerCase() ?? '';
      const match = allPaths.find(p => {
        const stem = p.split('/').pop()?.split('.')[0]?.toLowerCase() ?? '';
        return stem === impBase || p.toLowerCase().includes(`/${imp.toLowerCase()}.`);
      });
      if (match) deps.add(match);
    }
  }

  return [...deps];
};

// ─── Cross-File Analysis Passes ───────────────────────────────────────────────

const detectCircularDeps = (files: ProjectFile[]) => {
  const cycles: { path: string; cycle: string[] }[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  const dfs = (path: string, trail: string[]): string[] | null => {
    if (stack.has(path)) {
      const start = trail.indexOf(path);
      return [...trail.slice(start), path];
    }
    if (visited.has(path)) return null;
    visited.add(path); stack.add(path);
    const file = files.find(f => f.path === path);
    for (const dep of file?.dependencies ?? []) {
      const cycle = dfs(dep, [...trail, path]);
      if (cycle) { stack.delete(path); return cycle; }
    }
    stack.delete(path); return null;
  };

  files.forEach(f => {
    if (!visited.has(f.path)) {
      const cycle = dfs(f.path, []);
      if (cycle) cycles.push({ path: f.path, cycle });
    }
  });
  return cycles;
};

const detectDuplicateLogic = (files: ProjectFile[]) => {
  const seen = new Map<string, { path: string; line: number }>();
  const dups: { path: string; line: number; explanation: string }[] = [];

  files.forEach(file => {
    if (!file.code) return;
    const meaningful = file.code.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('#') && !l.startsWith('/*'));

    for (let i = 0; i <= meaningful.length - 5; i++) {
      const block = meaningful.slice(i, i + 5).join('\n');
      if (block.length < 60) continue;
      if (seen.has(block)) {
        const orig = seen.get(block)!;
        if (orig.path !== file.path) {
          dups.push({ path: file.path, line: i + 1, explanation: `Duplicate 5-line logic block also found in ${orig.path} (line ${orig.line}).` });
          break;
        }
      } else {
        seen.set(block, { path: file.path, line: i + 1 });
      }
    }
  });
  return dups;
};

const detectUnusedExports = (files: ProjectFile[]) => {
  const allCode = files.map(f => f.code ?? '').join('\n');
  const unused: { path: string; symbol: string; explanation: string }[] = [];

  files.forEach(file => {
    (file.exports ?? []).forEach(sym => {
      // Count references outside this file
      const outsideRefs = files
        .filter(f => f.id !== file.id && f.code)
        .filter(f => f.code!.includes(sym)).length;
      if (outsideRefs === 0) {
        // Also check it's not the main entry (App, main, index, etc.)
        if (!['App', 'main', 'index', 'default', 'router', 'Routes'].includes(sym)) {
          unused.push({ path: file.path, symbol: sym, explanation: `"${sym}" is exported but never imported by any other file.` });
        }
      }
    });
  });
  void allCode; // suppress lint
  return unused;
};

// ─── Risk Score Computer ─────────────────────────────────────────────────────

const computeRiskScore = (issues: Issue[]): number => {
  let score = 0;
  issues.forEach(i => {
    if (!i.applied) {
      if (i.severity === 'critical') score += 45;
      else if (i.severity === 'high')   score += 25;
      else if (i.severity === 'medium') score += 12;
      else                              score +=  5;
    }
  });
  return Math.min(100, score);
};

// ─── Component ───────────────────────────────────────────────────────────────

interface DashboardProps {
  projects: Project[];
  memories: Memory[];
  activities: Activity[];
  analytics?: {
    totalMemories: number;
    criticalVulnerabilities: number;
    resolvedIssues: number;
    recurringIssues: number;
    mostCommonIssueTypes: Array<{ name: string; value: number }>;
    projectHealthTrend: Array<{ date: string; score: number }>;
  };
  standards: Standard[];
  onSelectProject: (projectId: string) => void;
  onImportProject: (project: Project) => void;
  onAddActivity: (activity: Activity) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects, memories, activities, analytics, standards,
  onSelectProject, onImportProject, onAddActivity
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType]           = useState<'git' | 'zip' | 'folder' | 'file'>('folder');
  const [gitUrl, setGitUrl]                   = useState('');
  const [projectName, setProjectName]         = useState('');
  const [isIngesting, setIsIngesting]         = useState(false);
  const [ingestionLogs, setIngestionLogs]     = useState<string[]>([]);
  const [ingestProgress, setIngestProgress]   = useState(0);
  const [selectedFiles, setSelectedFiles]     = useState<File[]>([]);

  const totalProjects = projects.length;
  const memoriesCount = memories.length;
  const avgOverall = Math.round(projects.reduce((a, p) => a + p.overallScore, 0) / (totalProjects || 1));

  const trendData = analytics?.projectHealthTrend?.length
    ? analytics.projectHealthTrend
    : [
        { date: 'May 15', score: 65 }, { date: 'May 22', score: 70 },
        { date: 'May 29', score: 72 }, { date: 'Jun 05', score: 78 },
        { date: 'Jun 12', score: 81 }, { date: 'Today',  score: 85 }
      ];

  const generatePath = (data: Array<{ score: number }>) =>
    data.map((d, i) => {
      const x = 50 + (i * 430) / (data.length - 1 || 1);
      const y = 170 - (d.score * 140) / 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

  const healthPath    = generatePath(trendData);
  const healthArea    = `${healthPath} L 480 170 L 50 170 Z`;
  const reviewData    = trendData.map((t, i) => ({ score: Math.max(30, t.score - 15 + Math.sin(i) * 8) }));
  const reviewPath    = generatePath(reviewData);
  const lastX         = 480;
  const lastYHealth   = 170 - (trendData[trendData.length - 1].score * 140) / 100;
  const lastYReview   = 170 - (reviewData[reviewData.length - 1].score * 140) / 100;

  // ─── Extract uploaded files to { name, path, code } ──────────────────────
  const extractFilesFromInput = async (
    fileList: File[],
    log: (msg: string) => void
  ): Promise<Array<{ name: string; path: string; code: string }>> => {
    const result: Array<{ name: string; path: string; code: string }> = [];

    for (const file of fileList) {
      const lname = file.name.toLowerCase();

      // ── ZIP archive ──────────────────────────────────────────────────────
      if (lname.endsWith('.zip')) {
        log(`📦 Extracting ZIP: ${file.name}…`);
        try {
          const buf    = await file.arrayBuffer();
          const zip    = await JSZip.loadAsync(buf);
          const zipRoot = file.name.replace(/\.zip$/i, '');

          const entries = Object.values(zip.files).filter(e => !e.dir);
          for (const entry of entries) {
            const entryPath = `${zipRoot}/${entry.name}`;
            if (isIgnoredPath(entryPath)) continue;
            const fname = entry.name.split('/').pop() ?? '';
            if (!isCodeFile(fname)) continue;

            const content = await entry.async('string');
            result.push({ name: fname, path: entryPath.replace(/\\/g, '/'), code: content });
          }
          log(`✅ Extracted ${result.length} code files from ZIP.`);
        } catch (err) {
          log(`⚠️ Failed to extract ZIP: ${String(err)}`);
        }
        continue;
      }

      // ── Regular file or folder member ───────────────────────────────────
      const path = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
      if (isIgnoredPath(path)) continue;
      if (!isCodeFile(file.name)) continue;

      const code = await new Promise<string>(res => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string) ?? '');
        reader.onerror = () => res('');
        reader.readAsText(file);
      });

      result.push({ name: file.name, path, code });
    }

    return result;
  };

  // ─── Main Ingestion Handler ───────────────────────────────────────────────
  const handleStartIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (importType === 'git' && !gitUrl) return;
    if (importType !== 'git' && selectedFiles.length === 0) return;

    const projId = `proj-${Date.now()}`;
    const name   = projectName || (importType === 'git'
      ? gitUrl.split('/').pop()?.replace('.git', '') ?? 'imported-repo'
      : 'uploaded-project');

    setIsIngesting(true);
    setIngestionLogs([]);
    setIngestProgress(0);

    const log = (msg: string) =>
      setIngestionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const start = Date.now();

    try {
      log(`🚀 Initializing CodeMind AI analysis engine for "${name}"…`);
      await delay(500);
      setIngestProgress(10);

      // ── GIT (demo) ───────────────────────────────────────────────────────
      if (importType === 'git') {
        log(`🌐 Cloning repository: ${gitUrl}`);
        await delay(1200);
        setIngestProgress(50);
        log(`🔍 Parsing source tree…`);
        await delay(800);
        setIngestProgress(80);

        const mock      = INITIAL_PROJECTS[0];
        const duration  = Date.now() - start;
        const lines     = mock.files.reduce((a, f) => a + (f.code?.split('\n').length ?? 0), 0);
        const langs     = [...new Set(mock.files.map(f => f.name.split('.').pop()?.toUpperCase()).filter(Boolean))] as string[];

        const newProj: Project = {
          ...mock,
          id: projId,
          name,
          description: `Ingested from Git: ${gitUrl}`,
          files: mock.files.map(f => ({
            ...f,
            id: `file-${projId}-${Math.random().toString(36).slice(2, 8)}`,
            projectId: projId,
            riskScore: computeRiskScore(f.issues)
          })),
          analysisStats: {
            filesParsed: mock.files.length, filesFailed: 0, linesProcessed: lines,
            detectedLanguages: langs, analysisDurationMs: duration,
            totalFindings: mock.files.reduce((a, f) => a + f.issues.length, 0)
          }
        };
        setIngestProgress(100);
        log(`✅ Project "${name}" successfully ingested via Git.`);
        await delay(400);
        finishIngest(newProj, log);
        return;
      }

      // ── FILE / FOLDER / ZIP ──────────────────────────────────────────────
      log(`📂 Reading uploaded files…`);
      setIngestProgress(20);

      const parsedFiles = await extractFilesFromInput(selectedFiles, log);

      if (parsedFiles.length === 0) {
        log(`⚠️ No valid source code files found. Make sure to upload a folder with .ts / .js / .py / .go etc. files.`);
        setIsIngesting(false);
        return;
      }

      log(`📋 Found ${parsedFiles.length} source file(s). Starting analysis…`);
      setIngestProgress(30);

      const allPaths = parsedFiles.map(f => f.path);
      const projectFiles: ProjectFile[] = [];
      const hasGroq = !!import.meta.env.VITE_GROQ_API_KEY;

      if (hasGroq) {
        log(`🤖 Groq AI (llama-3.3-70b-versatile) active — deep semantic analysis enabled.`);
      } else {
        log(`🔍 Local syntactic scanner active (add VITE_GROQ_API_KEY for AI analysis).`);
      }

      let filesParsed = 0;
      let filesFailed = 0;

      for (let i = 0; i < parsedFiles.length; i++) {
        const f = parsedFiles[i];
        const displayPath = f.path.length > 60 ? `…${f.path.slice(-57)}` : f.path;
        log(`${hasGroq ? '🤖' : '🔍'} Scanning [${i + 1}/${parsedFiles.length}]: ${displayPath}`);

        try {
          const issues  = await scanWithGroq(f.name, f.path, f.code, standards);
          const deps    = resolveDependencies(f.path, f.code, allPaths);
          const { imports, exports } = extractImportsExports(f.name, f.code);

          const riskState = issues.some(i => i.severity === 'critical') ? 'critical'
            : issues.some(i => i.severity === 'high')   ? 'high'
            : issues.some(i => i.severity === 'medium') ? 'medium'
            : 'safe';

          projectFiles.push({
            id:           `file-${projId}-${i}`,
            projectId:    projId,           // ← always the same project ID
            name:         f.name,
            path:         f.path,
            isDir:        false,
            code:         f.code,
            riskState,
            riskScore:    0,
            issues,
            dependencies: deps,
            imports,
            exports,
            size:         f.code.length
          });
          filesParsed++;
        } catch (err) {
          console.error(`Failed scanning ${f.path}:`, err);
          filesFailed++;
          projectFiles.push({
            id: `file-${projId}-${i}`, projectId: projId,
            name: f.name, path: f.path, isDir: false,
            code: f.code, riskState: 'safe', riskScore: 0,
            issues: [], dependencies: [], imports: [], exports: [], size: f.code.length
          });
        }

        setIngestProgress(30 + Math.round(((i + 1) / parsedFiles.length) * 45));
      }

      // Cross-file passes
      log(`🔁 Running circular dependency detection…`);
      const mkId = () => `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      detectCircularDeps(projectFiles).forEach(({ path, cycle }) => {
        const f = projectFiles.find(f => f.path === path);
        if (f) {
          f.issues.push({ id: mkId(), line: 1, type: 'Circular Dependencies', severity: 'high',
            explanation: `Circular import cycle: ${cycle.join(' → ')}`,
            recommendedFix: '// Break the cycle via interfaces, events, or a shared util.', applied: false });
          if (f.riskState === 'safe' || f.riskState === 'medium') f.riskState = 'high';
        }
      });

      log(`🔁 Detecting duplicate logic blocks…`);
      detectDuplicateLogic(projectFiles).forEach(({ path, line, explanation }) => {
        const f = projectFiles.find(f => f.path === path);
        if (f) {
          f.issues.push({ id: mkId(), line, type: 'Duplicate Logic', severity: 'medium',
            explanation, recommendedFix: '// Extract into a shared helper function.', applied: false });
          if (f.riskState === 'safe') f.riskState = 'medium';
        }
      });

      log(`🔁 Checking for unused exported symbols…`);
      detectUnusedExports(projectFiles).forEach(({ path, symbol, explanation }) => {
        const f = projectFiles.find(f => f.path === path);
        if (f) {
          f.issues.push({ id: mkId(), line: 1, type: 'Unused Code', severity: 'medium',
            explanation, recommendedFix: '// Remove or import the symbol elsewhere.', applied: false });
          if (f.riskState === 'safe') f.riskState = 'medium';
        }
      });

      // Compute per-file risk scores
      projectFiles.forEach(f => { f.riskScore = computeRiskScore(f.issues); });

      setIngestProgress(85);
      log(`📊 Computing health scores…`);

      const totalIssues   = projectFiles.reduce((a, f) => a + f.issues.length, 0);
      const critCount     = projectFiles.reduce((a, f) => a + f.issues.filter(i => i.severity === 'critical').length, 0);
      const highCount     = projectFiles.reduce((a, f) => a + f.issues.filter(i => i.severity === 'high').length, 0);
      const dupCount      = projectFiles.reduce((a, f) => a + f.issues.filter(i => i.type === 'Duplicate Logic' || i.type === 'Unused Code').length, 0);
      const largeCount    = projectFiles.reduce((a, f) => a + f.issues.filter(i => i.type === 'Large File').length, 0);

      const secScore  = Math.max(10, 100 - critCount * 22 - highCount * 12);
      const archScore = Math.max(15, 100 - dupCount * 10 - (totalIssues - critCount - highCount) * 5);
      const perfScore = Math.max(20, 100 - largeCount * 15);
      const maintScore = Math.max(20, 100 - dupCount * 8 - largeCount * 10 - (totalIssues * 2));
      const overallScore = Math.round((secScore + archScore + perfScore + maintScore) / 4);

      const langs = [...new Set(projectFiles.map(f => f.name.split('.').pop()?.toUpperCase()).filter(Boolean))] as string[];
      const linesProcessed = projectFiles.reduce((a, f) => a + (f.code?.split('\n').length ?? 0), 0);

      const newProj: Project = {
        id: projId,
        name,
        description: `Ingested ${projectFiles.length} file(s) — ${linesProcessed.toLocaleString()} lines analysed.`,
        language: langs[0] ?? 'Code',
        status: 'ready',
        overallScore,
        securityScore: secScore,
        architectureScore: archScore,
        performanceScore: perfScore,
        maintainabilityScore: maintScore,
        branch: 'local',
        commitHash: Math.random().toString(16).slice(2, 9),
        files: projectFiles,
        analysisStats: {
          filesParsed, filesFailed,
          linesProcessed,
          detectedLanguages: langs,
          analysisDurationMs: Date.now() - start,
          totalFindings: totalIssues
        }
      };

      setIngestProgress(100);
      log(`✅ SUCCESS: "${name}" ingested — ${filesParsed} files, ${totalIssues} findings, score ${overallScore}%.`);
      await delay(400);
      finishIngest(newProj, log);

    } catch (err) {
      console.error(err);
      log(`❌ ERROR: Ingestion pipeline failed — ${String(err)}`);
      setIsIngesting(false);
    }
  };

  const finishIngest = (proj: Project, _log: (m: string) => void) => {
    onImportProject(proj);
    onAddActivity({
      id: `act-${Date.now()}`,
      text: `Ingested project "${proj.name}" — ${proj.files.length} file(s), ${proj.analysisStats?.totalFindings ?? 0} findings.`,
      type: 'success',
      time: 'Just now',
      projectId: proj.id
    });
    setIsIngesting(false);
    setShowImportModal(false);
    setProjectName('');
    setGitUrl('');
    setSelectedFiles([]);
  };

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container">
      {/* Title */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Workspace Console</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Overview of repositories audit compliance metrics.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
          <Plus size={16} /> Ingest Project
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="stats-card">
          <div className="stats-label">Total Projects</div>
          <div className="stats-value">{totalProjects}</div>
          <div className="stats-change positive"><span>Active repositories</span></div>
        </div>
        <div className="stats-card">
          <div className="stats-label">Memories Stored</div>
          <div className="stats-value">{analytics?.totalMemories ?? memoriesCount}</div>
          <div className="stats-change positive"><span>Hindsight intelligence</span></div>
        </div>
        <div className="stats-card">
          <div className="stats-label">Critical Open Vulns</div>
          <div className="stats-value" style={{ color: (analytics?.criticalVulnerabilities ?? 0) > 0 ? 'var(--critical-color)' : 'var(--success-color)' }}>
            {analytics?.criticalVulnerabilities ?? 0}
          </div>
          <div className="stats-change"><span>Vulnerability warnings</span></div>
        </div>
        <div className="stats-card">
          <div className="stats-label">Resolved Issues</div>
          <div className="stats-value" style={{ color: 'var(--success-color)' }}>{analytics?.resolvedIssues ?? 0}</div>
          <div className="stats-change positive"><span>Verified repairs applied</span></div>
        </div>
        <div className="stats-card">
          <div className="stats-label">Recurring Concerns</div>
          <div className="stats-value" style={{ color: (analytics?.recurringIssues ?? 0) > 0 ? 'var(--warning-color)' : 'var(--success-color)' }}>
            {analytics?.recurringIssues ?? 0}
          </div>
          <div className="stats-change"><span>Repeated code flaws</span></div>
        </div>
        <div className="stats-card">
          <div className="stats-label">Overall Health Score</div>
          <div className="stats-value" style={{ color: avgOverall > 80 ? 'var(--success-color)' : avgOverall > 60 ? 'var(--warning-color)' : 'var(--critical-color)' }}>
            {avgOverall}%
          </div>
          <div className="stats-change"><span>Average across items</span></div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="dashboard-body-grid">
        <div className="graph-card">
          <div className="card-title">
            <span>Project Review Trends &amp; Health History</span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'inline-block' }} />
                Health Index
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success-color)', display: 'inline-block' }} />
                Reviews Made
              </span>
            </div>
          </div>
          <div className="svg-graph-container">
            <svg viewBox="0 0 500 200" width="100%" height="100%" preserveAspectRatio="none">
              <line x1="50" y1="30"  x2="480" y2="30"  className="svg-chart-grid" />
              <line x1="50" y1="80"  x2="480" y2="80"  className="svg-chart-grid" />
              <line x1="50" y1="130" x2="480" y2="130" className="svg-chart-grid" />
              <line x1="50" y1="170" x2="480" y2="170" className="svg-chart-axis" />
              <text x="15" y="34"  className="svg-chart-label">100%</text>
              <text x="15" y="84"  className="svg-chart-label">75%</text>
              <text x="15" y="134" className="svg-chart-label">50%</text>
              <text x="15" y="174" className="svg-chart-label">0%</text>
              {trendData.map((t, i) => {
                const x = 50 + (i * 430) / (trendData.length - 1 || 1);
                return <text key={i} x={x - 15} y="190" className="svg-chart-label">{t.date}</text>;
              })}
              <path d={healthArea} className="svg-chart-area" />
              <path d={healthPath} className="svg-chart-line" />
              <path d={reviewPath} className="svg-chart-line-secondary" />
              <circle cx={lastX} cy={lastYHealth} r="4" fill="var(--primary-color)" />
              <circle cx={lastX} cy={lastYReview}  r="4" fill="var(--success-color)" />
            </svg>
          </div>
        </div>

        <div className="activity-card">
          <div className="card-title">Recent Intelligence Log</div>
          <div className="activity-list">
            {activities.map(act => (
              <div className="activity-item" key={act.id}>
                <div className={`activity-indicator ${act.type === 'critical' ? 'critical' : act.type === 'warning' ? 'warning' : act.type === 'success' ? 'success' : 'info'}`}>
                  {act.type === 'critical' ? '🔴' : act.type === 'warning' ? '⚠️' : act.type === 'success' ? '✓' : 'ℹ️'}
                </div>
                <div className="activity-details">
                  <div className="activity-text">{act.text}</div>
                  <div className="activity-time">{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="projects-card">
        <div className="card-title">Analyzed Codebases</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {projects.map(proj => (
            <div key={proj.id} style={{
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px', padding: '20px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{proj.name}</h3>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                    {proj.language}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4, height: '36px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {proj.description}
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <GitBranch size={12} /> {proj.branch}
                  </span>
                  <span>Files: {proj.files.filter(f => !f.isDir).length}</span>
                  <span>Findings: {proj.files.reduce((a, f) => a + f.issues.filter(i => !i.applied).length, 0)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Overall Health:</span>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: proj.overallScore > 80 ? 'var(--success-color)' : proj.overallScore > 60 ? 'var(--warning-color)' : 'var(--critical-color)' }}>
                    {proj.overallScore}%
                  </span>
                </div>
                <button className="btn" onClick={() => onSelectProject(proj.id)}>
                  Open Workspace <Play size={12} style={{ fill: 'currentColor' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ingestion Wizard Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Project Ingestion Wizard</h2>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => !isIngesting && setShowImportModal(false)}>
                <X size={18} />
              </button>
            </div>

            {isIngesting ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary-color)' }} size={18} />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    Analyzing codebase… ({ingestProgress}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${ingestProgress}%`, height: '100%', backgroundColor: 'var(--primary-color)', transition: 'width 0.3s ease' }} />
                </div>
                <div className="ingest-log-box">
                  {ingestionLogs.map((l, i) => (
                    <div key={i} className={`log-line ${l.includes('✅') || l.includes('SUCCESS') ? 'success' : l.includes('⚠️') || l.includes('❌') ? 'warning' : 'info'}`}>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleStartIngest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="ingestion-options-grid">
                  <div className={`ingestion-opt ${importType === 'git'    ? 'selected' : ''}`} onClick={() => setImportType('git')}>
                    <Globe size={20} className="logo-icon" /><span>Git Repository</span>
                  </div>
                  <div className={`ingestion-opt ${importType === 'zip'    ? 'selected' : ''}`} onClick={() => setImportType('zip')}>
                    <Upload size={20} className="logo-icon" /><span>ZIP Archive</span>
                  </div>
                  <div className={`ingestion-opt ${importType === 'folder' ? 'selected' : ''}`} onClick={() => setImportType('folder')}>
                    <FolderOpen size={20} className="logo-icon" /><span>Local Folder</span>
                  </div>
                  <div className={`ingestion-opt ${importType === 'file'   ? 'selected' : ''}`} onClick={() => setImportType('file')}>
                    <File size={20} className="logo-icon" /><span>Single File</span>
                  </div>
                </div>

                {importType === 'git' && (
                  <div className="form-group">
                    <label className="form-label">GitHub Repository URL</label>
                    <input className="form-input" type="text" placeholder="https://github.com/org/repo"
                      value={gitUrl} onChange={e => setGitUrl(e.target.value)} required />
                  </div>
                )}

                {importType === 'folder' && (
                  <div className="form-group">
                    <label className="form-label">Select Local Folder</label>
                    <input className="form-input" type="file"
                      // @ts-expect-error non-standard attr
                      webkitdirectory="" directory="" multiple
                      style={{ cursor: 'pointer' }}
                      onChange={e => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          const firstPath = files[0].webkitRelativePath || '';
                          setProjectName(firstPath.split('/')[0] || 'local-folder');
                          setSelectedFiles(Array.from(files));
                        }
                      }} required />
                    {selectedFiles.length > 0 && (
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {selectedFiles.length} file(s) selected — {selectedFiles.filter(f => isCodeFile(f.name) && !isIgnoredPath(f.webkitRelativePath || f.name)).length} source code file(s) will be analysed.
                      </p>
                    )}
                  </div>
                )}

                {importType === 'file' && (
                  <div className="form-group">
                    <label className="form-label">Select Single Code File</label>
                    <input className="form-input" type="file" style={{ cursor: 'pointer' }}
                      onChange={e => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          setProjectName(files[0].name.replace(/\.[^/.]+$/, ''));
                          setSelectedFiles(Array.from(files));
                        }
                      }} required />
                  </div>
                )}

                {importType === 'zip' && (
                  <div className="form-group">
                    <label className="form-label">Select ZIP Archive</label>
                    <input className="form-input" type="file" accept=".zip" style={{ cursor: 'pointer' }}
                      onChange={e => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          setProjectName(files[0].name.replace(/\.zip$/i, ''));
                          setSelectedFiles(Array.from(files));
                        }
                      }} required />
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      📦 ZIP archives will be automatically extracted and all source files analysed.
                    </p>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Custom Project Alias (Optional)</label>
                  <input className="form-input" type="text" placeholder="Enter project name…"
                    value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button type="button" className="btn" onClick={() => setShowImportModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Ingest &amp; Scan</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
