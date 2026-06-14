import React, { useState } from 'react';
import type { Project, ProjectFile, Memory } from '../types';
import { ArrowLeft, Search, Code, Share2, ZoomIn, ZoomOut, RotateCcw, Brain, CheckCircle } from 'lucide-react';

interface FileTreeNode {
  name: string;
  path: string;
  isFile: boolean;
  isCode?: boolean;
  fileId?: string;
  riskState?: 'safe' | 'medium' | 'high' | 'critical';
  riskScore?: number;
  hasIssues?: boolean;
  children: { [key: string]: FileTreeNode };
}

const buildFileTree = (files: ProjectFile[]): FileTreeNode => {
  const root: FileTreeNode = { name: 'Root', path: '', isFile: false, children: {} };

  files.forEach(file => {
    const normalPath = file.path.replace(/\\/g, '/').replace(/\/+/g, '/');
    const parts = normalPath.split('/').filter(p => p.length > 0);
    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');

      if (!current.children[part]) {
        current.children[part] = {
          name: part, path: currentPath, isFile: isLast,
          isCode:     isLast ? (file.isCode ?? true) : undefined,
          fileId:     isLast ? file.id : undefined,
          riskState:  isLast ? file.riskState : 'safe',
          riskScore:  isLast ? file.riskScore : 0,
          hasIssues:  isLast ? file.issues.some(i => !i.applied) : false,
          children: {}
        };
      } else if (isLast) {
        current.children[part].isFile    = true;
        current.children[part].isCode    = file.isCode ?? true;
        current.children[part].fileId    = file.id;
        current.children[part].riskState = file.riskState;
        current.children[part].riskScore = file.riskScore;
        current.children[part].hasIssues = file.issues.some(i => !i.applied);
      } else {
        // Propagate worst risk state up to folder
        const r = file.riskState;
        const ord: Record<string, number> = { safe: 0, medium: 1, high: 2, critical: 3 };
        const fn = current.children[part];
        if ((ord[r] ?? 0) > (ord[fn.riskState ?? 'safe'] ?? 0)) {
          fn.riskState = r;
          if (r !== 'safe') fn.hasIssues = true;
        }
      }
      current = current.children[part];
    });
  });

  return root;
};

interface FileTreeNodeProps {
  node: FileTreeNode;
  activeFileId: string;
  onSelectFile: (id: string) => void;
}

