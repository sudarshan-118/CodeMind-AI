// 1. Repository Scanner Module
import type { RepositoryMetadata } from '../shared/types';

export interface RawFile {
  name: string;
  path: string;
  code?: string;
  size?: number;
}

const IGNORE_PATTERNS = [
  /\/node_modules\//i,
  /^\.?node_modules\//i,
  /\/\.git\//i,
  /^\.?git\//i,
  /\/dist\//i,
  /\/build\//i,
  /\/target\//i,
  /\/vendor\//i,
  /\/\.next\//i,
  /\/\.cache\//i,
  /\/\.venv\//i,
  /\/venv\//i,
  /\/__pycache__\//i,
  /\.png$/i, /\.jpg$/i, /\.jpeg$/i, /\.gif$/i, /\.svg$/i, /\.ico$/i,
  /\.mp4$/i, /\.mp3$/i, /\.pdf$/i, /\.zip$/i, /\.tar$/i, /\.gz$/i,
  /\.exe$/i, /\.dll$/i, /\.so$/i, /\.dylib$/i, /\.pyc$/i, /\.class$/i,
  /package-lock\.json$/i, /yarn\.lock$/i, /pnpm-lock\.yaml$/i
];

export class RepositoryScanner {
  public static shouldIgnore(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return IGNORE_PATTERNS.some(pattern => pattern.test(normalized));
  }

  public static detectProjectType(files: RawFile[]): string {
    const paths = files.map(f => f.path.replace(/\\/g, '/').toLowerCase());
    const fileNames = files.map(f => f.name.toLowerCase());

    if (fileNames.includes('next.config.js') || fileNames.includes('next.config.ts') || paths.some(p => p.includes('pages/') || p.includes('app/'))) {
      return 'Next.js Web Application';
    }
    if (fileNames.includes('vite.config.js') || fileNames.includes('vite.config.ts')) {
      return 'React / Vite Single Page Application';
    }
    if (fileNames.includes('package.json')) {
      return 'Node.js / JavaScript Project';
    }
    if (fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml') || fileNames.includes('pipfile')) {
      return 'Python Application';
    }
    if (fileNames.includes('pom.xml') || fileNames.includes('build.gradle')) {
      return 'Java / Spring Application';
    }
    if (fileNames.includes('go.mod')) {
      return 'Go Module';
    }
    if (fileNames.includes('cargo.toml')) {
      return 'Rust / Cargo Crates';
    }
    if (fileNames.includes('cmakelists.txt') || fileNames.includes('makefile')) {
      return 'C / C++ Build System';
    }

    return 'Generic Multi-Language Repository';
  }

  public static scan(
    projectName: string,
    sourceType: 'github' | 'zip' | 'folder' | 'file',
    rawFiles: RawFile[]
  ): { metadata: RepositoryMetadata; validFiles: RawFile[] } {
    const validFiles = rawFiles.filter(f => !this.shouldIgnore(f.path));
    
    let totalSize = 0;
    let totalLinesOfCode = 0;
    let totalCodeFiles = 0;
    const folderSet = new Set<string>();
    const extSet = new Set<string>();

    validFiles.forEach(f => {
      const code = f.code || '';
      const size = f.size || code.length;
      totalSize += size;

      const pathParts = f.path.replace(/\\/g, '/').split('/');
      for (let i = 1; i < pathParts.length - 1; i++) {
        folderSet.add(pathParts.slice(0, i + 1).join('/'));
      }

      const dotIdx = f.name.lastIndexOf('.');
      if (dotIdx > 0) {
        extSet.add(f.name.slice(dotIdx).toLowerCase());
      }

      if (code.trim().length > 0) {
        totalCodeFiles++;
        totalLinesOfCode += code.split('\n').length;
      }
    });

    const projectType = this.detectProjectType(validFiles);

    const metadata: RepositoryMetadata = {
      projectName,
      sourceType,
      projectType,
      totalSize,
      totalFiles: validFiles.length,
      totalFolders: folderSet.size,
      totalCodeFiles,
      totalLinesOfCode,
      detectedLanguages: Array.from(extSet),
      discoveredAt: new Date().toISOString()
    };

    return { metadata, validFiles };
  }
}
