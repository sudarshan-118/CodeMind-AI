import type { GraphNode, GraphEdge, GraphEdgeType, KnowledgeGraphData, ParseResult } from '../shared/types';

export class KnowledgeGraphEngine {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();

  /**
   * Build complete Repository Knowledge Graph from file parse results
   */
  public buildGraph(parseResults: ParseResult[]): KnowledgeGraphData {
    this.nodes.clear();
    this.edges = [];
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();

    // 1. Create File & Module Nodes
    for (const res of parseResults) {
      const fileNodeId = `file:${res.filePath}`;
      const moduleName = this.extractModuleName(res.filePath);

      this.addNode({
        id: fileNodeId,
        label: res.filePath.split('/').pop() || res.filePath,
        type: 'file',
        filePath: res.filePath,
        metadata: {
          linesOfCode: res.linesOfCode,
          language: res.language
        }
      });

      // Package / Module Node
      const moduleNodeId = `module:${moduleName}`;
      if (!this.nodes.has(moduleNodeId)) {
        this.addNode({
          id: moduleNodeId,
          label: moduleName,
          type: 'module',
          filePath: res.filePath
        });
      }

      this.addEdge(moduleNodeId, fileNodeId, 'ownership');

      // 2. Class & Interface Symbols
      res.classes?.forEach(cls => {
        const classNodeId = `class:${res.filePath}:${cls.name}`;
        this.addNode({
          id: classNodeId,
          label: cls.name,
          type: 'class',
          filePath: res.filePath,
          line: cls.line,
          metadata: {
            methodsCount: cls.methodsCount,
            fieldsCount: cls.fieldsCount
          }
        });
        this.addEdge(fileNodeId, classNodeId, 'composition');
      });

      // 3. Function Symbols
      res.functions?.forEach(fn => {
        const fnNodeId = `func:${res.filePath}:${fn.name}`;
        this.addNode({
          id: fnNodeId,
          label: fn.name,
          type: 'function',
          filePath: res.filePath,
          line: fn.line,
          metadata: {
            complexity: fn.complexity,
            paramCount: fn.paramCount
          }
        });
        this.addEdge(fileNodeId, fnNodeId, 'composition');
      });

      // 4. Variables / Exports
      res.exports?.forEach(exp => {
        const varNodeId = `var:${res.filePath}:${exp}`;
        if (!this.nodes.has(varNodeId)) {
          this.addNode({
            id: varNodeId,
            label: exp,
            type: 'variable',
            filePath: res.filePath
          });
          this.addEdge(fileNodeId, varNodeId, 'ownership');
        }
      });
    }

    // 5. Dependency & Import Edges
    for (const res of parseResults) {
      const sourceFileId = `file:${res.filePath}`;

      const allDeps = [...(res.imports || []), ...(res.dependencies || [])];
      for (const dep of allDeps) {
        // Resolve target file path matching import string
        const targetParse = parseResults.find(p =>
          p.filePath.includes(dep) ||
          p.filePath.replace(/\.[^/.]+$/, '').endsWith(dep.replace(/\.[^/.]+$/, ''))
        );

        if (targetParse) {
          const targetFileId = `file:${targetParse.filePath}`;
          this.addEdge(sourceFileId, targetFileId, 'imports');
          this.addEdge(sourceFileId, targetFileId, 'depends_on');
        }
      }
    }

    return this.getGraphData();
  }

  /**
   * Incremental Graph Update for modified files
   */
  public updateFileNode(parseResult: ParseResult): void {
    const fileId = `file:${parseResult.filePath}`;

    // Remove existing symbol nodes associated with this file
    const removeNodeIds: string[] = [];
    this.nodes.forEach((node, id) => {
      if (node.filePath === parseResult.filePath && id !== fileId) {
        removeNodeIds.push(id);
      }
    });

    removeNodeIds.forEach(id => this.removeNode(id));

    // Re-build nodes & edges for updated file
    const tempEngine = new KnowledgeGraphEngine();
    tempEngine.buildGraph([parseResult]);

    const tempGraph = tempEngine.getGraphData();
    tempGraph.nodes.forEach(n => this.addNode(n));
    tempGraph.edges.forEach(e => this.addEdge(e.source, e.target, e.type, e.weight));
  }