const FileIcon: React.FC<{ name: string }> = ({ name }) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const isEnv = name.startsWith('.env') || name.includes('.env');
  const isGit = name.startsWith('.git') || name === '.gitignore';
  
  const style = { marginRight: '6px', width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 };

  if (name === 'package.json') {
    return (
      <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#CB3837" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="rgba(203, 56, 55, 0.1)" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    );
  }

  if (name === 'tsconfig.json') {
    return (
      <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#3178C6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="rgba(49, 120, 198, 0.05)" />
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }

  if (name.startsWith('vite.config.')) {
    return (
      <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#BD34FE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 19.5 22 19.5" fill="rgba(189, 52, 254, 0.1)" />
        <polygon points="12 7 9 13 12 13 11 17 15 11 12 11" fill="#FFC517" stroke="#FFC517" strokeWidth="1" />
      </svg>
    );
  }

  if (isEnv) {
    return (
      <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    );
  }

  if (isGit) {
    return (
      <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#F05032" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M6 6v6m0 0a3 3 0 0 0 3 3h6" />
      </svg>
    );
  }

  if (name.includes('config')) {
    return (
      <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }

  switch (ext) {
    case 'ts':
    case 'tsx':
      return (
        <svg {...style} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="15" fill="#3178C6"/>
          <text x="50%" y="68%" fill="white" fontSize="44" fontWeight="bold" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" textAnchor="middle">TS</text>
        </svg>
      );
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return (
        <svg {...style} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="15" fill="#F7DF1E"/>
          <text x="50%" y="68%" fill="#323330" fontSize="44" fontWeight="bold" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" textAnchor="middle">JS</text>
        </svg>
      );
    case 'html':
    case 'htm':
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 2L4.5 19L12 22L19.5 19L21 2H3ZM18.2 6.5H12V9.3H15.1L14.8 12.3L12 13.1V13.1L9.2 12.3L9 9.8H6.2L6.6 15.1L12 16.6L17.4 15.1L18.2 6.5Z" fill="#E34F26"/>
        </svg>
      );
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 2L4.5 19L12 22L19.5 19L21 2H3ZM18.2 6.5L18 9.3H12V12.1H15.1L14.8 15L12 15.8L9.2 15L9 12.1H6.2L6.6 17.8L12 19.3L17.4 17.8L18.2 6.5Z" fill="#1572B6"/>
        </svg>
      );
    case 'py':
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.95 2C6.42 2 6.55 4.39 6.55 4.39L6.57 6.84H12V7.63H4.22C2.17 7.63 2 9.4 2 9.4V13.73C2 13.73 2.1 15.53 4.22 15.53H6.08V13.88C6.08 11.23 8.35 8.96 11 8.96H17.78V5.53C17.78 5.53 17.9 2 11.95 2ZM14.92 3.61A0.82 0.82 0 1 1 14.92 5.25A0.82 0.82 0 0 1 14.92 3.61Z" fill="#3776AB"/>
          <path d="M12.05 22C17.58 22 17.45 19.61 17.45 19.61L17.43 17.16H12V16.37H19.78C21.83 16.37 22 14.6 22 14.6V10.27C22 10.27 21.9 8.47 19.78 8.47H17.92V10.12C17.92 12.77 15.65 15.04 13 15.04H6.22V18.47C6.22 18.47 6.1 22 12.05 22ZM9.08 20.39A0.82 0.82 0 1 1 9.08 18.75A0.82 0.82 0 0 1 9.08 20.39Z" fill="#FFE873"/>
        </svg>
      );
    case 'go':
      return (
        <svg {...style} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="15" fill="#00ADD8"/>
          <text x="50%" y="68%" fill="white" fontSize="44" fontWeight="bold" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" textAnchor="middle">GO</text>
        </svg>
      );
    case 'json':
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
          <path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" />
        </svg>
      );
    case 'yaml':
    case 'yml':
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill="rgba(225, 29, 72, 0.05)" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M8 13v2m4-2l1.5 3m0-3l-1.5 3m-4-3l1 1.5 1-1.5" />
        </svg>
      );
    case 'java':
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#E28743" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 18c0 2 4 3 6 3s6-1 6-3M6 15c0 2 4 3 6 3s6-1 6-3M6 12c0 2 4 3 6 3s6-1 6-3" />
          <path d="M10 2c1 3-2 5-1 8 1 2 4 2 3 4M14 1c1 3-2 5-1 8 1 2 4 2 3 4" stroke="#3776AB" />
        </svg>
      );
    case 'c':
      return (
        <svg {...style} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="15" fill="#A8B9CC"/>
          <text x="50%" y="68%" fill="#323330" fontSize="48" fontWeight="bold" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" textAnchor="middle">C</text>
        </svg>
      );
    case 'h':
      return (
        <svg {...style} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="15" fill="#C084FC"/>
          <text x="50%" y="68%" fill="white" fontSize="48" fontWeight="bold" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" textAnchor="middle">H</text>
        </svg>
      );
    case 'cpp':
    case 'hpp':
      return (
        <svg {...style} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="15" fill="#00599C"/>
          <text x="50%" y="68%" fill="white" fontSize="44" fontWeight="bold" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" textAnchor="middle">C++</text>
        </svg>
      );
    case 'cs':
      return (
        <svg {...style} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="15" fill="#9B4996"/>
          <text x="50%" y="68%" fill="white" fontSize="44" fontWeight="bold" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" textAnchor="middle">C#</text>
        </svg>
      );
    case 'rs':
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#DEA584" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" fill="rgba(222, 165, 132, 0.1)" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3m-2.8-6.2l-2.1 2.1m-8.5 8.5l-2.1 2.1m0-12.7l2.1 2.1m8.5 8.5l2.1 2.1" />
        </svg>
      );
    case 'sh':
    case 'bash':
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
    case 'md':
    case 'mdx':
    case 'txt':
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#0086B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill="rgba(0, 134, 179, 0.05)" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M8 13h2v4h-2zm6 0h2v4h-2zm-3 2h2" />
        </svg>
      );
    case 'sql':
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#336791" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" fill="rgba(51, 103, 145, 0.1)" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        </svg>
      );
    default:
      return (
        <svg {...style} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
  }
};

