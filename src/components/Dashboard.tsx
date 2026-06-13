import React, { useState } from 'react';
import type { Project, Activity, Memory, Standard, ProjectFile, Issue } from '../types';
import { GitBranch, FolderOpen, Play, Plus, X, Globe, Upload, File, Loader } from 'lucide-react';
import { INITIAL_PROJECTS } from '../mockData';
import JSZip from 'jszip';

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Directory / path segments that are always skipped */
const IGNORED_SEGMENTS = new Set([
  'node_modules', 'venv', '.git', 'dist', 'build', '.next', 'out',
  '.idea', '.vscode', '__pycache__', '.DS_Store', 'coverage',
  '.nyc_output', '.turbo', 'target', 'bin', 'obj', 'vendor',
  '.gradle', '.mvn', 'Pods', 'DerivedData',
]);

/** Extensions treated as source code → full AI analysis */
const CODE_EXTS = new Set([
  'js', 'ts', 'tsx', 'jsx', 'py', 'go', 'java', 'cpp', 'c', 'h', 'hpp',
  'cs', 'rb', 'rs', 'swift', 'kt', 'php', 'vue', 'svelte', 'mjs', 'cjs',
  'dart', 'scala', 'clj', 'ex', 'exs', 'r', 'lua', 'pl', 'sh', 'bash',
]);

/** Extensions that are readable text but not analysed by AI */
const TEXT_EXTS = new Set([
  ...CODE_EXTS,
  'json', 'jsonc', 'json5', 'md', 'mdx', 'txt', 'yml', 'yaml', 'toml',
  'xml', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'styl', 'sql',
  'graphql', 'gql', 'env', 'config', 'conf', 'ini', 'cfg', 'lock',
  'gitignore', 'dockerignore', 'dockerfile', 'makefile', 'rakefile',
  'gemfile', 'procfile', 'readme', 'license', 'changelog',
]);

/** Extensions always skipped (binary / media) */
const BINARY_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff',
  'woff', 'woff2', 'ttf', 'eot', 'otf', 'mp3', 'mp4', 'wav', 'ogg',
  'avi', 'mov', 'pdf', 'zip', 'tar', 'gz', 'rar', '7z', 'jar', 'war',
  'class', 'pyc', 'pyo', 'so', 'dll', 'exe', 'bin', 'wasm',
]);

const isIgnoredPath = (p: string) => {
  const segs = p.toLowerCase().replace(/\\/g, '/').split('/');
  return segs.some(s => IGNORED_SEGMENTS.has(s));
};

const getExt = (name: string) => (name.split('.').pop() ?? '').toLowerCase();

const isCodeFile  = (name: string) => CODE_EXTS.has(getExt(name));
const isTextFile  = (name: string) => TEXT_EXTS.has(getExt(name));
const isBinaryFile = (name: string) => BINARY_EXTS.has(getExt(name));

const detectLanguage = (name: string): string => {
  const ext = getExt(name);
  const MAP: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
    mjs: 'JavaScript', cjs: 'JavaScript', py: 'Python', go: 'Go',
    java: 'Java', cpp: 'C++', c: 'C', h: 'C/C++', hpp: 'C++', cs: 'C#',
    rb: 'Ruby', rs: 'Rust', swift: 'Swift', kt: 'Kotlin', php: 'PHP',
    vue: 'Vue', svelte: 'Svelte', dart: 'Dart', scala: 'Scala',
    sh: 'Shell', bash: 'Shell', sql: 'SQL', html: 'HTML', css: 'CSS',
    scss: 'SCSS', json: 'JSON', yml: 'YAML', yaml: 'YAML', md: 'Markdown',
    graphql: 'GraphQL', gql: 'GraphQL', lua: 'Lua', r: 'R',
  };
  return MAP[ext] ?? ext.toUpperCase() ?? 'Text';
};

// ─────────────────────────────────────────────────────────────────────────────
//  Import / Export Extractor
// ─────────────────────────────────────────────────────────────────────────────

