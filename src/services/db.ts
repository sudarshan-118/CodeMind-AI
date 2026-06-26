import { supabase } from '../supabaseClient';
import type { Project, Memory, Standard, Activity, ProjectFile, Issue } from '../types';
import { INITIAL_PROJECTS, INITIAL_STANDARDS, INITIAL_MEMORIES, INITIAL_ACTIVITIES } from '../mockData';

function getMockCodeForFile(filename: string): string {
  const found = INITIAL_PROJECTS.flatMap(p => p.files).find(f => f.name === filename);
  return found?.code || `// Source code for ${filename}`;
}

export interface DBMemory {
  id: string;
  project_id: string;
  review_id?: string | null;
  memory_type: string;
  title: string;
  description: string;
  memory_data?: {
    issue_type?: string;
    severity?: 'safe' | 'medium' | 'high' | 'critical';
    file?: string;
    line?: number;
    recommended_fix?: string;
    outcome?: string;
    tags?: string[];
  };
  owner_id?: string;
  created_at?: string;
}

export interface DBVulnerability {
  id: string;
  project_id: string;
  review_id?: string | null;
  file_path: string;
  severity: string;
  status: 'open' | 'resolved';
  vulnerability_data?: {
    line?: number;
    issue?: string;
    explanation?: string;
    fix?: string;
    code_snippet?: string;
    fixed_code?: string;
    severity?: string;
  };
  owner_id?: string;
  created_at?: string;
}

export interface DBReview {
  id: string;
  project_id: string;
  overall_score: number;
  security_score: number;
  architecture_score: number;
  performance_score: number;
  maintainability_score: number;
  summary?: string;
  review_metadata?: {
    framework?: string;
    language?: string;
    files_scanned?: number;
    critical_count?: number;
    high_count?: number;
    medium_count?: number;
  };
  owner_id?: string;
  created_at: string;
}

export interface DBTeamStandard {
  id: string;
  project_id?: string;
  rule_name: string;
  name?: string;
  category: string;
  ruleKeyword?: string;
  rule_data?: {
    ruleKeyword?: string;
    description?: string;
    enabled?: boolean;
  };
  owner_id?: string;
  created_at?: string;
}

// Check if credentials exist to switch between Supabase and LocalStorage emulation
const hasSupabaseCreds = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Helper to log state
const logMode = () => {
  if (hasSupabaseCreds) {
    console.log('CodeMind AI DB Service: Running in live SUPABASE mode.');
  } else {
    console.log('CodeMind AI DB Service: Running in Local Storage EMULATION mode.');
  }
};
logMode();