const FileTreeNodeComponent: React.FC<FileTreeNodeProps> = ({ node, activeFileId, onSelectFile }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (node.isFile) {
    const dotClass = node.hasIssues ? node.riskState : 'safe';
    const hasScore = node.riskScore !== undefined && node.riskScore > 0;
    const isNonCode = !node.isCode;

    let textColor = isNonCode ? 'var(--text-secondary)' : 'inherit';
    if (!isNonCode && node.hasIssues) {
      if (node.riskScore !== undefined) {
        if (node.riskScore >= 80) textColor = 'var(--critical-color)';
        else if (node.riskScore >= 50) textColor = 'var(--warning-color)';
        else textColor = '#d97706';
      } else {
        textColor = node.riskState === 'critical' ? 'var(--critical-color)' : 'var(--warning-color)';
      }
    }

    return (
      <div
        className={`file-tree-item ${activeFileId === node.fileId ? 'active' : ''}`}
        style={{ paddingLeft: '8px', cursor: 'pointer', opacity: isNonCode ? 0.7 : 1 }}
        onClick={() => node.fileId && onSelectFile(node.fileId)}
      >
        <span className="file-label" style={{ display: 'flex', alignItems: 'center' }}>
          <FileIcon name={node.name} />
          <span style={{ color: textColor, fontSize: '13px' }}>
            {node.name}
            {hasScore && (
              <span style={{
                fontSize: '10px', marginLeft: '6px', opacity: 0.8,
                backgroundColor: node.riskScore! >= 80 ? 'rgba(239,68,68,0.15)' : 'rgba(217,119,6,0.15)',
                padding: '1px 4px', borderRadius: '3px', color: textColor
              }}>
                {node.riskScore}
              </span>
            )}
          </span>
        </span>
        <span className={`risk-dot ${dotClass}`} />
      </div>
    );
  }

  // Count issues in this folder subtree
  const countIssues = (n: FileTreeNode): number => {
    if (n.isFile) return n.hasIssues ? 1 : 0;
    return Object.values(n.children).reduce((s, c) => s + countIssues(c), 0);
  };
  const folderIssueCount = countIssues(node);
  const folderRiskColor = node.riskState === 'critical' ? 'var(--critical-color)'
    : node.riskState === 'high'   ? 'var(--warning-color)'
    : node.riskState === 'medium' ? '#d97706'
    : 'var(--text-secondary)';

  const childrenKeys = Object.keys(node.children).sort((a, b) => {
    const aNode = node.children[a];
    const bNode = node.children[b];
    if (aNode.isFile !== bNode.isFile) {
      return aNode.isFile ? 1 : -1;
    }
    return a.localeCompare(b);
  });

  return (
    <div className="folder-tree-node" style={{ marginBottom: '2px' }}>
      <div 
        className="folder-header" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 6px',
          cursor: 'pointer',
          borderRadius: '4px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          userSelect: 'none',
          transition: 'background-color 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <span style={{ fontSize: '8px', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s ease', display: 'inline-block',
          width: '10px',
          textAlign: 'center'
        }}>▶</span>
        <span style={{ display: 'flex', alignItems: 'center', height: '16px', width: '16px' }}>
          {isOpen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#EAB308' }}>
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="rgba(234, 179, 8, 0.15)" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#EAB308' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="rgba(234, 179, 8, 0.15)" />
            </svg>
          )}
        </span>
        <span style={{ fontWeight: 500, fontSize: '13px', color: folderIssueCount > 0 ? folderRiskColor : 'inherit' }}>
          {node.name}
        </span>
        {folderIssueCount > 0 && (
          <span style={{
            fontSize: '10px', marginLeft: '6px',
            backgroundColor: node.riskState === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(217,119,6,0.15)',
            color: folderRiskColor,
            padding: '1px 5px', borderRadius: '8px', fontWeight: 600
          }}>
            {folderIssueCount}
          </span>
        )}
      </div>
      {isOpen && (
        <div className="folder-children" style={{ paddingLeft: '8px', borderLeft: '1px solid rgba(255, 255, 255, 0.05)', marginLeft: '10px' }}>
          {childrenKeys.map(key => (
            <FileTreeNodeComponent 
              key={key} 
              node={node.children[key]} 
              activeFileId={activeFileId} 
              onSelectFile={onSelectFile} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div style={{ lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('###')) {
          return <h4 key={idx} style={{ fontSize: '15px', fontWeight: 700, marginTop: '16px', color: 'var(--text-primary)' }}>{trimmed.replace(/^###\s*/, '')}</h4>;
        }
        if (trimmed.startsWith('##')) {
          return <h3 key={idx} style={{ fontSize: '17px', fontWeight: 700, marginTop: '20px', color: 'var(--text-primary)' }}>{trimmed.replace(/^##\s*/, '')}</h3>;
        }
        if (trimmed.startsWith('#')) {
          return <h2 key={idx} style={{ fontSize: '20px', fontWeight: 700, marginTop: '24px', color: 'var(--text-primary)' }}>{trimmed.replace(/^#\s*/, '')}</h2>;
        }
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', paddingLeft: '16px' }}>
              <span>•</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{trimmed.replace(/^[-*]\s*/, '')}</span>
            </div>
          );
        }
        if (trimmed.startsWith('|')) {
          const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
          if (cells.length === 0 || trimmed.includes('---')) return null;
          return (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length}, 1fr)`, gap: '12px', borderBottom: '1px solid var(--border-color)', padding: '6px 8px', fontSize: '12px' }}>
              {cells.map((cell, cidx) => (
                <div key={cidx} style={{ fontWeight: idx === 0 || lines[idx-1]?.includes('---') ? 700 : 400 }}>{cell}</div>
              ))}
            </div>
          );
        }
        if (trimmed.length === 0) return <div key={idx} style={{ height: '4px' }} />;
        return <p key={idx} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{line}</p>;
      })}
    </div>
  );
};

interface ProjectWorkspaceProps {
  projects: Project[];
  activeProjectId: string;
  activeFileId: string;
  memories: Memory[];
  onSelectProject: (id: string) => void;
  onSelectFile: (id: string) => void;
  onApplyFix: (projectId: string, fileId: string, issueId: string) => void;
  onBackToDashboard: () => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  projects,
  activeProjectId,
  activeFileId,
  memories,
  onSelectProject,
  onSelectFile,
  onApplyFix,
  onBackToDashboard
}) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'ai-agent' | 'dep-graph'>('explorer');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  const scrollToLine = (lineNum: number) => {
    setHighlightedLine(lineNum);
    setTimeout(() => {
      const element = document.getElementById(`line-${lineNum}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
    setTimeout(() => {
      setHighlightedLine(null);
    }, 2500);
  };
  const [aiReviewText, setAiReviewText] = useState<string>('');
  const [loadingReview, setLoadingReview] = useState<boolean>(false);
  
  // Graph zoom/pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const project = projects.find(p => p.id === activeProjectId);
  if (!project) return <div>Project not found</div>;

  const activeFile = project.files.find(f => f.id === activeFileId) || project.files[0];

  const generateAIReview = async () => {
    const keys = [
      import.meta.env.VITE_GROQ_API_KEY,
      import.meta.env.VITE_GROQ_API_KEY_FALLBACK,
      import.meta.env.VITE_GROQ_API_KEY_3,
      import.meta.env.VITE_GROQ_API_KEY_4
    ].filter((k): k is string => typeof k === 'string' && k.trim() !== '');

    if (keys.length === 0) {
      setAiReviewText("### AI Review Agent (Offline)\n\nGroq API Key is not configured. Please add `VITE_GROQ_API_KEY` to your environment variables to enable dynamic AI reviews.");
      return;
    }

    setLoadingReview(true);
    setAiReviewText('');

    const allFindings = project.files.flatMap(f => f.issues.filter(i => !i.applied).map(i => ({
      file: f.path,
      line: i.line,
      issue: i.type,
      severity: i.severity,
      explanation: i.explanation,
      recommendedFix: i.recommendedFix
    })));

    try {

      const systemPrompt = `You are CodeMind AI, the Engineering Intelligence Review Agent.
Generate a consolidated high-level project audit review based on the following actual findings from the code:
1. Project Context:
Project Name: ${project.name}
Description: ${project.description}
Files Scanned: ${project.files.length}
2. Actual Detected Findings:
${JSON.stringify(allFindings)}
3. Historical Memories of verified resolutions:
${JSON.stringify(memories)}

Instructions:
- Summarize the overall security, architecture, performance, and maintainability of the codebase.
- Explain the key actual findings detected in the code and suggest remediation strategies referencing the memories.
- NEVER invent or hallucinate any other vulnerabilities or issues. If no findings are present, praise the clean codebase.
- Focus strictly on explaining the listed findings. Do not list any other files than those with issues.
- Format the response beautifully using Markdown with tables, lists, and code blocks where necessary.`;

      const userPrompt = `Generate the audit review report.`;

      const executeRequest = async (apiKey: string) => {
        const baseUrl = import.meta.env.DEV ? '/api-groq' : 'https://api.groq.com';
        
        const fetchWithRetry = async (
          url: string,
          options: RequestInit,
          retries = 3,
          delayMs = 1500
        ): Promise<Response> => {
          try {
            const res = await fetch(url, options);
            if (res.status === 429 && retries > 0) {
              console.warn(`CodeMind AI (Workspace): Rate limited (429). Retrying in ${delayMs}ms... (${retries} retries left)`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
            }
            return res;
          } catch (err) {
            if (retries > 0) {
              console.warn(`CodeMind AI (Workspace): Fetch failed. Retrying in ${delayMs}ms... (${retries} retries left)`, err);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
            }
            throw err;
          }
        };

        return await fetchWithRetry(`${baseUrl}/openai/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2
          })
        });
      };

      let response: Response | null = null;
      let lastError: any = null;

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        try {
          const res = await executeRequest(key);
          if (res.ok) {
            response = res;
            break;
          } else {
            console.warn(`CodeMind AI: Workspace Key ${i + 1}/${keys.length} failed with status ${res.status}.`);
            lastError = new Error(`HTTP status ${res.status}`);
          }
        } catch (err) {
          console.warn(`CodeMind AI: Workspace Key ${i + 1}/${keys.length} threw an error.`, err);
          lastError = err;
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error("All configured API keys failed.");
      }

      const data = await response.json();
      const reviewText = data.choices?.[0]?.message?.content || 'No review content generated.';
      setAiReviewText(reviewText);
    } catch (err: any) {
      console.error(err);
      
      // Local markdown fallback report generator
      const criticals = allFindings.filter(f => f.severity === 'critical');
      const highs = allFindings.filter(f => f.severity === 'high');
      const mediums = allFindings.filter(f => f.severity === 'medium');

      let report = `### AI Audit Intelligence Report (Local Syntactic Summary)\n\n`;
      report += `⚠️ *Note: Groq API returned an error (${err.message || err}). Providing local analysis based on current scans.*\n\n`;
      report += `#### 📊 Project Summary\n`;
      report += `- **Project Name:** ${project.name}\n`;
      report += `- **Files Scanned:** ${project.files.length}\n`;
      report += `- **Total Active Findings:** ${allFindings.length}\n`;
      report += `  - 🔴 Critical: ${criticals.length}\n`;
      report += `  - 🟠 High: ${highs.length}\n`;
      report += `  - 🟡 Medium: ${mediums.length}\n\n`;

      if (allFindings.length === 0) {
        report += `🎉 **Zero vulnerabilities detected!** The codebase complies with standard security and architectural guidelines.\n`;
      } else {
        report += `#### 🔍 Key Findings & Recommendations\n\n`;
        report += `| File | Line | Finding | Severity | Recommendation |\n`;
        report += `| :--- | :--- | :--- | :--- | :--- |\n`;
        allFindings.slice(0, 15).forEach((f) => {
          const fileBase = f.file.split('/').pop() || f.file;
          report += `| \`${fileBase}\` | ${f.line} | **${f.issue}** | \`${f.severity.toUpperCase()}\` | ${f.explanation.replace(/\|/g, '\\|')} |\n`;
        });
        
        if (allFindings.length > 15) {
          report += `\n*And ${allFindings.length - 15} more findings... View them in the file explorer sidebar.*`;
        }
      }
      setAiReviewText(report);
    } finally {
      setLoadingReview(false);
    }
  };

  React.useEffect(() => {
    setAiReviewText('');
  }, [activeProjectId]);

  React.useEffect(() => {
    if (activeTab === 'ai-agent' && !aiReviewText && !loadingReview) {
      generateAIReview();
    }
  }, [activeTab, activeProjectId]);

  // Filter files by search query — always show all files when query is empty
  const filteredFiles = searchQuery.trim() === ''
    ? project.files.filter(f => !f.isDir)
    : project.files.filter(f =>
        !f.isDir && (
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.path.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );

  // Apply code fix logic
  const handleApplyFixClick = (issueId: string) => {
    onApplyFix(project.id, activeFile.id, issueId);
  };

  // Graph mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (factor: number) => {
    setZoom(prev => Math.max(0.5, Math.min(2.5, prev * factor)));
  };

  const handleResetGraph = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Check if file is affected by upstream vulnerability
  // e.g. if 'auth.ts' has a critical issue, user.service.ts and database.ts are downstream dependencies
  const isAffected = (f: ProjectFile) => {
    if (f.riskState === 'safe') {
      // check if any of its imports are critical/high
      const importsVulnerable = project.files.some(other => 
        other.riskState !== 'safe' && f.dependencies?.includes(other.path)
      );
      return importsVulnerable;
    }
    return false;
  };

  // Render lines with highlights
  const renderCodeLines = () => {
    if (!activeFile || !activeFile.code) return null;
    const lines = activeFile.code.split('\n');
    
    return lines.map((lineText, idx) => {
      const lineNum = idx + 1;
      const matchingIssue = activeFile.issues.find(issue => issue.line === lineNum && !issue.applied);
      const isHighlighted = lineNum === highlightedLine;
      
      let lineClass = '';
      if (matchingIssue) {
        if (matchingIssue.severity === 'critical') lineClass = 'critical';
        else if (matchingIssue.severity === 'high') lineClass = 'warning';
        else lineClass = 'suggestion';
      }
      if (isHighlighted) {
        lineClass += ' line-focused';
      }

      return (
        <div 
          key={idx} 
          id={`line-${lineNum}`}
          className={`code-line-wrapper ${lineClass}`}
          style={isHighlighted ? {
            backgroundColor: 'rgba(99, 102, 241, 0.25)',
            borderLeft: '3px solid #6366f1',
            transition: 'background-color 0.3s ease, border-left 0.3s ease'
          } : {}}
        >
          <span className="code-line-number" style={isHighlighted ? { color: '#818cf8', fontWeight: 'bold' } : {}}>{lineNum}</span>
          <span className="code-line-content">{lineText}</span>
        </div>
      );
    });
  };

  return (
    <div className="workspace-container">
      {/* Left Sidebar */}
      <div className="workspace-sidebar">
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn" style={{ padding: '6px 10px' }} onClick={onBackToDashboard}>
              <ArrowLeft size={14} />
            </button>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Workspace</span>
          </div>

          <div style={{ position: 'relative' }}>
            <select 
              className="form-input" 
              style={{ paddingRight: '28px', cursor: 'pointer', appearance: 'none' }}
              value={project.id}
              onChange={(e) => onSelectProject(e.target.value)}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}>▼</span>
          </div>

          <div className="sidebar-search-box">
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search files..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          </div>
        </div>

        <div className="file-tree-container">
          <div 
            style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, paddingLeft: '8px', marginBottom: '8px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
            onDoubleClick={() => setShowAdminPanel(!showAdminPanel)}
            title="Double click to toggle Admin Debugging Panel"
          >
            Source Tree {showAdminPanel && <span style={{ color: 'var(--critical-color)', marginLeft: '4px' }}>(ADMIN)</span>}
          </div>

          {showAdminPanel && (
            (() => {
              const stats = project.analysisStats;
              const totalFilesInTree = project.files.filter(f => !f.isDir).length;
              const codeFilesCount  = project.files.filter(f => !f.isDir && f.isCode !== false).length;
              const nonCodeCount    = project.files.filter(f => !f.isDir && f.isCode === false).length;
              const totalFindings   = project.files.reduce((a, f) => a + f.issues.filter(i => !i.applied).length, 0);
              const langs = stats?.detectedLanguages ?? [...new Set(project.files.filter(f => f.language).map(f => f.language!))];
              return (
                <div style={{
                  margin: '8px 4px 16px 4px', padding: '12px',
                  backgroundColor: 'rgba(239,68,68,0.05)',
                  border: '1px dashed rgba(239,68,68,0.3)',
                  borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--critical-color)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚙️ DEBUG PANEL</span>
                    <button onClick={() => setShowAdminPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '9px' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                    <div>Total Files Found:  <strong style={{ color: 'var(--text-primary)' }}>{stats?.totalFilesFound ?? totalFilesInTree}</strong></div>
                    <div>Folders Found:      <strong style={{ color: 'var(--text-primary)' }}>{stats?.foldersFound ?? '—'}</strong></div>
                    <div>Files in Tree:      <strong style={{ color: 'var(--text-primary)' }}>{totalFilesInTree}</strong></div>
                    <div>Code Files:        <strong style={{ color: 'var(--text-primary)' }}>{codeFilesCount}</strong></div>
                    <div>Non-Code Files:    <strong style={{ color: 'var(--text-primary)' }}>{nonCodeCount}</strong></div>
                    <div>Files Parsed (AI): <strong style={{ color: 'var(--text-primary)' }}>{stats?.filesParsed ?? codeFilesCount}</strong></div>
                    <div>Files Failed:      <strong style={{ color: 'var(--text-primary)' }}>{stats?.filesFailed ?? 0}</strong></div>
                    <div>Lines Processed:   <strong style={{ color: 'var(--text-primary)' }}>{(stats?.linesProcessed ?? 0).toLocaleString()}</strong></div>
                    <div>Total Findings:    <strong style={{ color: totalFindings > 0 ? 'var(--warning-color)' : 'var(--success-color)' }}>{totalFindings}</strong></div>
                    <div>Duration:          <strong style={{ color: 'var(--text-primary)' }}>{stats?.analysisDurationMs ?? 0}ms</strong></div>
                    <div>Languages:         <strong style={{ color: 'var(--text-primary)' }}>{langs.slice(0,8).join(', ')}</strong></div>
                  </div>
                </div>
              );
            })()
          )}
          {(() => {
            const treeRoot = buildFileTree(filteredFiles);
            const childrenKeys = Object.keys(treeRoot.children).sort((a, b) => {
              const aNode = treeRoot.children[a];
              const bNode = treeRoot.children[b];
              if (aNode.isFile !== bNode.isFile) return aNode.isFile ? 1 : -1;
              return a.localeCompare(b);
            });

            return childrenKeys.map(key => (
              <FileTreeNodeComponent
                key={key}
                node={treeRoot.children[key]}
                activeFileId={activeFile.id}
                onSelectFile={onSelectFile}
              />
            ));
          })()}
        </div>
      </div>

      {/* Workspace Center */}
      <div className="workspace-center">
        {/* Workspace Nav Header */}
        <div className="workspace-navbar">
          <div className="workspace-tabs">
            <button 
              className={`workspace-tab ${activeTab === 'explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('explorer')}
            >
              <Code size={14} style={{ marginRight: '6px', display: 'inline' }} />
              File Explorer
            </button>
            <button 
              className={`workspace-tab ${activeTab === 'ai-agent' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai-agent')}
            >
              <Brain size={14} style={{ marginRight: '6px', display: 'inline' }} />
              AI Agent Review
            </button>
            <button 
              className={`workspace-tab ${activeTab === 'dep-graph' ? 'active' : ''}`}
              onClick={() => setActiveTab('dep-graph')}
            >
              <Share2 size={14} style={{ marginRight: '6px', display: 'inline' }} />
              Dependency Graph
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Health Index:</span>
            <span style={{
              fontWeight: 700,
              color: project.overallScore > 80 ? 'var(--success-color)' : project.overallScore > 60 ? 'var(--warning-color)' : 'var(--critical-color)'
            }}>
              {project.overallScore}%
            </span>
          </div>
        </div>

        {/* Workspace Body */}
        {activeTab === 'explorer' && (
          <div className="workspace-content-body">
            {/* Monospace Code Editor */}
            <div className="code-editor-container">
              <div className="editor-header">
                <span>{activeFile.path}</span>
                <span>{project.language}</span>
              </div>
              <div className="editor-viewport">
                {renderCodeLines()}
              </div>
            </div>

            {/* Right Sidebar: Issues & Hindsight */}
            <div className="workspace-right-sidebar">
              <h3 style={{ fontSize: '14px', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Intelligence Inspector
              </h3>

              {activeFile.issues.filter(i => !i.applied).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={32} style={{ color: 'var(--success-color)', marginBottom: '12px', margin: '0 auto 12px auto' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>File is Clean</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>No active security or architectural violations detected.</p>
                </div>
              ) : (
                activeFile.issues.filter(i => !i.applied).map(issue => {
                  // Find matching hindsight memory based on issue name similarity
                  const matchMemory = memories.find(m => 
                    m.issue.toLowerCase().includes(issue.type.toLowerCase()) ||
                    issue.type.toLowerCase().includes(m.issue.toLowerCase())
                  );

                  return (
                    <div key={issue.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="issue-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={`severity-badge ${issue.severity}`}>
                            {issue.severity}
                          </span>
                          <button 
                            onClick={() => scrollToLine(issue.line)}
                            style={{ 
                              fontSize: '11px', 
                              color: 'var(--text-secondary)', 
                              background: 'none', 
                              border: 'none', 
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: 'var(--border-color)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#818cf8';
                              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                              e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--text-secondary)';
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                            }}
                            title={`Jump to line ${issue.line}`}
                          >
                            Line {issue.line} ↗
                          </button>
                        </div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{issue.type}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {issue.explanation}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>RECOMMENDED FIX:</span>
                          <pre className="issue-fix-block">{issue.recommendedFix}</pre>
                        </div>
                        <button className="btn btn-primary" onClick={() => handleApplyFixClick(issue.id)}>
                          Apply Resolution Fix
                        </button>
                      </div>

                      {/* Hindsight Memory Card */}
                      {matchMemory && (
                        <div className="issue-card" style={{ borderLeft: '3px solid var(--primary-color)' }}>
                          <div className="hindsight-header">
                            <span style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-color)' }}>
                              <Brain size={14} />
                              Hindsight Matching
                            </span>
                            <span className="hindsight-match-badge">{matchMemory.matchPercentage || 87}% Match</span>
                          </div>
                          <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>PREVIOUS AUDIT ISSUE:</span>
                              <div style={{ marginTop: '2px', color: 'var(--text-primary)' }}>{matchMemory.issue}</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>VERIFIED FIX ROUTINE:</span>
                              <div style={{ marginTop: '2px', color: 'var(--success-color)', fontStyle: 'italic' }}>"{matchMemory.fix}"</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>OUTCOME EFFECT:</span>
                              <div style={{ marginTop: '2px', color: 'var(--text-primary)' }}>{matchMemory.outcome}</div>
                            </div>
                          </div>
                          <button 
                            className="btn btn-success" 
                            style={{ fontSize: '12px', padding: '6px 12px', marginTop: '6px' }}
                            onClick={() => handleApplyFixClick(issue.id)}
                          >
                            Apply Hindsight Fix
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* AI Agent Review */}
        {activeTab === 'ai-agent' && (
          <div className="ai-agent-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', overflowY: 'auto', height: 'calc(100vh - 120px)' }}>
            <div className="ai-agent-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>AI Audit Intelligence Agent</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                  Consolidated semantic analysis and audit reviews based strictly on actual findings.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="btn" 
                  onClick={generateAIReview} 
                  disabled={loadingReview}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {loadingReview ? (
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  ) : '↻'}
                  Regenerate Review
                </button>
                <span className="severity-badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)', padding: '6px 12px' }}>
                  Risk Score: {100 - project.overallScore}
                </span>
                <span className="severity-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '6px 12px' }}>
                  Health Index: {project.overallScore}%
                </span>
              </div>
            </div>

            {/* Quantitative Score Metrics Card */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', margin: '0 0 16px 0' }}>
              <div className="stats-card" style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Security Score</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--critical-color)' }}>{project.securityScore}/100</div>
              </div>
              <div className="stats-card" style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Architecture Score</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--warning-color)' }}>{project.architectureScore}/100</div>
              </div>
              <div className="stats-card" style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Performance Score</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--primary-color)' }}>{project.performanceScore}/100</div>
              </div>
              <div className="stats-card" style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Maintainability Score</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--success-color)' }}>{project.maintainabilityScore}/100</div>
              </div>
            </div>

            {/* AI Review Narrative Output */}
            <div style={{ 
              backgroundColor: 'var(--card-color)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '24px',
              minHeight: '200px',
              position: 'relative'
            }}>
              {loadingReview ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '250px',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '3px solid rgba(99, 102, 241, 0.1)',
                    borderTopColor: 'var(--primary-color)',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>AI Agent analyzing findings and compiling audit review...</span>
                </div>
              ) : aiReviewText ? (
                <SimpleMarkdown content={aiReviewText} />
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                  <p>No audit review loaded.</p>
                  <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={generateAIReview}>
                    Generate AI Review
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dependency Graph Visualizer */}
        {activeTab === 'dep-graph' && (
          <div className="dep-graph-container">
            <div className="dep-graph-controls">
              <button className="btn" style={{ padding: '6px 8px' }} onClick={() => handleZoom(1.2)} title="Zoom In">
                <ZoomIn size={14} />
              </button>
              <button className="btn" style={{ padding: '6px 8px' }} onClick={() => handleZoom(0.8)} title="Zoom Out">
                <ZoomOut size={14} />
              </button>
              <button className="btn" style={{ padding: '6px 8px' }} onClick={handleResetGraph} title="Reset view">
                <RotateCcw size={14} />
              </button>
            </div>

            <div 
              className="dep-viewport-wrapper"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <svg width="100%" height="100%">
                <g transform={`translate(${pan.x + 100}, ${pan.y + 120}) scale(${zoom})`}>
                  
                  {/* Arrows marker */}
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 2 L 10 5 L 0 8 z" fill="var(--border-color)" />
                    </marker>
                    <marker id="arrow-vulnerable" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 2 L 10 5 L 0 8 z" fill="var(--critical-color)" />
                    </marker>
                  </defs>
                         {(() => {
                    // Pre-calculate dynamic node positions to avoid layout overlaps
                    const coords: { [key: string]: { x: number; y: number } } = {};
                    
                    const incoming: { [key: string]: number } = {};
                    project.files.forEach(f => {
                      incoming[f.path] = 0;
                    });
                    project.files.forEach(f => {
                      f.dependencies?.forEach(dep => {
                        if (incoming[dep] !== undefined) {
                          incoming[dep]++;
                        }
                      });
                    });

                    const col0: string[] = [];
                    const col2: string[] = [];
                    const col1: string[] = [];

                    project.files.forEach(f => {
                      const inc = incoming[f.path] || 0;
                      const out = f.dependencies?.length || 0;
                      if (inc === 0 && out > 0) {
                        col0.push(f.id);
                      } else if (out === 0) {
                        col2.push(f.id);
                      } else {
                        col1.push(f.id);
                      }
                    });

                    if (col0.length === 0 && col2.length === 0 && col1.length === 0) {
                      project.files.forEach((f, idx) => {
                        coords[f.id] = { x: 50 + (idx % 3) * 190, y: 40 + Math.floor(idx / 3) * 80 };
                      });
                    } else {
                      if (col0.length === 0 && col1.length > 0) {
                        col0.push(col1.shift()!);
                      }
                      if (col2.length === 0 && col1.length > 0) {
                        col2.push(col1.pop()!);
                      }
                      
                      col0.forEach((id, idx) => { coords[id] = { x: 50, y: 40 + idx * 80 }; });
                      col1.forEach((id, idx) => { coords[id] = { x: 240, y: 40 + idx * 80 }; });
                      col2.forEach((id, idx) => { coords[id] = { x: 430, y: 40 + idx * 80 }; });
                    }

                    // Fallback for any file not mapped
                    project.files.forEach((f, idx) => {
                      if (!coords[f.id]) {
                        coords[f.id] = { x: 240, y: 40 + idx * 80 };
                      }
                    });

                    return (
                      <>
                        {/* Render lines */}
                        {project.files.map((file) => {
                          const isVulnerable = file.issues.some(i => !i.applied);
                          const pos = coords[file.id];
                          
                          return (
                            <g key={`links-${file.id}`}>
                              {file.dependencies?.map((depPath, dIdx) => {
                                const targetFile = project.files.find(tf => tf.path === depPath);
                                if (!targetFile) return null;
                                const targetPos = coords[targetFile.id];
                                if (!targetPos) return null;

                                const lineVulnerable = isVulnerable || targetFile.issues.some(ti => !ti.applied);

                                return (
                                  <line
                                    key={`line-${file.id}-${dIdx}`}
                                    x1={pos.x + 65}
                                    y1={pos.y + 18}
                                    x2={targetPos.x}
                                    y2={targetPos.y + 18}
                                    className={`dep-graph-line ${lineVulnerable ? 'affected' : ''}`}
                                    markerEnd={lineVulnerable ? "url(#arrow-vulnerable)" : "url(#arrow)"}
                                  />
                                );
                              })}
                            </g>
                          );
                        })}

                        {/* Render nodes */}
                        {project.files.map((file) => {
                          const hasIssues = file.issues.some(i => !i.applied);
                          const fileAffected = isAffected(file);
                          const pos = coords[file.id];

                          let nodeClass = '';
                          if (hasIssues) {
                            nodeClass = file.riskState === 'critical' ? 'vulnerable' : 'warning';
                          } else if (fileAffected) {
                            nodeClass = 'affected';
                          }

                          if (activeFile.id === file.id) {
                            nodeClass += ' active';
                          }

                          return (
                            <g 
                              key={`node-${file.id}`}
                              className={`dep-graph-node ${nodeClass}`}
                              transform={`translate(${pos.x}, ${pos.y})`}
                              onClick={() => onSelectFile(file.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <rect width="130" height="36" rx="4" />
                              <text x="12" y="22" fill="var(--text-primary)" style={{ fontSize: '11px', fontWeight: 600 }}>📄 {file.name}</text>
                              {hasIssues && (
                                <circle cx="118" cy="18" r="4" fill={file.riskState === 'critical' ? 'var(--critical-color)' : 'var(--warning-color)'} />
                              )}
                              {fileAffected && !hasIssues && (
                                <circle cx="118" cy="18" r="4" fill="var(--critical-color)" style={{ opacity: 0.6 }} />
                              )}
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </g>
              </svg>
            </div>
            
            {/* Legend banner */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              backgroundColor: 'var(--card-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              gap: '16px',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--critical-color)' }}></span>
                Vulnerable File
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }}></span>
                Clean File
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', border: '1px dashed rgba(239, 68, 68, 0.6)', borderRadius: '50%' }}></span>
                Affected Dependency
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