const extractImportsExports = (name: string, code: string) => {
  const ext = getExt(name);
  const imports: string[] = [];
  const exports: string[] = [];
  try {
    if (['js', 'ts', 'tsx', 'jsx', 'mjs', 'cjs', 'vue', 'svelte'].includes(ext)) {
      let m;
      const ir = /from\s+['"]([^'"]+)['"]/g;
      const rr = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
      const er = /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
      while ((m = ir.exec(code))) imports.push(m[1]);
      while ((m = rr.exec(code))) imports.push(m[1]);
      while ((m = er.exec(code))) exports.push(m[1]);
    } else if (ext === 'py') {
      let m;
      while ((m = /^import\s+(\w+)/gm.exec(code))) imports.push(m[1]);
      while ((m = /^from\s+([\w.]+)\s+import/gm.exec(code))) imports.push(m[1]);
      while ((m = /^(?:def|class)\s+(\w+)/gm.exec(code))) exports.push(m[1]);
    } else if (ext === 'go') {
      let m;
      while ((m = /import\s+"([^"]+)"/g.exec(code))) imports.push(m[1]);
      const block = code.match(/import\s*\(\s*([\s\S]*?)\)/);
      if (block) block[1].split('\n').forEach(l => { const mm = l.match(/"([^"]+)"/); if (mm) imports.push(mm[1]); });
      while ((m = /^func\s+(\w+)/gm.exec(code))) { if (m[1][0] === m[1][0].toUpperCase()) exports.push(m[1]); }
    } else if (ext === 'java') {
      let m;
      while ((m = /import\s+([\w.]+);/g.exec(code))) imports.push(m[1]);
      while ((m = /public\s+(?:class|interface|enum)\s+(\w+)/g.exec(code))) exports.push(m[1]);
    } else if (['cpp', 'c', 'h', 'hpp'].includes(ext)) {
      let m;
      while ((m = /#include\s+["<]([^">]+)[">]/g.exec(code))) imports.push(m[1]);
      while ((m = /(?:class|struct)\s+(\w+)/g.exec(code))) exports.push(m[1]);
    } else if (ext === 'cs') {
      let m;
      while ((m = /using\s+([\w.]+);/g.exec(code))) imports.push(m[1]);
      while ((m = /public\s+(?:class|interface|struct)\s+(\w+)/g.exec(code))) exports.push(m[1]);
    }
  } catch { /* ignore */ }
  return { imports: [...new Set(imports)], exports: [...new Set(exports)] };
};

// ─────────────────────────────────────────────────────────────────────────────
//  Local Static Scanner
// ─────────────────────────────────────────────────────────────────────────────

const scanLocal = (code: string, stds: Standard[]): Issue[] => {
  const issues: Issue[] = [];
  const mk = () => `iss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  code.split('\n').forEach((line, i) => {
    const ln = i + 1;
    const nc = !line.trimStart().startsWith('//') && !line.trimStart().startsWith('#');
    if (nc) {
      if (/(?:api_key|secret|password|passwd|private_key|token)\s*=\s*['"][a-zA-Z0-9_\-+=/]{15,}['"]/i.test(line))
        issues.push({ id: mk(), line: ln, type: 'Hardcoded API Keys', severity: 'critical', applied: false,
          explanation: 'Hardcoded secret/token detected. Credentials must never be in source code.',
          recommendedFix: 'const apiKey = process.env.API_KEY;' });
      if (/(SELECT|INSERT|UPDATE|DELETE).*\+.*\b/i.test(line) || /(SELECT|INSERT|UPDATE|DELETE).*\$\{.*\}/i.test(line))
        issues.push({ id: mk(), line: ln, type: 'SQL Injection', severity: 'critical', applied: false,
          explanation: 'SQL built via string concatenation — injection risk.',
          recommendedFix: 'db.query("SELECT * FROM t WHERE id = ?", [id])' });
      if (/\beval\s*\(/.test(line))
        issues.push({ id: mk(), line: ln, type: 'Unsafe eval()', severity: 'high', applied: false,
          explanation: 'eval() enables arbitrary code execution.',
          recommendedFix: '// Replace with JSON.parse() or structured lookups' });
      if (/os\.system\(|subprocess\.call\(|exec\s*\(|spawn\s*\(/i.test(line))
        issues.push({ id: mk(), line: ln, type: 'Command Injection', severity: 'high', applied: false,
          explanation: 'Unsanitized input may reach shell execution.',
          recommendedFix: 'subprocess.run(["cmd", arg], check=True)' });
      if (/console\.log\(.*(password|secret|token|key|pwd).*\)/i.test(line))
        issues.push({ id: mk(), line: ln, type: 'Sensitive Logging', severity: 'medium', applied: false,
          explanation: 'Credential logged to console — leakage risk.',
          recommendedFix: '// Remove sensitive parameter from log' });
      if (/\bmd5\b|\bsha1\b|\bDES\b/i.test(line))
        issues.push({ id: mk(), line: ln, type: 'Weak Encryption', severity: 'high', applied: false,
          explanation: 'Deprecated algorithm (MD5/SHA1/DES) detected.',
          recommendedFix: '// Use SHA-256 / bcrypt / argon2' });
    }
    stds.forEach(s => {
      if (!s.enabled || !s.ruleKeyword) return;
      if (line.toLowerCase().includes(s.ruleKeyword.toLowerCase()) && !issues.some(iss => iss.line === ln && iss.type === s.name))
        issues.push({ id: mk(), line: ln, type: s.name,
          severity: s.severity === 'critical' ? 'critical' : 'medium', applied: false,
          explanation: `Team standard: "${s.description}"`,
          recommendedFix: `// Refactor per: ${s.description}` });
    });
  });
  if (code.split('\n').length > 100)
    issues.push({ id: `${mk()}-large`, line: 1, type: 'Large File', severity: 'medium', applied: false,
      explanation: `File is ${code.split('\n').length} lines. Consider splitting into modules.`,
      recommendedFix: '// Decompose into smaller focused modules.' });
  return issues;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Groq AI Scanner
// ─────────────────────────────────────────────────────────────────────────────

const scanWithGroq = async (name: string, path: string, code: string, stds: Standard[]): Promise<Issue[]> => {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) return scanLocal(code, stds);

  const mk = () => `iss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const enabled = stds.filter(s => s.enabled);

  const sys = `You are CodeMind AI — a strict code security and quality analyser.