  /**
   * Traversal Query: What files affect this class / symbol?
   */
  public getAffectedFiles(nodeIdOrPath: string): string[] {
    const targetId = this.resolveNodeId(nodeIdOrPath);
    if (!targetId) return [];

    const affected = new Set<string>();
    const queue = [targetId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = this.nodes.get(current);
      if (node && node.filePath) {
        affected.add(node.filePath);
      }

      const reverseNeighbors = this.reverseAdjacencyList.get(current);
      if (reverseNeighbors) {
        reverseNeighbors.forEach(neighbor => queue.push(neighbor));
      }
    }

    return Array.from(affected);
  }

  /**
   * Traversal Query: What breaks if this module / file changes? (Cascading Impact Analysis)
   */
  public getCascadingFailureImpact(filePath: string): {
    impactedFiles: string[];
    riskScore: number;
  } {
    const impacted = this.getAffectedFiles(filePath);
    const totalFiles = Math.max(1, this.nodes.size);
    const ratio = impacted.length / totalFiles;

    // Exponential impact formula based on reachability ratio
    const riskScore = Math.min(100, Math.round(ratio * 100 * 1.5));

    return {
      impactedFiles: impacted.filter(p => p !== filePath),
      riskScore
    };
  }

  /**
   * Traversal Query: Which components are highly coupled?
   */
  public getCoupledComponents(): Array<{ fileA: string; fileB: string; couplingStrength: number }> {
    const coupled: Array<{ fileA: string; fileB: string; couplingStrength: number }> = [];
    const fileNodes = Array.from(this.nodes.values()).filter(n => n.type === 'file');

    for (let i = 0; i < fileNodes.length; i++) {
      for (let j = i + 1; j < fileNodes.length; j++) {
        const fileA = fileNodes[i].id;
        const fileB = fileNodes[j].id;

        const forwardEdges = this.edges.filter(e => e.source === fileA && e.target === fileB).length;
        const reverseEdges = this.edges.filter(e => e.source === fileB && e.target === fileA).length;

        if (forwardEdges > 0 && reverseEdges > 0) {
          coupled.push({
            fileA: fileNodes[i].filePath,
            fileB: fileNodes[j].filePath,
            couplingStrength: forwardEdges + reverseEdges
          });
        }
      }
    }

    return coupled;
  }

  /**
   * Traversal Query: Which files depend on this utility / component?
   */
  public getReverseDependencies(filePath: string): string[] {
    const fileId = `file:${filePath}`;
    const dependentSet = this.reverseAdjacencyList.get(fileId);
    if (!dependentSet) return [];

    return Array.from(dependentSet)
      .map(id => this.nodes.get(id))
      .filter((n): n is GraphNode => n !== undefined && n.type === 'file')
      .map(n => n.filePath);
  }

  public getGraphData(): KnowledgeGraphData {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges]
    };
  }

  private addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) this.adjacencyList.set(node.id, new Set());
    if (!this.reverseAdjacencyList.has(node.id)) this.reverseAdjacencyList.set(node.id, new Set());
  }

  private removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.adjacencyList.delete(nodeId);
    this.reverseAdjacencyList.delete(nodeId);
    this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  }

  private addEdge(source: string, target: string, type: GraphEdgeType, weight = 1): void {
    if (source === target) return;
    this.edges.push({ source, target, type, weight });

    if (!this.adjacencyList.has(source)) this.adjacencyList.set(source, new Set());
    this.adjacencyList.get(source)!.add(target);

    if (!this.reverseAdjacencyList.has(target)) this.reverseAdjacencyList.set(target, new Set());
    this.reverseAdjacencyList.get(target)!.add(source);
  }

  private extractModuleName(filePath: string): string {
    const parts = filePath.split('/');
    if (parts.length > 1) {
      return parts[0] === 'src' ? parts.slice(0, 2).join('/') : parts[0];
    }
    return 'root';
  }

  private resolveNodeId(query: string): string | null {
    if (this.nodes.has(query)) return query;
    if (this.nodes.has(`file:${query}`)) return `file:${query}`;

    for (const [id, node] of this.nodes.entries()) {
      if (node.label === query || node.filePath === query) return id;
    }
    return null;
  }
}
