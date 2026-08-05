// Cache Manager & Incremental Analysis Engine
import type { FileAnalysisResult, ParseResult, Finding } from '../shared/types';

export interface CachedFileRecord {
  hash: string;
  parseResult: ParseResult;
  findings: Finding[];
  timestamp: string;
}

export class CacheManager {
  private static CACHE_KEY_PREFIX = 'codemind_cache_';

  public static computeHash(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }

  private static getStorageKey(projectId: string): string {
    return `${this.CACHE_KEY_PREFIX}${projectId}`;
  }

  public static getCache(projectId: string): Record<string, CachedFileRecord> {
    try {
      const raw = localStorage.getItem(this.getStorageKey(projectId));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  public static updateCache(projectId: string, fileRecord: FileAnalysisResult): void {
    const cache = this.getCache(projectId);

    if (fileRecord.parseResult) {
      cache[fileRecord.path] = {
        hash: fileRecord.hash,
        parseResult: fileRecord.parseResult,
        findings: fileRecord.findings,
        timestamp: new Date().toISOString()
      };
    }

    try {
      localStorage.setItem(this.getStorageKey(projectId), JSON.stringify(cache));
    } catch (err) {
      console.warn('CacheManager: LocalStorage write quota hit', err);
    }
  }

  public static isCachedAndUnchanged(projectId: string, filePath: string, newCode: string): CachedFileRecord | null {
    const cache = this.getCache(projectId);
    const cached = cache[filePath];
    if (!cached) return null;

    const newHash = this.computeHash(newCode);
    if (cached.hash === newHash) {
      return cached;
    }
    return null;
  }
}