Analyse ONLY what is visible in the code provided. NEVER invent or hallucinate issues.
Detect ONLY these categories (skip any that are absent):
1. Hardcoded API Keys — credentials / tokens hardcoded
2. SQL Injection — raw string concat in DB queries
3. Command Injection — unsanitized input to shell/exec
4. Unsafe eval() — dynamic code evaluation
5. Exposed Secrets — passwords, private keys, connection strings
6. Sensitive Logging — printing credentials to console
7. Weak Encryption — MD5, SHA1, DES usage
8. Missing Authentication — unprotected endpoints
9. Weak Validation — absent or trivial input sanitization
10. Large Functions — functions exceeding 80 lines
11. JWT Problems — weak secrets, no expiry
Team standards: ${JSON.stringify(enabled.map(s => ({ name: s.name, desc: s.description, kw: s.ruleKeyword })))}
Return ONLY valid JSON: {"issues":[{"line":N,"type":"...","severity":"critical|high|medium","explanation":"...","recommendedFix":"..."}]}
If nothing found: {"issues":[]}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: `File: ${path}\n\n${code.slice(0, 8000)}` }],
        temperature: 0.05,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return scanLocal(code, stds);
    const data = await res.json();
    let txt = data.choices?.[0]?.message?.content ?? '{}';
    const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) txt = fence[1].trim();
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed.issues)) return scanLocal(code, stds);
    return parsed.issues.map((i: Record<string, unknown>) => ({
      id: mk(), line: Number(i.line) || 1,
      type: String(i.type || 'AI Finding'),
      severity: ['critical','high','medium'].includes(String(i.severity)) ? i.severity as Issue['severity'] : 'medium',
      explanation: String(i.explanation || 'Code quality issue.'),
      recommendedFix: String(i.recommendedFix || '// Refactor per best practices'),
      applied: false,
    }));
  } catch {
    return scanLocal(code, stds);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Dependency Resolver
// ─────────────────────────────────────────────────────────────────────────────

const resolveDeps = (filePath: string, code: string, allPaths: string[]): string[] => {
  const { imports } = extractImportsExports(filePath.split('/').pop() ?? '', code);
  const deps = new Set<string>();
  const dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : '';
  for (const imp of imports) {
    if (imp.startsWith('.')) {
      const parts = dir ? dir.split('/') : [];
      imp.split('/').forEach(seg => {
        if (seg === '.') { /* noop */ } else if (seg === '..') parts.pop(); else parts.push(seg);
      });
      const base = parts.join('/');
      const hit = allPaths.find(p => {
        const woExt = p.includes('.') ? p.slice(0, p.lastIndexOf('.')) : p;
        return woExt === base || p === base;
      });
      if (hit) deps.add(hit);
    } else {
      const stem = imp.split('/').pop()?.split('.')[0]?.toLowerCase() ?? '';
      const hit = allPaths.find(p => {
        const ps = p.split('/').pop()?.split('.')[0]?.toLowerCase() ?? '';
        return ps === stem || p.toLowerCase().includes(`/${imp.toLowerCase()}.`);
      });
      if (hit) deps.add(hit);
    }
  }
  return [...deps];
};

// ─────────────────────────────────────────────────────────────────────────────
//  Cross-file Analysis
// ─────────────────────────────────────────────────────────────────────────────

const detectCircularDeps = (files: ProjectFile[]) => {
  const cycles: { path: string; cycle: string[] }[] = [];
  const visited = new Set<string>(), stack = new Set<string>();
  const dfs = (p: string, trail: string[]): string[] | null => {
    if (stack.has(p)) { const s = trail.indexOf(p); return [...trail.slice(s), p]; }
    if (visited.has(p)) return null;
    visited.add(p); stack.add(p);
    for (const d of files.find(f => f.path === p)?.dependencies ?? []) {
      const c = dfs(d, [...trail, p]); if (c) { stack.delete(p); return c; }
    }
    stack.delete(p); return null;
  };
  files.forEach(f => { if (!visited.has(f.path)) { const c = dfs(f.path, []); if (c) cycles.push({ path: f.path, cycle: c }); } });
  return cycles;
};

const detectDuplicateLogic = (files: ProjectFile[]) => {
  const seen = new Map<string, { path: string; line: number }>();
  const dups: { path: string; line: number; explanation: string }[] = [];
  files.forEach(f => {
    if (!f.code || !f.isCode) return;
    const lines = f.code.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));
    for (let i = 0; i <= lines.length - 5; i++) {
      const blk = lines.slice(i, i + 5).join('\n');
      if (blk.length < 60) continue;
      if (seen.has(blk)) {
        const o = seen.get(blk)!;
        if (o.path !== f.path) { dups.push({ path: f.path, line: i + 1, explanation: `Duplicate 5-line block also in ${o.path}:${o.line}` }); break; }
      } else seen.set(blk, { path: f.path, line: i + 1 });
    }
  });
  return dups;
};

const detectUnusedExports = (files: ProjectFile[]) => {
  const safe = new Set(['App', 'main', 'index', 'default', 'router', 'Routes', 'handler', 'middleware']);
  return files.flatMap(f =>
    (f.exports ?? [])
      .filter(sym => !safe.has(sym) && !files.filter(o => o.id !== f.id).some(o => o.code?.includes(sym)))
      .map(sym => ({ path: f.path, symbol: sym, explanation: `"${sym}" exported but never imported elsewhere.` }))
  );
};

const computeRisk = (issues: Issue[]): number =>
  Math.min(100, issues.filter(i => !i.applied).reduce((s, i) =>
    s + (i.severity === 'critical' ? 45 : i.severity === 'high' ? 25 : i.severity === 'medium' ? 12 : 5), 0));

// ─────────────────────────────────────────────────────────────────────────────
//  GitHub API Repository Fetcher
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedFile {
  name: string;
  path: string;   // prefixed with repoName/ or folder root
  code: string;
  isCode: boolean;
  size: number;
}

