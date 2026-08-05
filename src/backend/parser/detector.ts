// Language Detection Engine

export class LanguageDetector {
  private static EXTENSION_MAP: Record<string, string> = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.mjs': 'JavaScript',
    '.cjs': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.pyw': 'Python',
    '.java': 'Java',
    '.c': 'C',
    '.h': 'C',
    '.cpp': 'C++',
    '.hpp': 'C++',
    '.cc': 'C++',
    '.cxx': 'C++',
    '.go': 'Go',
    '.rs': 'Rust',
    '.html': 'HTML',
    '.css': 'CSS',
    '.json': 'JSON',
    '.sql': 'SQL',
    '.sh': 'Shell',
    '.bash': 'Shell',
    '.md': 'Markdown'
  };

  public static detect(filePath: string, code?: string): string {
    const dotIdx = filePath.lastIndexOf('.');
    if (dotIdx !== -1) {
      const ext = filePath.slice(dotIdx).toLowerCase();
      if (this.EXTENSION_MAP[ext]) {
        return this.EXTENSION_MAP[ext];
      }
    }

    if (code) {
      if (code.includes('package main') || code.includes('fmt.Println')) return 'Go';
      if (code.includes('fn main()') || code.includes('pub struct')) return 'Rust';
      if (code.includes('public class ') || code.includes('import java.')) return 'Java';
      if (code.includes('def ') && code.includes('import ')) return 'Python';
      if (code.includes('#include <')) return 'C++';
      if (code.includes('import React') || code.includes('const ') || code.includes('function ')) return 'TypeScript';
    }

    return 'Plain Text';
  }
}
