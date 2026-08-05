import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Project, ProjectFile } from '../types';
import {
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Filter,
  AlertTriangle,
  RefreshCw,
  Eye,
  Crosshair,
  ExternalLink,
  Info,
  CheckCircle,
  Activity,
  GitCommit,
  Network
} from 'lucide-react';

export interface GraphViewNode {
  id: string;
  label: string;
  type: 'file' | 'package' | 'class' | 'function' | 'external';
  filePath: string;
  riskScore: number;
  riskState: 'safe' | 'medium' | 'high' | 'critical';
  complexity: number;
  linesOfCode: number;
  isExternal?: boolean;
  isCircular?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fileObj?: ProjectFile;
}

export interface GraphViewLink {
  source: string;
  target: string;
  type: 'imports' | 'calls' | 'extends' | 'depends';
  label?: string;
  isCircular?: boolean;
  isVulnerable?: boolean;
}

interface DependencyGraphViewProps {
  project: Project;
  activeFileId?: string;
  onSelectFile: (fileId: string) => void;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({
  project,
  activeFileId,
  onSelectFile
}) => {
  // ── 1. State Management ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedNeighborIds, setFocusedNeighborIds] = useState<Set<string>>(new Set());

  // Filter states
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({
    file: true,
    package: true,
    class: true,
    function: true,
    external: true
  });

  const [showExternal, setShowExternal] = useState(true);
  const [showHighRiskOnly, setShowHighRiskOnly] = useState(false);
  const [showCircularOnly, setShowCircularOnly] = useState(false);

  // Viewport Transform (Pan & Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 150, y: 100 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Physics Simulation
  const [nodes, setNodes] = useState<GraphViewNode[]>([]);
  const [links, setLinks] = useState<GraphViewLink[]>([]);
  const [isPhysicsActive, setIsPhysicsActive] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Set default active node
  useEffect(() => {
    if (activeFileId && !selectedNodeId) {
      const match = project.files.find(f => f.id === activeFileId);
      if (match) {
        setSelectedNodeId(`file:${match.path}`);
      }
    }
  }, [activeFileId, project.files, selectedNodeId]);

  // ── 2. Construct Raw Graph Nodes & Links ──────────────────────────────────
  useEffect(() => {
    const newNodes: GraphViewNode[] = [];
    const newLinks: GraphViewLink[] = [];
    const nodeSet = new Set<string>();

    const externalDeps = new Set<string>();

    // A. Add File Nodes
    project.files.forEach((f, idx) => {
      const nodeId = `file:${f.path}`;
      nodeSet.add(nodeId);

      const loc = f.code ? f.code.split('\n').length : 50;

      newNodes.push({
        id: nodeId,
        label: f.name,
        type: 'file',
        filePath: f.path,
        riskScore: f.riskScore || 0,
        riskState: f.riskState || 'safe',
        complexity: Math.round(loc / 10),
        linesOfCode: loc,
        x: (idx % 5) * 220 + 100 + (Math.random() - 0.5) * 50,
        y: Math.floor(idx / 5) * 160 + 100 + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        fileObj: f
      });

      // B. Add Package Nodes from folder paths
      const folder = f.path.includes('/') ? f.path.split('/')[0] : null;
      if (folder) {
        const pkgId = `package:${folder}`;
        if (!nodeSet.has(pkgId)) {
          nodeSet.add(pkgId);
          newNodes.push({
            id: pkgId,
            label: folder,
            type: 'package',
            filePath: folder,
            riskScore: 20,
            riskState: 'safe',
            complexity: 5,
            linesOfCode: 0,
            x: (idx % 5) * 220 + 80,
            y: Math.floor(idx / 5) * 160 + 50,
            vx: 0,
            vy: 0
          });
        }
        newLinks.push({
          source: pkgId,
          target: nodeId,
          type: 'depends',
          label: 'contains'
        });
      }

      // C. Dependencies (Links to internal files & external libraries)
      f.dependencies?.forEach(dep => {
        const internalMatch = project.files.find(targetFile =>
          targetFile.path === dep ||
          targetFile.path.includes(dep) ||
          targetFile.name === dep ||
          targetFile.path.replace(/\.[^/.]+$/, '').endsWith(dep.replace(/\.[^/.]+$/, ''))
        );

        if (internalMatch) {
          const targetId = `file:${internalMatch.path}`;
          newLinks.push({
            source: nodeId,
            target: targetId,
            type: 'imports',
            label: 'imports',
            isVulnerable: f.issues.some(i => !i.applied) || internalMatch.issues.some(i => !i.applied)
          });
        } else if (!dep.startsWith('.')) {
          // External library (e.g. 'react', 'lucide-react', 'express')
          const extId = `ext:${dep}`;
          externalDeps.add(dep);
          if (!nodeSet.has(extId)) {
            nodeSet.add(extId);
            newNodes.push({
              id: extId,
              label: dep,
              type: 'external',
              filePath: dep,
              riskScore: 0,
              riskState: 'safe',
              complexity: 0,
              linesOfCode: 0,
              isExternal: true,
              x: 800 + (Math.random() - 0.5) * 100,
              y: 200 + (Math.random() - 0.5) * 200,
              vx: 0,
              vy: 0
            });
          }
          newLinks.push({
            source: nodeId,
            target: extId,
            type: 'depends',
            label: 'depends on'
          });
        }
      });
    });

    // Detect Circular Dependencies
    const circularLinks = new Set<string>();
    newLinks.forEach(l1 => {
      newLinks.forEach(l2 => {
        if (l1.source === l2.target && l1.target === l2.source) {
          circularLinks.add(`${l1.source}->${l1.target}`);
          circularLinks.add(`${l2.source}->${l2.target}`);
        }
      });
    });

    const finalLinks = newLinks.map(l => ({
      ...l,
      isCircular: circularLinks.has(`${l.source}->${l.target}`)
    }));

    const finalNodes = newNodes.map(n => ({
      ...n,
      isCircular: Array.from(circularLinks).some(key => key.includes(n.id))
    }));

    setNodes(finalNodes);
    setLinks(finalLinks);
  }, [project]);

  // ── 3. Force-Directed Physics Simulation ──────────────────────────────────
  useEffect(() => {
    if (!isPhysicsActive || nodes.length === 0) return;

    let iterations = 0;
    const maxIterations = 200;

    const runPhysicsStep = () => {
      setNodes(prevNodes => {
        if (prevNodes.length === 0) return prevNodes;

        const updated = prevNodes.map(n => ({ ...n }));
        const nodeMap = new Map<string, GraphViewNode>(updated.map(n => [n.id, n]));

        // 1. Repulsion between nodes
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const n1 = updated[i];
            const n2 = updated[j];

            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            const minDist = 180;
            if (dist < minDist) {
              const force = (minDist - dist) / dist * 0.4;
              const fx = dx * force;
              const fy = dy * force;

              if (draggedNodeId !== n1.id) { n1.x -= fx; n1.y -= fy; }
              if (draggedNodeId !== n2.id) { n2.x += fx; n2.y += fy; }
            }
          }
        }

        // 2. Attraction along links
        links.forEach(link => {
          const source = nodeMap.get(link.source);
          const target = nodeMap.get(link.target);

          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const desiredDist = 160;
            const force = (dist - desiredDist) * 0.03;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (draggedNodeId !== source.id) { source.x += fx; source.y += fy; }
            if (draggedNodeId !== target.id) { target.x -= fx; target.y -= fy; }
          }
        });

        return updated;
      });

      iterations++;
      if (iterations < maxIterations) {
        animFrameRef.current = requestAnimationFrame(runPhysicsStep);
      } else {
        setIsPhysicsActive(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(runPhysicsStep);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPhysicsActive, links, draggedNodeId]);

  // ── 4. Filtering & Search Logic ───────────────────────────────────────────
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      // Type filter
      if (!typeFilters[n.type]) return false;
      // Show external toggle
      if (!showExternal && n.isExternal) return false;
      // High risk only toggle
      if (showHighRiskOnly && n.riskScore < 50 && n.riskState !== 'critical' && n.riskState !== 'high') return false;
      // Circular only toggle
      if (showCircularOnly && !n.isCircular) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = n.label.toLowerCase().includes(q) || n.filePath.toLowerCase().includes(q);
        if (!matchName) return false;
      }