const fetchGitHubFiles = async (
  gitUrl: string,
  log: (m: string) => void,
  setProgress: (n: number) => void
): Promise<{ files: ParsedFile[]; foldersFound: number; repoName: string; branch: string }> => {
  // Parse URL: https://github.com/owner/repo or git@github.com:owner/repo
  const match = gitUrl.replace(/\.git$/, '').match(/github\.com[/:]([^/]+)\/([^/\s]+)/);
  if (!match) throw new Error('Invalid GitHub URL. Expected: https://github.com/owner/repo');
  const owner = match[1];
  const repoName = match[2];

  log(`🌐 Connecting to GitHub API for: ${owner}/${repoName}…`);

  const headers: Record<string, string> = { 'Accept': 'application/vnd.github+json' };

  // Get repo metadata
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });
  if (!repoRes.ok) {
    if (repoRes.status === 404) throw new Error(`Repository not found: ${owner}/${repoName}. Check it's public.`);
    if (repoRes.status === 403) throw new Error('GitHub API rate limit hit. Wait 60 mins or upload a ZIP instead.');
    throw new Error(`GitHub API error: ${repoRes.status} ${repoRes.statusText}`);
  }
  const repoMeta = await repoRes.json();
  const branch: string = repoMeta.default_branch ?? 'main';
  const repoLang: string = repoMeta.language ?? '';
  log(`📦 ${repoMeta.full_name} · branch: ${branch} · language: ${repoLang || 'mixed'} · ${repoMeta.stargazers_count ?? 0} ⭐`);
  setProgress(15);

  // Fetch full recursive tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/git/trees/${branch}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) throw new Error(`Failed to fetch file tree: ${treeRes.status}`);
  const treeData = await treeRes.json();
  if (treeData.truncated) log(`⚠️ Repo has >100k objects — showing first batch.`);

  type TreeItem = { path: string; type: 'blob' | 'tree'; size?: number };
  const allItems: TreeItem[] = treeData.tree ?? [];
  const dirs  = allItems.filter(i => i.type === 'tree' && !isIgnoredPath(i.path));
  const blobs = allItems.filter(i => i.type === 'blob' && !isIgnoredPath(i.path) && !isBinaryFile(i.path.split('/').pop() ?? ''));
  const codeBlobs  = blobs.filter(i => isCodeFile(i.path.split('/').pop() ?? ''));

  log(`📂 Tree: ${dirs.length} folders, ${blobs.length} readable files (${codeBlobs.length} source code files)`);
  setProgress(25);

  const files: ParsedFile[] = [];

  // Non-code text files — add to tree display without fetching content
  blobs.filter(i => !isCodeFile(i.path.split('/').pop() ?? '')).forEach(i => {
    files.push({
      name: i.path.split('/').pop() ?? i.path,
      path: `${repoName}/${i.path}`,
      code: `// ${i.path}\n// Non-source file (${i.size ?? 0} bytes) — click to view raw on GitHub`,
      isCode: false,
      size: i.size ?? 0,
    });
  });

  // Fetch content for code files (respect rate limit)
  const RATE_LIMIT = 75;
  const toFetch = codeBlobs.slice(0, RATE_LIMIT);
  if (codeBlobs.length > RATE_LIMIT) {
    log(`⚠️ Large repo: fetching content for first ${RATE_LIMIT}/${codeBlobs.length} code files (GitHub API rate limit). Upload a ZIP for full analysis.`);
  }

  for (let i = 0; i < toFetch.length; i++) {
    const blob = toFetch[i];
    try {
      const r = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${blob.path}?ref=${branch}`,
        { headers }
      );
      if (!r.ok) {
        files.push({ name: blob.path.split('/').pop() ?? blob.path, path: `${repoName}/${blob.path}`, code: '// Content unavailable', isCode: true, size: blob.size ?? 0 });
        continue;
      }
      const c = await r.json();
      const code = c.content ? atob(c.content.replace(/\n/g, '')) : '// Empty file';
      files.push({ name: blob.path.split('/').pop() ?? blob.path, path: `${repoName}/${blob.path}`, code, isCode: true, size: blob.size ?? 0 });
    } catch {
      files.push({ name: blob.path.split('/').pop() ?? blob.path, path: `${repoName}/${blob.path}`, code: '// Fetch error', isCode: true, size: blob.size ?? 0 });
    }
    if (i % 5 === 0) setProgress(25 + Math.round(((i + 1) / toFetch.length) * 30));
  }

  // Code files beyond fetch limit — tree entry only, no content
  codeBlobs.slice(RATE_LIMIT).forEach(blob => {
    files.push({
      name: blob.path.split('/').pop() ?? blob.path,
      path: `${repoName}/${blob.path}`,
      code: `// Content not fetched — repo exceeds free GitHub API rate limit.\n// Upload a ZIP for full analysis.`,
      isCode: true,
      size: blob.size ?? 0,
    });
  });

  return { files, foldersFound: dirs.length, repoName, branch };
};

// ─────────────────────────────────────────────────────────────────────────────
//  File / Folder / ZIP Extractor
// ─────────────────────────────────────────────────────────────────────────────

