import type { DependencyMetrics, ParseResult } from '../shared/types';

export class DependencyGraphEngine {
  /**
   * Automatically calculate dependency metrics across repository parse results
   */
  public static calculateMetrics(parseResults: ParseResult[]): DependencyMetrics {
    const afferentCoupling: Record<string, number> = {};
    const efferentCoupling: Record<string, number> = {};
    const instability: Record<string, number> = {};

    const adjMap = new Map<string, Set<string>>();
    const allFiles = new Set<string>(parseResults.map(p => p.filePath));

    // Initialize metrics map
    allFiles.forEach(file => {
      afferentCoupling[file] = 0;
      efferentCoupling[file] = 0;
      adjMap.set(file, new Set());
    });

    // Build dependency adjacency map
    for (const res of parseResults) {
      const source = res.filePath;
      const deps = [...(res.imports || []), ...(res.dependencies || [])];

      for (const depStr of deps) {
        const target = parseResults.find(p =>
          p.filePath === depStr ||
          p.filePath.includes(depStr) ||
          p.filePath.replace(/\.[^/.]+$/, '').endsWith(depStr.replace(/\.[^/.]+$/, ''))
        );

        if (target && target.filePath !== source) {
          adjMap.get(source)!.add(target.filePath);
        }
      }
    }

    // Calculate Ca (Afferent Coupling) & Ce (Efferent Coupling)
    adjMap.forEach((targets, source) => {
      efferentCoupling[source] = targets.size; // Ce = outbound dependencies

      targets.forEach(target => {
        afferentCoupling[target] = (afferentCoupling[target] || 0) + 1; // Ca = inbound dependencies
      });
    });

    // Calculate Instability Score I = Ce / (Ca + Ce)
    allFiles.forEach(file => {
      const ca = afferentCoupling[file] || 0;
      const ce = efferentCoupling[file] || 0;

      if (ca + ce === 0) {
        instability[file] = 0;
      } else {
        const inst = ce / (ca + ce);
        instability[file] = Math.round(inst * 100) / 100;
      }
    });

    // Detect Circular Dependencies
    const circularDependencies = this.findCycles(adjMap);

    // Identify Unused / Dead Modules (Ca = 0, no exports referenced, not index/main file)
    const unusedModules: string[] = [];
    allFiles.forEach(file => {
      const ca = afferentCoupling[file] || 0;
      const isEntryPoint = /main\.|index\.|app\.|server\.|root\.|entry\./i.test(file);
      if (ca === 0 && !isEntryPoint) {
        unusedModules.push(file);
      }
    });

    // Identify Critical Nodes (High Afferent Coupling Ca >= 3 or top 10% Ca)
    const criticalNodes: string[] = [];
    allFiles.forEach(file => {
      if ((afferentCoupling[file] || 0) >= 3) {
        criticalNodes.push(file);
      }
    });

    return {
      afferentCoupling,
      efferentCoupling,
      instability,
      circularDependencies,
      unusedModules,
      criticalNodes
    };
  }

  /**
   * Tarjan's Cycle Detection Algorithm for finding circular dependencies
   */
  private static findCycles(adjMap: Map<string, Set<string>>): Array<{ file: string; cycle: string[] }> {
    const cycles: Array<{ file: string; cycle: string[] }> = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = adjMap.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            dfs(neighbor);
          } else if (recStack.has(neighbor)) {
            // Cycle found! Extract sub-path of cycle
            const cycleStartIndex = path.indexOf(neighbor);
            if (cycleStartIndex !== -1) {
              const cyclePath = path.slice(cycleStartIndex).concat(neighbor);
              cycles.push({
                file: node,
                cycle: cyclePath.map(p => p.split('/').pop() || p)
              });
            }
          }
        }
      }

      path.pop();
      recStack.delete(node);
    };

    adjMap.forEach((_, node) => {
      if (!visited.has(node)) {
        dfs(node);
      }
    });

    // Deduplicate identical cycles
    const seen = new Set<string>();
    return cycles.filter(c => {
      const key = c.cycle.join('->');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
