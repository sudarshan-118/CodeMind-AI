// Deterministic Security Analysis Engine
import type { Finding, ParseResult } from '../shared/types';

export class SecurityEngine {
  private static mkId(): string {
    return 'sec-' + Math.random().toString(36).substr(2, 9);
  }

  public static analyze(filePath: string, code: string, _parseResult?: ParseResult): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');
    const timestamp = new Date().toISOString();

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) return;

      // 1. Hardcoded Secrets & API Keys
      if (/(?:api_key|apikey|secret|password|passwd|auth_token|private_key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{8,}['"]/i.test(line)) {
        if (!line.includes('process.env') && !line.includes('os.getenv') && !line.includes('import.meta.env')) {
          findings.push({
            id: this.mkId(),
            file: filePath,
            line: lineNum,
            rule: 'hardcoded-credentials',
            severity: 'critical',
            category: 'security',
            explanation: 'Hardcoded secret or API key credential detected in source code.',
            recommendedFix: 'Extract secret into environment variables (e.g. process.env or .env file).',
            confidence: 0.95,
            timestamp
          });
        }
      }

      // 2. SQL Injection
      if (/(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\s+.*(?:\+|%s|\$\{)/i.test(line)) {
        if (!line.includes('PREPARE') && !line.includes('?') && !line.includes('$1')) {
          findings.push({
            id: this.mkId(),
            file: filePath,
            line: lineNum,
            rule: 'sql-injection',
            severity: 'critical',
            category: 'security',
            explanation: 'Possible SQL Injection via raw string concatenation or template literal in query.',
            recommendedFix: 'Use parameterized queries or prepared statements (e.g., db.query("...", [val])).',
            confidence: 0.90,
            timestamp
          });
        }
      }

      // 3. Command Injection
      if (/(?:os\.system|subprocess\.call|child_process\.exec|execSync|spawnSync)\s*\(/i.test(line)) {
        if (!line.includes('shell=False') && !line.includes('[') && (line.includes('+') || line.includes('${'))) {
          findings.push({
            id: this.mkId(),
            file: filePath,
            line: lineNum,
            rule: 'command-injection',
            severity: 'high',
            category: 'security',
            explanation: 'Unsanitized dynamic string execution passed to subshell execution call.',
            recommendedFix: 'Use argument array execution (e.g. subprocess.run(["cmd", arg]) or execFile).',
            confidence: 0.88,
            timestamp
          });
        }
      }

      // 4. Unsafe eval() / Dynamic execution
      if (/\beval\s*\(|new\s+Function\s*\(|execScript\s*\(/i.test(line)) {
        findings.push({
          id: this.mkId(),
          file: filePath,
          line: lineNum,
          rule: 'unsafe-eval',
          severity: 'high',
          category: 'security',
          explanation: 'Dynamic code execution (eval/Function) creates arbitrary code injection vectors.',
          recommendedFix: 'Refactor code to avoid dynamic string evaluation.',
          confidence: 0.95,
          timestamp
        });
      }

      // 5. Sensitive Logging
      if (/console\.log\(.*(?:password|secret|token|privatekey|ssn|credit_card).*\)/i.test(line)) {
        findings.push({
          id: this.mkId(),
          file: filePath,
          line: lineNum,
          rule: 'sensitive-logging',
          severity: 'medium',
          category: 'security',
          explanation: 'Logging sensitive credentials or tokens to standard output/logs.',
          recommendedFix: 'Sanitize log outputs to redact sensitive parameters.',
          confidence: 0.85,
          timestamp
        });
      }

      // 6. Weak Cryptography
      if (/\b(?:md5|sha1|DES|RC4)\b/i.test(line) && !line.includes('//') && !line.includes('*')) {
        findings.push({
          id: this.mkId(),
          file: filePath,
          line: lineNum,
          rule: 'weak-crypto',
          severity: 'medium',
          category: 'security',
          explanation: 'Deprecated or collision-vulnerable cryptographic algorithm (MD5/SHA1/DES) detected.',
          recommendedFix: 'Upgrade cryptographic algorithms to SHA-256, bcrypt, or Argon2.',
          confidence: 0.80,
          timestamp
        });
      }
    });

    return findings;
  }
}