const extractLocalFiles = async (
  fileList: File[],
  log: (m: string) => void
): Promise<{ files: ParsedFile[]; foldersFound: number }> => {
  const result: ParsedFile[] = [];
  const folderSet = new Set<string>();

  for (const file of fileList) {
    const lname = file.name.toLowerCase();

    // ── ZIP ──────────────────────────────────────────────────────────────────
    if (lname.endsWith('.zip')) {
      log(`📦 Extracting ZIP: ${file.name}…`);
      try {
        const buf = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buf);
        const zipRoot = file.name.replace(/\.zip$/i, '');
        let extracted = 0;

        for (const [entryName, entry] of Object.entries(zip.files)) {
          if (entry.dir) {
            // Track folder
            const folderPath = `${zipRoot}/${entryName}`.replace(/\\/g, '/');
            if (!isIgnoredPath(folderPath)) folderSet.add(folderPath);
            continue;
          }
          const fullPath = `${zipRoot}/${entryName}`.replace(/\\/g, '/');
          if (isIgnoredPath(fullPath)) continue;
          const fname = entryName.split('/').pop() ?? '';
          if (isBinaryFile(fname)) continue;

          // Track all parent folders
          const parts = fullPath.split('/');
          for (let i = 1; i < parts.length - 1; i++) {
            folderSet.add(parts.slice(0, i + 1).join('/'));
          }

          try {
            const code = await entry.async('string');
            result.push({ name: fname, path: fullPath, code, isCode: isCodeFile(fname), size: code.length });
            extracted++;
          } catch { /* binary content, skip */ }
        }
        log(`✅ ZIP extracted: ${extracted} readable files.`);
      } catch (e) {
        log(`❌ ZIP extraction failed: ${e}`);
      }
      continue;
    }

    // ── Regular file / folder member ─────────────────────────────────────────
    const rawPath = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    if (isIgnoredPath(rawPath)) continue;
    if (isBinaryFile(file.name)) continue;
    if (!isTextFile(file.name)) continue; // skip unknown binary-like extensions

    // Track parent folders
    const parts = rawPath.split('/');
    for (let i = 1; i < parts.length - 1; i++) {
      folderSet.add(parts.slice(0, i + 1).join('/'));
    }

    const code = await new Promise<string>(res => {
      const reader = new FileReader();
      reader.onload  = () => res((reader.result as string) ?? '');
      reader.onerror = () => res('// Could not read file content');
      reader.readAsText(file);
    });

    result.push({ name: file.name, path: rawPath, code, isCode: isCodeFile(file.name), size: code.length });
  }

  return { files: result, foldersFound: folderSet.size };
};

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────

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
  onSelectProject: (id: string) => void;
  onImportProject: (p: Project) => void;
  onAddActivity: (a: Activity) => void;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const Dashboard: React.FC<DashboardProps> = ({
  projects, memories, activities, analytics, standards,
  onSelectProject, onImportProject, onAddActivity,
}) => {
  const [showModal,       setShowModal]       = useState(false);
  const [importType,      setImportType]      = useState<'git' | 'zip' | 'folder' | 'file'>('folder');
  const [gitUrl,          setGitUrl]          = useState('');
  const [projectName,     setProjectName]     = useState('');
  const [isIngesting,     setIsIngesting]     = useState(false);
  const [logs,            setLogs]            = useState<string[]>([]);
  const [progress,        setProgress]        = useState(0);
  const [selectedFiles,   setSelectedFiles]   = useState<File[]>([]);

  const addLog = (msg: string) =>
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const totalProjects = projects.length;
  const avgHealth = Math.round(projects.reduce((a, p) => a + p.overallScore, 0) / (totalProjects || 1));

  // ── SVG trend chart data ──────────────────────────────────────────────────
  const trendData = analytics?.projectHealthTrend?.length
    ? analytics.projectHealthTrend
    : [
        { date: 'May 15', score: 65 }, { date: 'May 22', score: 70 },
        { date: 'May 29', score: 72 }, { date: 'Jun 05', score: 78 },
        { date: 'Jun 12', score: 81 }, { date: 'Today',  score: 85 },
      ];
  const mkPath = (d: { score: number }[]) =>
    d.map((p, i) => `${i === 0 ? 'M' : 'L'} ${50 + (i * 430) / (d.length - 1 || 1)} ${170 - (p.score * 140) / 100}`).join(' ');
  const hPath  = mkPath(trendData);
  const hArea  = `${hPath} L 480 170 L 50 170 Z`;
  const rData  = trendData.map((t, i) => ({ score: Math.max(30, t.score - 15 + Math.sin(i) * 8) }));
  const rPath  = mkPath(rData);
  const lX     = 480;
  const lYh    = 170 - (trendData[trendData.length - 1].score * 140) / 100;
  const lYr    = 170 - (rData[rData.length - 1].score * 140) / 100;

  // ─────────────────────────────────────────────────────────────────────────
  //  Main Ingestion Pipeline
  // ─────────────────────────────────────────────────────────────────────────
  const handleStartIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (importType === 'git' && !gitUrl.trim()) return;
    if (importType !== 'git' && selectedFiles.length === 0) return;

    const projId  = `proj-${Date.now()}`;
    const startTs = Date.now();

    const baseName = importType === 'git'
      ? gitUrl.replace(/\.git$/, '').split('/').filter(Boolean).pop() ?? 'github-repo'
      : selectedFiles[0]?.webkitRelativePath?.split('/')[0] || projectName || selectedFiles[0]?.name?.replace(/\.[^/.]+$/, '') || 'project';

    const name = projectName.trim() || baseName;

    setIsIngesting(true);
    setLogs([]);
    setProgress(0);

    try {
      addLog(`🚀 CodeMind AI analysis engine initializing for "${name}"…`);
      await delay(300);

      // ── 1. Discover files ────────────────────────────────────────────────
      let parsedFiles: ParsedFile[] = [];
      let foldersFound = 0;
      let branch = 'local';

      if (importType === 'git') {
        const result = await fetchGitHubFiles(gitUrl.trim(), addLog, setProgress);
        parsedFiles   = result.files;
        foldersFound  = result.foldersFound;
        branch        = result.branch;
      } else {
        addLog(`📂 Reading uploaded files…`);
        setProgress(10);
        const result = await extractLocalFiles(selectedFiles, addLog);
        parsedFiles  = result.files;
        foldersFound = result.foldersFound;
        setProgress(40);
      }

      if (parsedFiles.length === 0) {
        addLog(`❌ No readable files found. Make sure to upload a folder or ZIP containing source code.`);
        setIsIngesting(false);
        return;
      }

      const codeFiles = parsedFiles.filter(f => f.isCode);
      addLog(`📋 Discovered: ${foldersFound} folders · ${parsedFiles.length} readable files · ${codeFiles.length} source code files`);
      setProgress(45);

      // ── 2. Scan each code file ───────────────────────────────────────────
      const allPaths = parsedFiles.map(f => f.path);
      const hasGroq  = !!import.meta.env.VITE_GROQ_API_KEY;

      if (hasGroq) addLog(`🤖 Groq AI (llama-3.3-70b-versatile) active — deep semantic analysis.`);
      else addLog(`🔍 Local syntactic scanner active (set VITE_GROQ_API_KEY for AI analysis).`);

      const projectFiles: ProjectFile[] = [];
      let filesParsed = 0, filesFailed = 0;

      // Add non-code files to the tree first (no analysis needed)
      parsedFiles.filter(f => !f.isCode).forEach((f, i) => {
        projectFiles.push({
          id: `file-${projId}-nc-${i}`, projectId: projId,
          name: f.name, path: f.path, isDir: false, isCode: false,
          language: detectLanguage(f.name),
          code: f.code, riskState: 'safe', riskScore: 0,
          issues: [], dependencies: [], imports: [], exports: [], size: f.size,
        });
      });

      // Scan code files
      for (let i = 0; i < codeFiles.length; i++) {
        const f = codeFiles[i];
        const display = f.path.length > 55 ? `…${f.path.slice(-52)}` : f.path;
        if (i % 3 === 0 || i === 0) addLog(`${hasGroq ? '🤖' : '🔍'} [${i + 1}/${codeFiles.length}] ${display}`);

        try {
          const issues  = f.code.startsWith('// Content not fetched') || f.code.startsWith('// Content unavailable')
            ? []
            : await scanWithGroq(f.name, f.path, f.code, standards);

          const deps    = resolveDeps(f.path, f.code, allPaths);
          const { imports, exports } = extractImportsExports(f.name, f.code);
          const riskState = issues.some(i => i.severity === 'critical') ? 'critical'
            : issues.some(i => i.severity === 'high')   ? 'high'
            : issues.some(i => i.severity === 'medium') ? 'medium' : 'safe';

          projectFiles.push({
            id: `file-${projId}-${i}`, projectId: projId,
            name: f.name, path: f.path, isDir: false, isCode: true,
            language: detectLanguage(f.name),
            code: f.code, riskState, riskScore: 0,
            issues, dependencies: deps, imports, exports, size: f.size,
          });
          filesParsed++;
        } catch (err) {
          console.error(`Failed scanning ${f.path}:`, err);
          filesFailed++;
          projectFiles.push({
            id: `file-${projId}-${i}`, projectId: projId,
            name: f.name, path: f.path, isDir: false, isCode: true,
            language: detectLanguage(f.name),
            code: f.code, riskState: 'safe', riskScore: 0,
            issues: [], dependencies: [], imports: [], exports: [], size: f.size,
          });
        }

        setProgress(45 + Math.round(((i + 1) / codeFiles.length) * 35));
      }

      // ── 3. Cross-file analysis ───────────────────────────────────────────
      const mk = () => `iss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      addLog(`🔁 Running cross-file analysis…`);

      detectCircularDeps(projectFiles.filter(f => f.isCode)).forEach(({ path, cycle }) => {
        const f = projectFiles.find(pf => pf.path === path);
        if (f) {
          f.issues.push({ id: mk(), line: 1, type: 'Circular Dependencies', severity: 'high', applied: false,
            explanation: `Circular import: ${cycle.join(' → ')}`,
            recommendedFix: '// Break cycle via interface or shared util.' });
          if (f.riskState === 'safe' || f.riskState === 'medium') f.riskState = 'high';
        }
      });

      detectDuplicateLogic(projectFiles).forEach(({ path, line, explanation }) => {
        const f = projectFiles.find(pf => pf.path === path);
        if (f) {
          f.issues.push({ id: mk(), line, type: 'Duplicate Logic', severity: 'medium', applied: false,
            explanation, recommendedFix: '// Extract into a shared helper.' });
          if (f.riskState === 'safe') f.riskState = 'medium';
        }
      });

      detectUnusedExports(projectFiles).forEach(({ path, symbol, explanation }) => {
        const f = projectFiles.find(pf => pf.path === path);
        if (f) {
          f.issues.push({ id: mk(), line: 1, type: 'Unused Code', severity: 'medium', applied: false,
            explanation, recommendedFix: '// Remove unused export.' });
          if (f.riskState === 'safe') f.riskState = 'medium';
        }
      });

      projectFiles.forEach(f => { f.riskScore = computeRisk(f.issues); });

      // ── 4. Compute health scores ─────────────────────────────────────────
      setProgress(88);
      addLog(`📊 Computing project health scores…`);

      const totalIssues = projectFiles.reduce((a, f) => a + f.issues.length, 0);
      const crit  = projectFiles.reduce((a, f) => a + f.issues.filter(i => i.severity === 'critical').length, 0);
      const high  = projectFiles.reduce((a, f) => a + f.issues.filter(i => i.severity === 'high').length, 0);
      const dup   = projectFiles.reduce((a, f) => a + f.issues.filter(i => i.type.includes('Duplicate') || i.type.includes('Unused')).length, 0);
      const large = projectFiles.reduce((a, f) => a + f.issues.filter(i => i.type === 'Large File').length, 0);

      const secScore  = Math.max(10, 100 - crit * 22 - high * 12);
      const archScore = Math.max(15, 100 - dup * 10 - (totalIssues - crit - high) * 4);
      const perfScore = Math.max(20, 100 - large * 15);
      const maintScore = Math.max(20, 100 - dup * 8 - large * 10 - totalIssues * 2);
      const overallScore = Math.round((secScore + archScore + perfScore + maintScore) / 4);

      const langs = [...new Set(projectFiles.filter(f => f.isCode).map(f => detectLanguage(f.name)))];
      const lines = projectFiles.filter(f => f.isCode).reduce((a, f) => a + (f.code?.split('\n').length ?? 0), 0);

      const newProj: Project = {
        id:         projId,
        name,
        description: `${parsedFiles.length} files · ${foldersFound} folders · ${lines.toLocaleString()} lines of code`,
        language:   langs[0] ?? 'Mixed',
        status:     'ready',
        overallScore,
        securityScore: secScore,
        architectureScore: archScore,
        performanceScore: perfScore,
        maintainabilityScore: maintScore,
        branch,
        commitHash: Math.random().toString(16).slice(2, 9),
        files: projectFiles,
        analysisStats: {
          totalFilesFound: parsedFiles.length,
          foldersFound,
          filesParsed,
          filesFailed,
          linesProcessed: lines,
          detectedLanguages: langs,
          analysisDurationMs: Date.now() - startTs,
          totalFindings: totalIssues,
        },
      };

      setProgress(100);
      addLog(`✅ "${name}" ready — ${projectFiles.length} files in tree, ${codeFiles.length} analysed, ${totalIssues} findings, health ${overallScore}%`);
      await delay(500);

      onImportProject(newProj);
      onAddActivity({
        id: `act-${Date.now()}`, projectId: projId, type: 'success', time: 'Just now',
        text: `Ingested "${name}" — ${projectFiles.length} files, ${totalIssues} findings, health ${overallScore}%.`,
      });

      setIsIngesting(false);
      setShowModal(false);
      setProjectName('');
      setGitUrl('');
      setSelectedFiles([]);

    } catch (err) {
      addLog(`❌ Pipeline failed: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
      setIsIngesting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────
  void memories; // referenced in parent

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Workspace Console</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Real-time code intelligence across your repositories.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Ingest Project
        </button>
      </div>

      {/* KPIs */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))' }}>
        {[
          { label: 'Total Projects',      value: totalProjects,                             color: undefined,            sub: 'Active repositories' },
          { label: 'Memories Stored',     value: analytics?.totalMemories ?? 0,             color: undefined,            sub: 'Hindsight intelligence' },
          { label: 'Critical Vulns',      value: analytics?.criticalVulnerabilities ?? 0,   color: 'var(--critical-color)', sub: 'Open findings' },
          { label: 'Resolved Issues',     value: analytics?.resolvedIssues ?? 0,            color: 'var(--success-color)', sub: 'Applied fixes' },
          { label: 'Recurring Concerns',  value: analytics?.recurringIssues ?? 0,           color: (analytics?.recurringIssues ?? 0) > 0 ? 'var(--warning-color)' : undefined, sub: 'Repeated flaws' },
          { label: 'Avg Health Score',    value: `${avgHealth}%`,                           color: avgHealth > 80 ? 'var(--success-color)' : avgHealth > 60 ? 'var(--warning-color)' : 'var(--critical-color)', sub: 'Across projects' },
        ].map(k => (
          <div key={k.label} className="stats-card">
            <div className="stats-label">{k.label}</div>
            <div className="stats-value" style={k.color ? { color: k.color } : {}}>{k.value}</div>
            <div className="stats-change positive"><span>{k.sub}</span></div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="dashboard-body-grid">
        <div className="graph-card">
          <div className="card-title">
            <span>Project Health Trend</span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
              {[['var(--primary-color)', 'Health Index'], ['var(--success-color)', 'Reviews Made']].map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c, display: 'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>
          <div className="svg-graph-container">
            <svg viewBox="0 0 500 200" width="100%" height="100%" preserveAspectRatio="none">
              {[30, 80, 130, 170].map(y => <line key={y} x1="50" y1={y} x2="480" y2={y} className={y === 170 ? 'svg-chart-axis' : 'svg-chart-grid'} />)}
              {['100%','75%','50%','0%'].map((l, i) => <text key={l} x="10" y={[34,84,134,174][i]} className="svg-chart-label">{l}</text>)}
              {trendData.map((t, i) => <text key={i} x={50 + (i * 430) / (trendData.length - 1 || 1) - 15} y="190" className="svg-chart-label">{t.date}</text>)}
              <path d={hArea} className="svg-chart-area" />
              <path d={hPath}  className="svg-chart-line" />
              <path d={rPath}  className="svg-chart-line-secondary" />
              <circle cx={lX} cy={lYh} r="4" fill="var(--primary-color)" />
              <circle cx={lX} cy={lYr} r="4" fill="var(--success-color)" />
            </svg>
          </div>
        </div>

        <div className="activity-card">
          <div className="card-title">Intelligence Log</div>
          <div className="activity-list">
            {activities.map(a => (
              <div className="activity-item" key={a.id}>
                <div className={`activity-indicator ${a.type}`}>
                  {a.type === 'critical' ? '🔴' : a.type === 'warning' ? '⚠️' : a.type === 'success' ? '✓' : 'ℹ️'}
                </div>
                <div className="activity-details">
                  <div className="activity-text">{a.text}</div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Cards */}
      <div className="projects-card">
        <div className="card-title">Analyzed Codebases</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {projects.map(proj => {
            const stats = proj.analysisStats;
            const findings = proj.files.reduce((a, f) => a + f.issues.filter(i => !i.applied).length, 0);
            return (
              <div key={proj.id} style={{
                backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid var(--border-color)',
                borderRadius: '6px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px',
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{proj.name}</h3>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      {proj.language}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.4 }}>{proj.description}</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                    {[
                      { l: 'Files',    v: stats?.totalFilesFound ?? proj.files.length },
                      { l: 'Folders',  v: stats?.foldersFound ?? '—' },
                      { l: 'Findings', v: findings },
                    ].map(kv => (
                      <div key={kv.l} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', padding: '6px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: kv.l === 'Findings' && Number(kv.v) > 0 ? 'var(--warning-color)' : 'var(--text-primary)' }}>{kv.v}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{kv.l}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <GitBranch size={11} /> {proj.branch}
                    </span>
                    <span>{(stats?.detectedLanguages ?? []).slice(0, 4).join(', ')}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Health:</span>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: proj.overallScore > 80 ? 'var(--success-color)' : proj.overallScore > 60 ? 'var(--warning-color)' : 'var(--critical-color)' }}>
                      {proj.overallScore}%
                    </span>
                  </div>
                  <button className="btn" onClick={() => onSelectProject(proj.id)}>
                    Open Workspace <Play size={11} style={{ fill: 'currentColor' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ingest Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Project Ingestion Wizard</h2>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => !isIngesting && setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {isIngesting ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader size={16} style={{ animation: 'spin 1.2s linear infinite', color: 'var(--primary-color)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Analyzing… ({progress}%)</span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary-color)', transition: 'width 0.3s ease' }} />
                </div>
                <div className="ingest-log-box">
                  {logs.map((l, i) => (
                    <div key={i} className={`log-line ${l.includes('✅') ? 'success' : l.includes('⚠️') || l.includes('❌') ? 'warning' : 'info'}`}>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleStartIngest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="ingestion-options-grid">
                  {([
                    ['git',    <Globe key="g" size={20} className="logo-icon" />,      'Git Repository'],
                    ['zip',    <Upload key="z" size={20} className="logo-icon" />,     'ZIP Archive'],
                    ['folder', <FolderOpen key="f" size={20} className="logo-icon" />, 'Local Folder'],
                    ['file',   <File key="fi" size={20} className="logo-icon" />,      'Single File'],
                  ] as const).map(([t, icon, label]) => (
                    <div key={t} className={`ingestion-opt ${importType === t ? 'selected' : ''}`} onClick={() => setImportType(t)}>
                      {icon}<span>{label}</span>
                    </div>
                  ))}
                </div>

                {importType === 'git' && (
                  <div className="form-group">
                    <label className="form-label">GitHub Repository URL</label>
                    <input className="form-input" type="text"
                      placeholder="https://github.com/owner/repo"
                      value={gitUrl} onChange={e => setGitUrl(e.target.value)} required />
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      📡 Fetches real file tree via GitHub API. Public repos only (no auth required for up to 60 req/hr).
                    </p>
                  </div>
                )}

                {importType === 'folder' && (
                  <div className="form-group">
                    <label className="form-label">Select Local Folder</label>
                    <input className="form-input" type="file"
                      // @ts-expect-error: webkitdirectory is non-standard
                      webkitdirectory="" directory="" multiple style={{ cursor: 'pointer' }}
                      onChange={e => {
                        const fs = e.target.files;
                        if (fs && fs.length > 0) {
                          setProjectName(fs[0].webkitRelativePath?.split('/')[0] || 'folder');
                          setSelectedFiles(Array.from(fs));
                        }
                      }} required />
                    {selectedFiles.length > 0 && (
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        📂 {selectedFiles.length} file(s) selected — all non-binary files will appear in the source tree.
                      </p>
                    )}
                  </div>
                )}

                {importType === 'file' && (
                  <div className="form-group">
                    <label className="form-label">Select Code File</label>
                    <input className="form-input" type="file" style={{ cursor: 'pointer' }}
                      onChange={e => {
                        const fs = e.target.files;
                        if (fs && fs.length > 0) {
                          setProjectName(fs[0].name.replace(/\.[^/.]+$/, ''));
                          setSelectedFiles(Array.from(fs));
                        }
                      }} required />
                  </div>
                )}

                {importType === 'zip' && (
                  <div className="form-group">
                    <label className="form-label">Select ZIP Archive</label>
                    <input className="form-input" type="file" accept=".zip" style={{ cursor: 'pointer' }}
                      onChange={e => {
                        const fs = e.target.files;
                        if (fs && fs.length > 0) {
                          setProjectName(fs[0].name.replace(/\.zip$/i, ''));
                          setSelectedFiles(Array.from(fs));
                        }
                      }} required />
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      📦 ZIP will be fully extracted. All source files will appear in the tree — no file limit.
                    </p>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Project Name (optional)</label>
                  <input className="form-input" type="text" placeholder="Auto-detected from source…"
                    value={projectName} onChange={e => setProjectName(e.target.value)} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Ingest &amp; Scan</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

// Suppress unused import — INITIAL_PROJECTS only used by App.tsx seeding
void INITIAL_PROJECTS;