      return true;
    });
  }, [nodes, typeFilters, showExternal, showHighRiskOnly, showCircularOnly, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredLinks = useMemo(() => {
    return links.filter(l => filteredNodeIds.has(l.source) && filteredNodeIds.has(l.target));
  }, [links, filteredNodeIds]);

  // Adjacency Map for Highlight & Neighbors Calculation
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    filteredLinks.forEach(l => {
      if (!map.has(l.source)) map.set(l.source, new Set());
      if (!map.has(l.target)) map.set(l.target, new Set());

      map.get(l.source)!.add(l.target);
      map.get(l.target)!.add(l.source);
    });
    return map;
  }, [filteredLinks]);

  // Active Highlight Set (Hovered or Selected Node + Neighbors)
  const highlightedNodeIds = useMemo(() => {
    const activeId = hoveredNodeId || selectedNodeId;
    if (!activeId) return null;

    const set = new Set<string>([activeId]);
    const neighbors = adjacencyMap.get(activeId);
    if (neighbors) {
      neighbors.forEach(nbr => set.add(nbr));
    }
    focusedNeighborIds.forEach(id => set.add(id));
    return set;
  }, [hoveredNodeId, selectedNodeId, adjacencyMap, focusedNeighborIds]);

  // ── 5. Calculated Graph Statistics ───────────────────────────────────────
  const graphStats = useMemo(() => {
    const totalNodes = filteredNodes.length;
    const totalEdges = filteredLinks.length;
    const circularCount = filteredLinks.filter(l => l.isCircular).length;
    const criticalCount = filteredNodes.filter(n => n.riskState === 'critical' || n.riskScore >= 50).length;

    let degreeSum = 0;
    filteredNodes.forEach(n => {
      const deg = (adjacencyMap.get(n.id)?.size) || 0;
      degreeSum += deg;
    });
    const avgDegree = totalNodes > 0 ? (degreeSum / totalNodes).toFixed(1) : '0';

    // Disjoint Connected Components (Union-Find)
    const parentMap = new Map<string, string>();
    filteredNodes.forEach(n => parentMap.set(n.id, n.id));
    const find = (i: string): string => {
      if (parentMap.get(i) === i) return i;
      const root = find(parentMap.get(i)!);
      parentMap.set(i, root);
      return root;
    };
    const union = (i: string, j: string) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parentMap.set(rootI, rootJ);
    };

    filteredLinks.forEach(l => union(l.source, l.target));
    const uniqueComponents = new Set(filteredNodes.map(n => find(n.id))).size;

    return {
      totalNodes,
      totalEdges,
      circularCount,
      criticalCount,
      avgDegree,
      connectedComponents: uniqueComponents
    };
  }, [filteredNodes, filteredLinks, adjacencyMap]);

  // Selected Node Details
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, nodes]);

  const selectedNodeIncoming = useMemo(() => {
    if (!selectedNodeId) return [];
    return filteredLinks.filter(l => l.target === selectedNodeId).map(l => nodes.find(n => n.id === l.source)).filter((n): n is GraphViewNode => n !== undefined);
  }, [selectedNodeId, filteredLinks, nodes]);

  const selectedNodeOutgoing = useMemo(() => {
    if (!selectedNodeId) return [];
    return filteredLinks.filter(l => l.source === selectedNodeId).map(l => nodes.find(n => n.id === l.target)).filter((n): n is GraphViewNode => n !== undefined);
  }, [selectedNodeId, filteredLinks, nodes]);

  // ── 6. Interactivity & Viewport Handlers ──────────────────────────────────
  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(2.5, Math.max(0.3, prev * factor)));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 150, y: 100 });
    setSelectedNodeId(null);
    setHoveredNodeId(null);
    setFocusedNeighborIds(new Set());
  };

  const handleFitGraph = () => {
    if (filteredNodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    filteredNodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const graphWidth = maxX - minX || 500;
    const graphHeight = maxY - minY || 500;

    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = containerRef.current?.clientHeight || 600;

    const newZoom = Math.min(1.5, Math.max(0.4, Math.min(containerWidth / (graphWidth + 200), containerHeight / (graphHeight + 200))));
    const newPanX = (containerWidth - graphWidth * newZoom) / 2 - minX * newZoom;
    const newPanY = (containerHeight - graphHeight * newZoom) / 2 - minY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleFocusNode = (node: GraphViewNode) => {
    setSelectedNodeId(node.id);

    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = containerRef.current?.clientHeight || 600;

    const targetPanX = containerWidth / 2 - node.x * zoom;
    const targetPanY = containerHeight / 2 - node.y * zoom;

    setPan({ x: targetPanX, y: targetPanY });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredNodes.length > 0) {
      handleFocusNode(filteredNodes[0]);
    }
  };

  // Mouse Drag Canvas Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (draggedNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseY = (e.clientY - rect.top - pan.y) / zoom;

        setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x: mouseX, y: mouseY } : n));
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    handleZoom(zoomFactor);
  };

  // Render Node Icon & Colors
  const getNodeColor = (node: GraphViewNode) => {
    if (node.isExternal) return '#64748B';
    if (node.riskState === 'critical' || node.riskScore >= 70) return '#EF4444';
    if (node.riskState === 'high' || node.riskScore >= 40) return '#F59E0B';
    if (node.type === 'package') return '#10B981';
    return '#6366F1';
  };

  const renderNodeIcon = (type: GraphViewNode['type']) => {
    switch (type) {
      case 'file': return '📄';
      case 'package': return '📦';
      case 'class': return '🏛';
      case 'function': return '⚙';
      case 'external': return '🔌';
      default: return '📄';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: '#090D16',
      color: '#F8FAFC',
      overflow: 'hidden',
      position: 'relative'
    }}>

      {/* ── TOP STATISTICS BAR ───────────────────────────────────────────── */}
      <div style={{
        height: '48px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        gap: '16px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Network size={14} style={{ color: 'var(--primary-color)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Nodes:</span>
            <strong style={{ color: '#F8FAFC' }}>{graphStats.totalNodes}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} style={{ color: '#10B981' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Edges:</span>
            <strong style={{ color: '#F8FAFC' }}>{graphStats.totalEdges}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} style={{ color: graphStats.circularCount > 0 ? '#EF4444' : '#10B981' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Circular Cycles:</span>
            <strong style={{ color: graphStats.circularCount > 0 ? '#EF4444' : '#10B981' }}>{graphStats.circularCount}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} style={{ color: graphStats.criticalCount > 0 ? '#F59E0B' : '#10B981' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Critical Nodes:</span>
            <strong style={{ color: graphStats.criticalCount > 0 ? '#F59E0B' : '#10B981' }}>{graphStats.criticalCount}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitCommit size={14} style={{ color: '#6366F1' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Avg Degree:</span>
            <strong style={{ color: '#F8FAFC' }}>{graphStats.avgDegree}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn"
            onClick={() => setIsPhysicsActive(!isPhysicsActive)}
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              backgroundColor: isPhysicsActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: '1px solid var(--border-color)',
              color: isPhysicsActive ? 'var(--primary-color)' : 'var(--text-secondary)'
            }}
          >
            {isPhysicsActive ? 'Freeze Physics ❄️' : 'Float Graph 🎈'}
          </button>
        </div>
      </div>

      {/* ── 3-PANEL MAIN CONTENT ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* ── LEFT PANEL (20%): SEARCH & HIERARCHY FILTERS ───────────────── */}
        <div style={{
          width: '240px',
          minWidth: '240px',
          borderRight: '1px solid var(--border-color)',
          backgroundColor: '#0F172A',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 5
        }}>
          {/* Live Search */}
          <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '12px', height: '32px' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </form>
          </div>

          {/* Node Type Filters */}
          <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={12} /> Filter Node Types
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={typeFilters.file}
                  onChange={(e) => setTypeFilters(prev => ({ ...prev, file: e.target.checked }))}
                />
                <span>📄 Files</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={typeFilters.package}
                  onChange={(e) => setTypeFilters(prev => ({ ...prev, package: e.target.checked }))}
                />
                <span>📦 Packages</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={typeFilters.class}
                  onChange={(e) => setTypeFilters(prev => ({ ...prev, class: e.target.checked }))}
                />
                <span>🏛 Classes</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={typeFilters.function}
                  onChange={(e) => setTypeFilters(prev => ({ ...prev, function: e.target.checked }))}
                />
                <span>⚙ Functions</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={typeFilters.external}
                  onChange={(e) => setTypeFilters(prev => ({ ...prev, external: e.target.checked }))}
                />
                <span>🔌 External Libraries</span>
              </label>
            </div>
          </div>

          {/* Quick Toggles */}
          <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              View Toggles
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span>External Libraries</span>
                <input
                  type="checkbox"
                  checked={showExternal}
                  onChange={(e) => setShowExternal(e.target.checked)}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span>Only High Risk</span>
                <input
                  type="checkbox"
                  checked={showHighRiskOnly}
                  onChange={(e) => setShowHighRiskOnly(e.target.checked)}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span>Only Circular Cycles</span>
                <input
                  type="checkbox"
                  checked={showCircularOnly}
                  onChange={(e) => setShowCircularOnly(e.target.checked)}
                />
              </label>
            </div>
          </div>

          {/* Node Hierarchy Tree List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Hierarchy ({filteredNodes.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredNodes.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleFocusNode(n)}
                  onMouseEnter={() => setHoveredNodeId(n.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    backgroundColor: selectedNodeId === n.id ? 'rgba(99, 102, 241, 0.25)' : hoveredNodeId === n.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    borderLeft: selectedNodeId === n.id ? '3px solid var(--primary-color)' : '3px solid transparent',
                    color: selectedNodeId === n.id ? '#FFFFFF' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{renderNodeIcon(n.type)}</span>
                  <span>{n.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CENTER PANEL (60%): INTERACTIVE GRAPH CANVAS ────────────────── */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            cursor: isPanning ? 'grabbing' : 'grab',
            overflow: 'hidden',
            backgroundColor: '#090D16'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Controls Overlay */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            display: 'flex',
            gap: '6px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '4px',
            zIndex: 10
          }}>
            <button className="btn" style={{ padding: '6px 8px' }} onClick={() => handleZoom(1.2)} title="Zoom In">
              <ZoomIn size={14} />
            </button>
            <button className="btn" style={{ padding: '6px 8px' }} onClick={() => handleZoom(0.8)} title="Zoom Out">
              <ZoomOut size={14} />
            </button>
            <button className="btn" style={{ padding: '6px 8px' }} onClick={handleFitGraph} title="Fit Graph to View">
              <Maximize2 size={14} />
            </button>
            <button className="btn" style={{ padding: '6px 8px' }} onClick={handleResetView} title="Reset View">
              <RotateCcw size={14} />
            </button>
          </div>

          {/* SVG Graph Viewport */}
          <svg width="100%" height="100%">
            <defs>
              <marker id="arrow-imports" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 2 L 10 5 L 0 8 z" fill="#6366F1" />
              </marker>
              <marker id="arrow-circular" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 2 L 10 5 L 0 8 z" fill="#EF4444" />
              </marker>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Render Links */}
              {filteredLinks.map((link, idx) => {
                const sourceNode = nodes.find(n => n.id === link.source);
                const targetNode = nodes.find(n => n.id === link.target);

                if (!sourceNode || !targetNode) return null;

                const isHighlight = highlightedNodeIds
                  ? (highlightedNodeIds.has(link.source) && highlightedNodeIds.has(link.target))
                  : true;

                const strokeColor = link.isCircular
                  ? '#EF4444'
                  : link.isVulnerable
                  ? '#F59E0B'
                  : '#6366F1';

                const strokeDash = link.type === 'calls' || targetNode.isExternal ? '4 4' : 'none';

                return (
                  <g key={`link-${idx}`} style={{ opacity: isHighlight ? 1 : 0.15, transition: 'opacity 0.2s ease' }}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={strokeColor}
                      strokeWidth={link.isCircular ? 2.5 : 1.5}
                      strokeDasharray={strokeDash}
                      markerEnd={link.isCircular ? "url(#arrow-circular)" : "url(#arrow-imports)"}
                    />
                  </g>
                );
              })}

              {/* Render Nodes */}
              {filteredNodes.map(node => {
                const isHighlight = highlightedNodeIds ? highlightedNodeIds.has(node.id) : true;
                const isSelected = selectedNodeId === node.id;
                const color = getNodeColor(node);

                return (
                  <g
                    key={`node-${node.id}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      if (node.fileObj) onSelectFile(node.fileObj.id);
                    }}
                    onDoubleClick={() => handleFocusNode(node)}
                    onMouseDown={() => setDraggedNodeId(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{
                      cursor: 'pointer',
                      opacity: isHighlight ? 1 : 0.15,
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    {/* Outer Focus Ring */}
                    {isSelected && (
                      <rect
                        x="-70"
                        y="-22"
                        width="140"
                        height="44"
                        rx="8"
                        fill="none"
                        stroke="var(--primary-color)"
                        strokeWidth="3"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.6))' }}
                      />
                    )}

                    {/* Main Node Box */}
                    <rect
                      x="-65"
                      y="-18"
                      width="130"
                      height="36"
                      rx="6"
                      fill="#0F172A"
                      stroke={color}
                      strokeWidth={node.isCircular ? "2.5" : "1.5"}
                    />

                    {/* Icon & Label */}
                    <text
                      x="-52"
                      y="4"
                      fill="#F8FAFC"
                      style={{ fontSize: '11px', fontWeight: 600, pointerEvents: 'none' }}
                    >
                      {renderNodeIcon(node.type)} {node.label.length > 12 ? node.label.slice(0, 10) + '..' : node.label}
                    </text>

                    {/* Risk Badge Dot */}
                    {node.riskScore > 0 && (
                      <circle
                        cx="52"
                        cy="0"
                        r="5"
                        fill={node.riskState === 'critical' ? '#EF4444' : '#F59E0B'}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Mini Map Viewport (Bottom Left) */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            width: '140px',
            height: '90px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <svg width="100%" height="100%">
              <g transform="scale(0.12) translate(10, 10)">
                {filteredNodes.map(n => (
                  <circle key={`mini-${n.id}`} cx={n.x} cy={n.y} r="12" fill={getNodeColor(n)} />
                ))}
              </g>
            </svg>
          </div>

          {/* Legend Banner (Bottom Right) */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            gap: '16px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            zIndex: 10
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#6366F1' }}>📄 File</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#10B981' }}>📦 Package</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#EF4444' }}>⚠️ Circular / Vulnerable</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#64748B' }}>🔌 External</span>
            </span>
          </div>
        </div>

        {/* ── RIGHT PANEL (20%): NODE DETAILS PANEL ───────────────────────── */}
        <div style={{
          width: '260px',
          minWidth: '260px',
          borderLeft: '1px solid var(--border-color)',
          backgroundColor: '#0F172A',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          overflowY: 'auto',
          zIndex: 5
        }}>
          {selectedNode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px' }}>{renderNodeIcon(selectedNode.type)}</span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', wordBreak: 'break-all' }}>
                    {selectedNode.label}
                  </h3>
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--primary-color)',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  {selectedNode.type}
                </span>
              </div>

              {/* Metrics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Risk Score</span>
                  <strong style={{ fontSize: '14px', color: selectedNode.riskScore >= 50 ? '#EF4444' : '#10B981' }}>
                    {selectedNode.riskScore}/100
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Complexity</span>
                  <strong style={{ fontSize: '14px', color: '#F8FAFC' }}>
                    {selectedNode.complexity}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Inbound (Ca)</span>
                  <strong style={{ fontSize: '14px', color: '#F8FAFC' }}>
                    {selectedNodeIncoming.length}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Outbound (Ce)</span>
                  <strong style={{ fontSize: '14px', color: '#F8FAFC' }}>
                    {selectedNodeOutgoing.length}
                  </strong>
                </div>
              </div>

              {/* Status Indicator */}
              <div style={{
                fontSize: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: selectedNode.isCircular ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                border: `1px solid ${selectedNode.isCircular ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                color: selectedNode.isCircular ? '#EF4444' : '#10B981',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {selectedNode.isCircular ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                <span>{selectedNode.isCircular ? 'Part of Circular Cycle' : 'Clean Topology'}</span>
              </div>

              {/* File Path */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  File Location:
                </span>
                <code style={{ fontSize: '11px', color: '#6EE7B7', wordBreak: 'break-all', display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '6px', borderRadius: '4px' }}>
                  {selectedNode.filePath}
                </code>
              </div>

              {/* Quick Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleFocusNode(selectedNode)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <Crosshair size={14} /> Focus Node
                </button>

                <button
                  className="btn"
                  onClick={() => {
                    const nbrs = adjacencyMap.get(selectedNode.id);
                    if (nbrs) setFocusedNeighborIds(nbrs);
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <Eye size={14} /> Highlight Neighbors
                </button>

                {selectedNode.fileObj && (
                  <button
                    className="btn"
                    onClick={() => onSelectFile(selectedNode.fileObj!.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--primary-color)' }}
                  >
                    <ExternalLink size={14} /> Open File Analysis
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <Info size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ fontSize: '13px', fontWeight: 600 }}>No Node Selected</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>Click any node on the graph or hierarchy list to inspect dependencies.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