// DB SERVICE INTERFACE
export const dbService = {
  // 1. Projects CRUD
  async createProject(project: {
    name: string;
    description: string;
    source_type: 'github' | 'zip' | 'folder' | 'file';
    github_url?: string;
  }, ownerId: string): Promise<string> {
    if (hasSupabaseCreds) {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: project.name,
          description: project.description,
          source_type: project.source_type,
          github_url: project.github_url || null,
          owner_id: ownerId
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } else {
      // Local fallback
      const projects = JSON.parse(localStorage.getItem('codemind_projects') || '[]');
      const newId = `proj-${Date.now()}`;
      const newProj: Project = {
        id: newId,
        name: project.name,
        description: project.description,
        language: project.source_type === 'github' ? 'TypeScript' : 'Python',
        status: 'ready',
        overallScore: 80,
        securityScore: 80,
        architectureScore: 80,
        performanceScore: 80,
        maintainabilityScore: 80,
        branch: 'main',
        commitHash: Math.random().toString(16).substring(2, 9),
        files: [],
        ownerId
      };
      projects.push(newProj);
      localStorage.setItem('codemind_projects', JSON.stringify(projects));
      return newId;
    }
  },

  async getProjects(ownerId: string): Promise<Project[]> {
    if (hasSupabaseCreds) {
      const { data: projs, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', ownerId);
      
      if (error) throw error;
      if (!projs) return [];

      const projectsList: Project[] = [];
      for (const p of projs) {
        // Fetch review
        const { data: revs } = await supabase
          .from('reviews')
          .select('*')
          .eq('project_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const latestRev = revs?.[0];

        // Fetch vulnerabilities
        const { data: vulns } = await supabase
          .from('vulnerabilities')
          .select('*')
          .eq('project_id', p.id);

        // Fetch graph
        const { data: graphs } = await supabase
          .from('dependency_graphs')
          .select('*')
          .eq('project_id', p.id)
          .limit(1);
        const graphData = graphs?.[0]?.graph_data;

        // Reconstruct files
        const files: ProjectFile[] = [];
        if (graphData && graphData.nodes) {
          graphData.nodes.forEach((node: any) => {
            // node.path holds the real file path (e.g. "my-repo/src/auth.ts")
            // node.id holds the client-generated file ID (e.g. "file-proj-1234-0")
            const filePath = node.path || node.id;

            // Match vulnerabilities by actual file path first, then by node id/label as fallback
            const fileVulns = vulns?.filter((v: DBVulnerability) =>
              v.file_path === filePath ||
              v.file_path === node.id ||
              v.file_path === node.label
            ) || [];
            
            const issues: Issue[] = fileVulns.map((v: DBVulnerability) => ({
              id: v.id,
              line: v.vulnerability_data?.line || 1,
              type: v.vulnerability_data?.issue || v.severity,
              severity: v.severity as 'safe' | 'medium' | 'high' | 'critical',
              explanation: v.vulnerability_data?.explanation || '',
              recommendedFix: v.vulnerability_data?.fix || '',
              applied: v.status === 'resolved'
            }));

            const fileEdges = graphData.edges?.filter((e: any) => e.source === node.id) || [];
            const dependencies = fileEdges.map((e: any) => {
              const targetNode = graphData.nodes.find((n: any) => n.id === e.target);
              // Return the real path of the dependency
              return targetNode ? (targetNode.path || targetNode.id) : '';
            }).filter((d: string) => d !== '');

            const code = node.code || fileVulns[0]?.vulnerability_data?.code_snippet || getMockCodeForFile(node.label);

            files.push({
              id: node.id,
              projectId: p.id,
              name: node.label,
              path: filePath,
              isDir: node.isDir || false,
              isCode: node.isCode !== undefined ? node.isCode : true,
              language: node.language || (node.label.endsWith('.py') ? 'Python' : 'TypeScript'),
              riskState: node.risk || 'safe',
              riskScore: node.riskScore ?? 0,
              size: node.size ?? 0,
              imports: node.imports || [],
              exports: node.exports || [],
              code,
              issues,
              dependencies
            });
          });
        }

        // Derive primary language from actual files (most common language wins)
        const langCounts = new Map<string, number>();
        files.filter(f => f.isCode && f.language).forEach(f => {
          langCounts.set(f.language!, (langCounts.get(f.language!) || 0) + 1);
        });
        const primaryLang = langCounts.size > 0
          ? [...langCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
          : (p.name.includes('.py') || p.description?.includes('Python') ? 'Python' : 'TypeScript');

        projectsList.push({
          id: p.id,
          name: p.name,
          description: p.description || '',
          language: primaryLang,
          status: 'ready',
          overallScore: latestRev?.overall_score || 80,
          securityScore: latestRev?.security_score || 80,
          architectureScore: latestRev?.architecture_score || 80,
          performanceScore: latestRev?.performance_score || 80,
          maintainabilityScore: latestRev?.maintainability_score || 80,
          branch: 'main',
          commitHash: p.id.substring(0, 7),
          files,
          ownerId: p.owner_id,
          analysisStats: graphData?.analysisStats || undefined
        });
      }
      return projectsList;
    } else {
      const saved = localStorage.getItem('codemind_projects');
      const projects = saved ? JSON.parse(saved) : INITIAL_PROJECTS;
      return projects.filter((p: Project) => !p.ownerId || p.ownerId === ownerId);
    }
  },

  // 2. Save Review Report
  async saveReview(review: {
    project_id: string;
    overall_score: number;
    security_score: number;
    architecture_score: number;
    performance_score: number;
    maintainability_score: number;
    summary: string;
    review_metadata: {
      framework?: string;
      language?: string;
      files_scanned: number;
      critical_count: number;
      high_count: number;
      medium_count: number;
    };
  }, ownerId: string): Promise<string> {
    if (hasSupabaseCreds) {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          project_id: review.project_id,
          overall_score: review.overall_score,
          security_score: review.security_score,
          architecture_score: review.architecture_score,
          performance_score: review.performance_score,
          maintainability_score: review.maintainability_score,
          summary: review.summary,
          review_metadata: review.review_metadata,
          owner_id: ownerId
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } else {
      // Emulation save
      const reviews = JSON.parse(localStorage.getItem('codemind_reviews') || '[]');
      const newId = `rev-${Date.now()}`;
      reviews.push({ id: newId, ...review, ownerId, created_at: new Date().toISOString() });
      localStorage.setItem('codemind_reviews', JSON.stringify(reviews));
      return newId;
    }
  },

  // 3. Save Memory (hindsight resolution pattern)
  async saveMemory(memory: {
    project_id: string;
    review_id?: string;
    memory_type: string;
    title: string;
    description: string;
    memory_data: {
      issue_type: string;
      severity: 'safe' | 'medium' | 'high' | 'critical';
      file: string;
      line: number;
      recommended_fix: string;
      outcome: string;
      tags: string[];
    };
  }, ownerId: string): Promise<string> {
    if (hasSupabaseCreds) {
      const { data, error } = await supabase
        .from('memories')
        .insert({
          project_id: memory.project_id,
          review_id: memory.review_id || null,
          memory_type: memory.memory_type,
          title: memory.title,
          description: memory.description,
          memory_data: memory.memory_data,
          owner_id: ownerId
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } else {
      const memories = JSON.parse(localStorage.getItem('codemind_memories') || '[]');
      const newId = `mem-${Date.now()}`;
      const memoryEntry: Memory = {
        id: newId,
        issue: memory.title || `${memory.memory_data.issue_type} in ${memory.memory_data.file}`,
        fix: memory.memory_data.recommended_fix,
        outcome: memory.memory_data.outcome,
        recommendation: memory.description || `Enforce standard rules for ${memory.memory_data.issue_type}`,
        date: new Date().toISOString().split('T')[0],
        matchPercentage: 90,
        ownerId
      };
      
      const exists = memories.some((m: any) => m.issue === memoryEntry.issue && m.fix === memoryEntry.fix);
      if (!exists) {
        memories.push(memoryEntry);
        localStorage.setItem('codemind_memories', JSON.stringify(memories));
      }
      
      // Also save raw memory structure for jsonb emulation
      const rawMems = JSON.parse(localStorage.getItem('codemind_raw_memories') || '[]');
      const rawExists = rawMems.some((m: any) => 
        m.title === memory.title && 
        m.memory_data?.recommended_fix === memory.memory_data?.recommended_fix
      );
      if (!rawExists) {
        rawMems.push({ id: newId, ...memory, owner_id: ownerId, created_at: new Date().toISOString() });
        localStorage.setItem('codemind_raw_memories', JSON.stringify(rawMems));
      }

      return newId;
    }
  },

  // 4. Save Vulnerability Issue
  async saveVulnerability(vuln: {
    id?: string;
    project_id: string;
    review_id?: string;
    file_path: string;
    severity: string;
    status: 'open' | 'resolved';
    vulnerability_data: {
      line: number;
      issue: string;
      explanation: string;
      fix: string;
      code_snippet: string;
      fixed_code?: string;
    };
  }, ownerId: string): Promise<string> {
    if (hasSupabaseCreds) {
      const { data, error } = await supabase
        .from('vulnerabilities')
        .insert({
          id: vuln.id,
          project_id: vuln.project_id,
          review_id: vuln.review_id || null,
          file_path: vuln.file_path,
          severity: vuln.severity,
          status: vuln.status,
          vulnerability_data: vuln.vulnerability_data,
          owner_id: ownerId
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } else {
      const vulns = JSON.parse(localStorage.getItem('codemind_vulnerabilities') || '[]');
      const newId = vuln.id || `vuln-${Date.now()}`;
      vulns.push({ id: newId, ...vuln, owner_id: ownerId, created_at: new Date().toISOString() });
      localStorage.setItem('codemind_vulnerabilities', JSON.stringify(vulns));
      return newId;
    }
  },

  // 5. Save Dependency Graph
  async saveDependencyGraph(graph: {
    project_id: string;
    graph_data: any;
  }, ownerId: string): Promise<string> {
    if (hasSupabaseCreds) {
      const { data, error } = await supabase
        .from('dependency_graphs')
        .insert({
          project_id: graph.project_id,
          graph_data: graph.graph_data,
          owner_id: ownerId
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } else {
      localStorage.setItem(`codemind_graph_${graph.project_id}`, JSON.stringify(graph.graph_data));
      return `graph-${Date.now()}`;
    }
  },

  // 6. Memory Fetching
  async getProjectMemories(projectId?: string, ownerId?: string): Promise<DBMemory[]> {
    if (hasSupabaseCreds) {
      let query = supabase.from('memories').select('*');
      if (projectId) query = query.eq('project_id', projectId);
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query;
      
      if (error) throw error;
      return (data as DBMemory[]) || [];
    } else {
      const rawMems = JSON.parse(localStorage.getItem('codemind_raw_memories') || '[]');
      return rawMems.filter((m: DBMemory) => 
        (!projectId || m.project_id === projectId) && 
        (!ownerId || m.owner_id === ownerId)
      );
    }
  },

  // 7. Vulnerabilities Fetching
  async getHistoricalFindings(projectId?: string, ownerId?: string): Promise<DBVulnerability[]> {
    if (hasSupabaseCreds) {
      let query = supabase.from('vulnerabilities').select('*');
      if (projectId) query = query.eq('project_id', projectId);
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query;
      
      if (error) throw error;
      return (data as DBVulnerability[]) || [];
    } else {
      const vulns = JSON.parse(localStorage.getItem('codemind_vulnerabilities') || '[]');
      return vulns.filter((v: DBVulnerability) => 
        (!projectId || v.project_id === projectId) && 
        (!ownerId || v.owner_id === ownerId)
      );
    }
  },

  // 8. Reviews Fetching
  async getReviewHistory(projectId?: string, ownerId?: string): Promise<DBReview[]> {
    if (hasSupabaseCreds) {
      let query = supabase.from('reviews').select('*');
      if (projectId) query = query.eq('project_id', projectId);
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data as DBReview[]) || [];
    } else {
      const reviews = JSON.parse(localStorage.getItem('codemind_reviews') || '[]');
      return reviews.filter((r: DBReview) => 
        (!projectId || r.project_id === projectId) && 
        (!ownerId || r.owner_id === ownerId)
      );
    }
  },

  // 9. Contextual Intelligence Builder
  async getContextualIntelligence(projectId: string, ownerId: string): Promise<{
    historical_issues: Array<{ file: string; issue: string; severity: string; status: string }>;
    successful_fixes: Array<{ issue: string; fix: string; outcome: string }>;
    architecture_decisions: Array<{ decision: string; reasoning: string }>;
    team_standards: Array<{ rule: string; category: string; keyword: string }>;
  }> {
    const prevVulns = await dbService.getHistoricalFindings(projectId, ownerId);
    const projectMems = await dbService.getProjectMemories(projectId, ownerId);

    const successfulFixes = projectMems.filter(
      (m: DBMemory) => m.memory_data?.outcome === 'resolved' || m.memory_data?.outcome === 'successful'
    );
    const archDecisions = projectMems.filter(
      (m: DBMemory) => m.memory_type === 'architecture'
    );

    const standardsList = await dbService.getStandards(ownerId);

    return {
      historical_issues: prevVulns.map(v => ({
        file: v.file_path,
        issue: v.vulnerability_data?.issue || 'Vulnerability',
        severity: v.severity,
        status: v.status
      })),
      successful_fixes: successfulFixes.map(f => ({
        issue: f.title,
        fix: f.memory_data?.recommended_fix || '',
        outcome: f.memory_data?.outcome || ''
      })),
      architecture_decisions: archDecisions.map(a => ({
        decision: a.title,
        reasoning: a.description || ''
      })),
      team_standards: standardsList.map(s => ({
        rule: s.name,
        category: s.severity === 'critical' ? 'security' : 'architecture',
        keyword: s.ruleKeyword
      }))
    };
  },

  // 10. JSONB Querying functions
  async findSecurityMemories(projectId?: string, ownerId?: string): Promise<DBMemory[]> {
    if (hasSupabaseCreds) {
      let query = supabase.from('memories').select('*');
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }
      const { data, error } = await query
        .or('memory_type.eq.security,memory_data->>severity.eq.critical,memory_data->>severity.eq.high');

      if (error) throw error;
      return (data as DBMemory[]) || [];
    } else {
      const rawMems = JSON.parse(localStorage.getItem('codemind_raw_memories') || '[]');
      return rawMems.filter((m: DBMemory) => 
        (!projectId || m.project_id === projectId) && 
        (!ownerId || m.owner_id === ownerId) &&
        (m.memory_type === 'security' || m.memory_data?.severity === 'critical' || m.memory_data?.severity === 'high')
      );
    }
  },

  async findMemoriesForFile(filePath: string, projectId?: string, ownerId?: string): Promise<DBMemory[]> {
    if (hasSupabaseCreds) {
      let query = supabase.from('memories').select('*');
      if (projectId) query = query.eq('project_id', projectId);
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query.eq('memory_data->>file', filePath);
      if (error) throw error;
      return (data as DBMemory[]) || [];
    } else {
      const rawMems = JSON.parse(localStorage.getItem('codemind_raw_memories') || '[]');
      return rawMems.filter((m: DBMemory) => 
        (!projectId || m.project_id === projectId) && 
        (!ownerId || m.owner_id === ownerId) &&
        m.memory_data?.file === filePath
      );
    }
  },

  async findSuccessfulFixes(projectId?: string, ownerId?: string): Promise<DBMemory[]> {
    if (hasSupabaseCreds) {
      let query = supabase.from('memories').select('*');
      if (projectId) query = query.eq('project_id', projectId);
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query.eq('memory_data->>outcome', 'resolved');
      if (error) throw error;
      return (data as DBMemory[]) || [];
    } else {
      const rawMems = JSON.parse(localStorage.getItem('codemind_raw_memories') || '[]');
      return rawMems.filter((m: DBMemory) => 
        (!projectId || m.project_id === projectId) && 
        (!ownerId || m.owner_id === ownerId) &&
        (m.memory_data?.outcome === 'resolved' || m.memory_data?.outcome === 'successful')
      );
    }
  },

  async findRecurringVulnerabilities(projectId?: string, ownerId?: string): Promise<DBVulnerability[]> {
    let vulns: DBVulnerability[];
    if (hasSupabaseCreds) {
      const query = supabase.from('vulnerabilities').select('*');
      if (ownerId) query.eq('owner_id', ownerId);
      const filteredQuery = projectId ? query.eq('project_id', projectId) : query;
      const { data } = await filteredQuery;
      vulns = (data as DBVulnerability[]) || [];
    } else {
      const savedVulns = JSON.parse(localStorage.getItem('codemind_vulnerabilities') || '[]');
      vulns = projectId ? savedVulns.filter((v: DBVulnerability) => v.project_id === projectId) : savedVulns;
      if (ownerId) vulns = vulns.filter((v: DBVulnerability) => v.owner_id === ownerId);
    }

    const countsMap = new Map<string, number>();
    vulns.forEach(v => {
      const name = v.vulnerability_data?.issue || 'Vulnerability';
      countsMap.set(name, (countsMap.get(name) || 0) + 1);
    });

    return vulns.filter(v => {
      const name = v.vulnerability_data?.issue || 'Vulnerability';
      return (countsMap.get(name) || 0) > 1;
    });
  },

  async findMemoriesBySeverity(severity: string, projectId?: string, ownerId?: string): Promise<DBMemory[]> {
    if (hasSupabaseCreds) {
      let query = supabase.from('memories').select('*');
      if (projectId) query = query.eq('project_id', projectId);
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query.eq('memory_data->>severity', severity);
      if (error) throw error;
      return (data as DBMemory[]) || [];
    } else {
      const rawMems = JSON.parse(localStorage.getItem('codemind_raw_memories') || '[]');
      return rawMems.filter((m: DBMemory) => 
        (!projectId || m.project_id === projectId) && 
        (!ownerId || m.owner_id === ownerId) &&
        m.memory_data?.severity === severity
      );
    }
  },

  // 11. Dashboard Analytics Query Aggregator
  async getDashboardAnalytics(projectId?: string, ownerId?: string): Promise<{
    totalMemories: number;
    criticalVulnerabilities: number;
    resolvedIssues: number;
    recurringIssues: number;
    mostCommonIssueTypes: Array<{ name: string; value: number }>;
    projectHealthTrend: Array<{ date: string; score: number }>;
  }> {
    let memoriesList: DBMemory[];
    let vulnsList: DBVulnerability[];
    let reviewsList: DBReview[];

    if (hasSupabaseCreds) {
      let memQuery = supabase.from('memories').select('*');
      if (projectId) memQuery = memQuery.eq('project_id', projectId);
      if (ownerId) memQuery = memQuery.eq('owner_id', ownerId);
      const { data: mems } = await memQuery;
      memoriesList = (mems as DBMemory[]) || [];

      let vulnQuery = supabase.from('vulnerabilities').select('*');
      if (projectId) vulnQuery = vulnQuery.eq('project_id', projectId);
      if (ownerId) vulnQuery = vulnQuery.eq('owner_id', ownerId);
      const { data: vulns } = await vulnQuery;
      vulnsList = (vulns as DBVulnerability[]) || [];

      let revQuery = supabase.from('reviews').select('*').order('created_at', { ascending: true });
      if (projectId) revQuery = revQuery.eq('project_id', projectId);
      if (ownerId) revQuery = revQuery.eq('owner_id', ownerId);
      const { data: revs } = await revQuery;
      reviewsList = (revs as DBReview[]) || [];
    } else {
      const savedMems = JSON.parse(localStorage.getItem('codemind_memories') || '[]');
      const filteredMems = savedMems.filter((m: Memory) => !ownerId || m.ownerId === ownerId);
      memoriesList = filteredMems.map((m: Memory) => ({
        id: m.id,
        project_id: projectId || 'proj-1',
        memory_type: 'security',
        title: m.issue,
        description: m.recommendation,
        memory_data: {
          issue_type: m.issue,
          severity: 'high',
          file: '',
          line: 0,
          recommended_fix: m.fix,
          outcome: m.outcome,
          tags: []
        }
      }));

      const savedVulns = JSON.parse(localStorage.getItem('codemind_vulnerabilities') || '[]');
      vulnsList = projectId ? savedVulns.filter((v: DBVulnerability) => v.project_id === projectId) : savedVulns;
      if (ownerId) vulnsList = vulnsList.filter((v: DBVulnerability) => v.owner_id === ownerId);

      const savedReviews = JSON.parse(localStorage.getItem('codemind_reviews') || '[]');
      reviewsList = projectId ? savedReviews.filter((r: DBReview) => r.project_id === projectId) : savedReviews;
      if (ownerId) reviewsList = reviewsList.filter((r: DBReview) => r.owner_id === ownerId);
    }

    const totalMemories = memoriesList.length;

    const criticalVulnerabilities = vulnsList.filter(
      v => (v.severity === 'critical' || v.vulnerability_data?.severity === 'critical') && v.status === 'open'
    ).length;

    const resolvedIssues = vulnsList.filter(v => v.status === 'resolved').length;

    const issuesCounts = new Map<string, number>();
    vulnsList.forEach(v => {
      const issueName = v.vulnerability_data?.issue || 'Vulnerability';
      issuesCounts.set(issueName, (issuesCounts.get(issueName) || 0) + 1);
    });

    let recurringIssues = 0;
    issuesCounts.forEach(count => {
      if (count > 1) recurringIssues++;
    });

    const commonTypesArray = Array.from(issuesCounts.entries())
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const projectHealthTrend = reviewsList.map(r => ({
      date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: r.overall_score
    }));

    const trendSeed = projectHealthTrend.length > 0 ? projectHealthTrend : [
      { date: 'May 15', score: 65 },
      { date: 'May 22', score: 70 },
      { date: 'May 29', score: 72 },
      { date: 'Jun 05', score: 78 },
      { date: 'Jun 12', score: 81 },
      { date: 'Today', score: 85 }
    ];

    return {
      totalMemories,
      criticalVulnerabilities,
      resolvedIssues,
      recurringIssues,
      mostCommonIssueTypes: commonTypesArray.length > 0 ? commonTypesArray : [
        { name: 'SQL Injection', value: 4 },
        { name: 'Hardcoded Secret', value: 3 },
        { name: 'Singleton Violation', value: 2 },
        { name: 'Command Injection', value: 1 }
      ],
      projectHealthTrend: trendSeed
    };
  },

  // 12. New user-specific standards methods
  async createStandard(std: Standard, ownerId: string): Promise<string> {
    if (hasSupabaseCreds) {
      const { data, error } = await supabase
        .from('team_standards')
        .insert({
          rule_name: std.name,
          category: std.severity === 'critical' ? 'security' : 'architecture',
          rule_data: {
            description: std.description,
            enabled: std.enabled,
            ruleKeyword: std.ruleKeyword
          },
          owner_id: ownerId
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    } else {
      const standards = JSON.parse(localStorage.getItem('codemind_standards') || '[]');
      const newStd = { ...std, ownerId };
      standards.push(newStd);
      localStorage.setItem('codemind_standards', JSON.stringify(standards));
      return std.id;
    }
  },

  async getStandards(ownerId: string): Promise<Standard[]> {
    if (hasSupabaseCreds) {
      const { data, error } = await supabase
        .from('team_standards')
        .select('*')
        .eq('owner_id', ownerId);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      return data.map((s: DBTeamStandard) => ({
        id: s.id,
        name: s.rule_name,
        description: s.rule_data?.description || '',
        enabled: s.rule_data?.enabled ?? true,
        ruleKeyword: s.rule_data?.ruleKeyword || s.ruleKeyword || '',
        severity: s.category === 'security' ? 'critical' : 'warning',
        ownerId: s.owner_id
      }));
    } else {
      const saved = localStorage.getItem('codemind_standards');
      const standards = saved ? JSON.parse(saved) : INITIAL_STANDARDS;
      return standards.filter((s: Standard) => !s.ownerId || s.ownerId === ownerId);
    }
  },

  async updateStandardEnabled(stdId: string, enabled: boolean, ownerId: string): Promise<void> {
    if (hasSupabaseCreds) {
      const { data: std } = await supabase
        .from('team_standards')
        .select('*')
        .eq('id', stdId)
        .eq('owner_id', ownerId)
        .single();
      if (std) {
        const updatedRuleData = { ...std.rule_data, enabled };
        const { error } = await supabase
          .from('team_standards')
          .update({ rule_data: updatedRuleData })
          .eq('id', stdId)
          .eq('owner_id', ownerId);
        if (error) throw error;
      }
    } else {
      const standards = JSON.parse(localStorage.getItem('codemind_standards') || '[]');
      const updated = standards.map((s: Standard) => s.id === stdId ? { ...s, enabled } : s);
      localStorage.setItem('codemind_standards', JSON.stringify(updated));
    }
  },

  async deleteStandard(stdId: string, ownerId: string): Promise<void> {
    if (hasSupabaseCreds) {
      const { error } = await supabase
        .from('team_standards')
        .delete()
        .eq('id', stdId)
        .eq('owner_id', ownerId);
      if (error) throw error;
    } else {
      const standards = JSON.parse(localStorage.getItem('codemind_standards') || '[]');
      const updated = standards.filter((s: Standard) => s.id !== stdId);
      localStorage.setItem('codemind_standards', JSON.stringify(updated));
    }
  },

  // 13. Activities persistence
  async createActivity(act: Activity, ownerId: string): Promise<string> {
    // Always persist to localStorage for fast access
    const activities = JSON.parse(localStorage.getItem('codemind_activities') || '[]');
    const newAct = { ...act, ownerId };
    // Keep only the last 100 activities to avoid bloat
    activities.unshift(newAct);
    if (activities.length > 100) activities.splice(100);
    localStorage.setItem('codemind_activities', JSON.stringify(activities));
    return act.id;
  },

  async getActivities(ownerId: string): Promise<Activity[]> {
    const saved = localStorage.getItem('codemind_activities');
    const activities = saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
    return activities.filter((a: Activity) => !a.ownerId || a.ownerId === ownerId);
  },

  // 14. Memories management
  async createMemoryFromModel(mem: Memory, ownerId: string): Promise<string> {
    if (hasSupabaseCreds) {
      // Fetch user's first project to associate with this memory to satisfy NOT NULL constraint
      const { data: projs, error: projErr } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', ownerId)
        .limit(1);

      if (projErr) throw projErr;
      const firstProjId = projs?.[0]?.id;
      if (!firstProjId) {
        throw new Error(`Cannot seed memory "${mem.issue}": No project exists for owner ${ownerId}`);
      }

      const { data, error } = await supabase
        .from('memories')
        .insert({
          project_id: firstProjId,
          memory_type: 'security',
          title: mem.issue.split(' in ')[0],
          description: mem.recommendation,
          memory_data: {
            issue_type: mem.issue,
            severity: 'high',
            file: mem.issue.split(' in ')[1] || '',
            line: 1,
            recommended_fix: mem.fix,
            outcome: mem.outcome,
            tags: ['seeding']
          },
          owner_id: ownerId
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    } else {
      const memories = JSON.parse(localStorage.getItem('codemind_memories') || '[]');
      memories.push({ ...mem, ownerId });
      localStorage.setItem('codemind_memories', JSON.stringify(memories));
      return mem.id;
    }
  },

  async getMemories(ownerId: string): Promise<Memory[]> {
    if (hasSupabaseCreds) {
      const data = await dbService.getProjectMemories(undefined, ownerId);
      return data.map((m: DBMemory) => ({
        id: m.id,
        issue: m.memory_data?.issue_type || m.title,
        fix: m.memory_data?.recommended_fix || '',
        outcome: m.memory_data?.outcome || m.description || '',
        recommendation: m.description || '',
        date: m.created_at ? m.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        matchPercentage: 90,
        ownerId: m.owner_id
      }));
    } else {
      const saved = localStorage.getItem('codemind_memories');
      const memories = saved ? JSON.parse(saved) : INITIAL_MEMORIES;
      return memories.filter((m: Memory) => {
        const isSeed = /^mem-\d$/.test(m.id);
        if (isSeed) return true;
        return m.ownerId === ownerId;
      });
    }
  },

  // 15. Vulnerability update helper
  async updateVulnerabilityStatus(vulnId: string, status: 'open' | 'resolved', ownerId: string): Promise<void> {
    if (hasSupabaseCreds) {
      const { error } = await supabase
        .from('vulnerabilities')
        .update({ status })
        .eq('id', vulnId)
        .eq('owner_id', ownerId);
      if (error) throw error;
    } else {
      const vulns = JSON.parse(localStorage.getItem('codemind_vulnerabilities') || '[]');
      const updated = vulns.map((v: DBVulnerability) => v.id === vulnId ? { ...v, status } : v);
      localStorage.setItem('codemind_vulnerabilities', JSON.stringify(updated));
    }
  },

  // 16. Ingestion/Seeding Helper
  async seedProject(proj: Project, ownerId: string): Promise<string> {
    const projId = await this.createProject({
      name: proj.name,
      description: proj.description,
      source_type: 'folder'
    }, ownerId);

    const reviewId = await this.saveReview({
      project_id: projId,
      overall_score: proj.overallScore,
      security_score: proj.securityScore,
      architecture_score: proj.architectureScore,
      performance_score: proj.performanceScore,
      maintainability_score: proj.maintainabilityScore,
      summary: 'CodeMind initial seeded audit.',
      review_metadata: {
        files_scanned: proj.files.length,
        critical_count: proj.files.flatMap(f => f.issues).filter(i => i.severity === 'critical').length,
        high_count: proj.files.flatMap(f => f.issues).filter(i => i.severity === 'high').length,
        medium_count: proj.files.flatMap(f => f.issues).filter(i => i.severity === 'medium').length
      }
    }, ownerId);

    for (const file of proj.files) {
      for (const issue of file.issues) {
        await this.saveVulnerability({
          project_id: projId,
          review_id: reviewId,
          file_path: file.path,
          severity: issue.severity,
          status: issue.applied ? 'resolved' : 'open',
          vulnerability_data: {
            line: issue.line,
            issue: issue.type,
            explanation: issue.explanation,
            fix: issue.recommendedFix,
            code_snippet: file.code || ''
          }
        }, ownerId);
      }
    }

    const nodes = proj.files.map(f => ({
      id: f.id,
      label: f.name,
      path: f.path,
      risk: f.issues.some(i => !i.applied) ? f.riskState : 'safe',
      isDir: f.isDir || false,
      isCode: f.isCode !== undefined ? f.isCode : true,
      language: f.language || 'TypeScript',
      riskScore: f.riskScore ?? 0,
      size: f.size ?? 0,
      imports: f.imports || [],
      exports: f.exports || [],
      code: f.code || ''
    }));
    const edges = proj.files.flatMap(f => (f.dependencies || []).map(d => ({
      source: f.id,
      target: proj.files.find(tf => tf.path === d || tf.name === d)?.id || '',
      isAffected: f.issues.some(i => !i.applied)
    }))).filter(edge => edge.target !== '');

    await this.saveDependencyGraph({
      project_id: projId,
      graph_data: { nodes, edges, analysisStats: proj.analysisStats }
    }, ownerId);

    return projId;
  }
};
