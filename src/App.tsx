import { useState, useEffect } from 'react';
import type { Project, Memory, Standard, Activity } from './types';
import { INITIAL_STANDARDS, INITIAL_MEMORIES } from './mockData';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { MemoryCenter } from './components/MemoryCenter';
import { TeamStandards } from './components/TeamStandards';
import { ReportGenerator } from './components/ReportGenerator';
import { dbService } from './services/db';
import { supabase } from './supabaseClient';
import { Brain, LayoutDashboard, Code, BookOpen, ToggleLeft } from 'lucide-react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';

const applyLocalFallbackFix = (code: string, issue: any, fileName: string): string => {
  // If it's one of the mock files, use the existing hardcoded logic
  if (fileName === 'auth.ts' && issue.type.toLowerCase().includes('sql')) {
    return code.replace(
      /const query = `SELECT \* FROM users WHERE username = '\${username}' AND password = '\${password}'`;/g,
      '// Parameterized queries resolve SQL Injection\n  const query = "SELECT * FROM users WHERE username = ? AND password = ?";'
    ).replace(
      /db\.query\(query, \(err: any, user: any\) => \{/g,
      'db.query(query, [username, password], (err: any, user: any) => {'
    );
  }
  if (fileName === 'payment.ts' && (issue.type.toLowerCase().includes('stripe') || issue.type.toLowerCase().includes('secret'))) {
    return code.replace(
      /const stripeSecretKey = "REDACTED_EXAMPLE_SECRET_KEY_DO_NOT_USE";/g,
      '// Moved Stripe private token to secure config\nconst stripeSecretKey = process.env.STRIPE_SECRET_KEY;'
    );
  }
  if (fileName === 'database.ts' && issue.type.toLowerCase().includes('singleton')) {
    return code.replace(
      /export class DatabaseConnection \{[\s\S]*?public static getInstance\(\): DatabaseConnection \{[\s\S]*?\}[\s\S]*?export const db = DatabaseConnection\.getInstance\(\);/g,
      `export class DatabaseConnection {
  constructor() {
    console.log("Connecting to database...");
  }

  public query(sql: string, params?: any[] | Function, callback?: Function) {
    const cb = typeof params === 'function' ? params : callback;
    console.log(\`Executing query: \${sql}\`);
    if (cb) cb(null, { id: 1, username: "admin" });
  }
}

// Rewritten to use Dependency Injection
export const db = new DatabaseConnection();`
    );
  }
  if (fileName === 'utils.py' && issue.type.toLowerCase().includes('command')) {
    return code.replace(
      /os\.system\("tar -czf backup\.tar\.gz " \+ backup_path\)/g,
      'subprocess.run(["tar", "-czf", "backup.tar.gz", backup_path], check=True)'
    ).replace(
      /import os/g,
      'import subprocess'
    );
  }
  if (fileName === 'config.py' && issue.type.toLowerCase().includes('credentials')) {
    return code.replace(
      /DB_PASS = "admin_super_secret_password_123!"/g,
      'import os\n# Read credentials from environmental configs\nDB_PASS = os.getenv("PIPELINE_DB_PASSWORD")'
    );
  }

  // General fallback replacement:
  // Split code into lines, replace the line at issue.line (1-indexed) with the recommended fix
  const lines = code.split('\n');
  const targetIdx = issue.line - 1;
  if (targetIdx >= 0 && targetIdx < lines.length) {
    const fixLines = issue.recommendedFix.split('\n');
    lines.splice(targetIdx, 1, ...fixLines);
    return lines.join('\n');
  }

  return code;
};

export default function App() {
  // Navigation View Router
  const [view, setView] = useState<'landing' | 'dashboard' | 'workspace' | 'memories' | 'standards'>('landing');
  const [autoOpenIngest, setAutoOpenIngest] = useState(false);

  // Shared persistent states
  const [projects, setProjects] = useState<Project[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);

  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authSynced, setAuthSynced] = useState(false);

  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);

  const [analytics, setAnalytics] = useState<{
    totalMemories: number;
    criticalVulnerabilities: number;
    resolvedIssues: number;
    recurringIssues: number;
    mostCommonIssueTypes: Array<{ name: string; value: number }>;
    projectHealthTrend: Array<{ date: string; score: number }>;
  }>({
    totalMemories: 0,
    criticalVulnerabilities: 0,
    resolvedIssues: 0,
    recurringIssues: 0,
    mostCommonIssueTypes: [],
    projectHealthTrend: []
  });

  // Synchronize Clerk token to Supabase client
  useEffect(() => {
    const syncSupabaseAuth = async () => {
      if (!isLoaded) return;
      if (isSignedIn && user) {
        try {
          const token = await getToken({ template: 'supabase' });
          if (token) {
            await supabase.auth.setSession({
              access_token: token,
              refresh_token: ''
            });
            
            // Validate if the token was accepted by Supabase (check for signature mismatch / JWT errors)
            const { error: testError } = await supabase.from('projects').select('id').limit(1);
            if (testError) {
              console.warn(
                'CodeMind AI: Clerk Supabase JWT token failed validation (signature mismatch or template not set). Reverting to Anon Key. Error:',
                testError.message
              );
              await supabase.auth.signOut();
            } else {
              console.log('CodeMind AI: Supabase authentication session synchronized successfully.');
            }
          }
          setAuthSynced(true);
        } catch (error) {
          console.error('CodeMind AI: Failed to sync Clerk token to Supabase:', error);
          setAuthSynced(true);
        }
      } else {
        setAuthSynced(true);
      }
    };
    syncSupabaseAuth();
  }, [isLoaded, isSignedIn, user, getToken]);

  // Load user data on boot
  useEffect(() => {
    if (!isLoaded || !authSynced) return;

    if (isSignedIn && user) {
      const ownerId = user.id;

      dbService.getProjects(ownerId).then(async (dbProjs) => {
        let currentProjList = dbProjs;
        let currentStdList = await dbService.getStandards(ownerId);
        let currentMemList = await dbService.getMemories(ownerId);
        let currentActList = await dbService.getActivities(ownerId);

        // Seeding flow - check and seed empty tables individually to ensure complete data sync
        let seededAny = false;

        if (currentStdList.length === 0) {
          console.log('CodeMind AI: Seeding default standards for user:', ownerId);
          for (const std of INITIAL_STANDARDS) {
            await dbService.createStandard(std, ownerId);
          }
          seededAny = true;
        }

        // Fetch after seeding if anything was updated
        if (seededAny) {
          currentStdList = await dbService.getStandards(ownerId);
        }

        let seededMemories = false;
        if (currentProjList.length > 0 && currentMemList.length === 0) {
          console.log('CodeMind AI: Seeding default memories for user:', ownerId);
          for (const mem of INITIAL_MEMORIES) {
            try {
              await dbService.saveMemory({
                project_id: currentProjList[0].id,
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
                }
              }, ownerId);
              seededMemories = true;
            } catch (seedErr) {
              console.error('Failed to seed memory on boot:', seedErr);
            }
          }
        }

        if (seededMemories) {
          currentMemList = await dbService.getMemories(ownerId);
        }

        setProjects(currentProjList);
        setStandards(currentStdList);
        setMemories(currentMemList);
        setActivities(currentActList);

        // Auto select project
        if (currentProjList.length > 0) {
          setActiveProjectId(currentProjList[0].id);
          if (currentProjList[0].files.length > 0) {
            setActiveFileId(currentProjList[0].files[0].id);
          }
        }
        
        setLoading(false);
      }).catch(err => {
        console.error('CodeMind AI: Error loading user data:', err);
        setLoading(false);
      });
    } else {
      Promise.resolve().then(() => {
        setProjects([]);
        setMemories([]);
        setActivities([]);
        setStandards([]);
        setView('landing');
        setLoading(false);
      });
    }
  }, [isLoaded, isSignedIn, user, authSynced]);

  useEffect(() => {
    if (isSignedIn && user) {
      dbService.getDashboardAnalytics(undefined, user.id).then(data => {
        setAnalytics(data);
      });
    }
  }, [projects, memories, isSignedIn, user]);

  // Save changes to local storage helper (with DB fallbacks)
  const saveProjects = (newProj: Project[]) => {
    setProjects(newProj);
    localStorage.setItem('codemind_projects', JSON.stringify(newProj));
  };

  const saveMemories = (newMems: Memory[]) => {
    setMemories(newMems);
    localStorage.setItem('codemind_memories', JSON.stringify(newMems));
  };

  const saveActivities = (newActs: Activity[]) => {
    setActivities(newActs);
    localStorage.setItem('codemind_activities', JSON.stringify(newActs));
  };

  const saveStandards = (newStds: Standard[]) => {
    setStandards(newStds);
    localStorage.setItem('codemind_standards', JSON.stringify(newStds));
  };

  // Recompute health scores dynamically
  const recomputeScores = (projList: Project[], activeStds: Standard[]) => {
    return projList.map(proj => {
      let securityDeduct = 0;
      let archDeduct = 0;

      proj.files.forEach(file => {
        file.issues.forEach(issue => {
          if (!issue.applied) {
            // Check if violation matches an enabled standard rule
            const isSingleton = issue.type.includes('Singleton');
            const isSql = issue.type.includes('SQL');
            const isSecret = issue.type.includes('Secret') || issue.type.includes('credentials');
            const isCommand = issue.type.includes('Command');
            

            let ruleEnabled = true;
            if (isSingleton) ruleEnabled = activeStds.find(s => s.id === 'std-2')?.enabled ?? true;
            if (isSql) ruleEnabled = activeStds.find(s => s.id === 'std-1')?.enabled ?? true;
            if (isSecret) ruleEnabled = activeStds.find(s => s.id === 'std-3')?.enabled ?? true;
            if (isCommand) ruleEnabled = activeStds.find(s => s.id === 'std-4')?.enabled ?? true;

            if (ruleEnabled) {
              if (issue.severity === 'critical') {
                securityDeduct += 25;
              } else if (issue.severity === 'high') {
                securityDeduct += 15;
              } else if (issue.severity === 'medium') {
                archDeduct += 20;
              }
            }
          }
        });
      });

      const securityScore = Math.max(10, 100 - securityDeduct);
      const architectureScore = Math.max(10, 100 - archDeduct);
      const overallScore = Math.round((securityScore + architectureScore + proj.performanceScore + proj.maintainabilityScore) / 4);

      return {
        ...proj,
        securityScore,
        architectureScore,
        overallScore
      };
    });
  };

  // Trigger recalculations on standard changes
  const handleToggleStandard = (stdId: string) => {
    const updatedStds = standards.map(s => s.id === stdId ? { ...s, enabled: !s.enabled } : s);
    saveStandards(updatedStds);

    const toggled = updatedStds.find(s => s.id === stdId);
    if (toggled && user?.id) {
      dbService.updateStandardEnabled(stdId, toggled.enabled, user.id).catch(err => {
        console.error('Error toggling standard in DB:', err);
      });
    }
    
    // Log Activity
    const actText = toggled 
      ? `${toggled.enabled ? 'Enforced' : 'Muted'} Standard check: "${toggled.name}".`
      : 'Toggled architectural standard check.';
    
    const newAct: Activity = {
      id: `act-${Date.now()}`,
      text: actText,
      type: 'info',
      time: 'Just now'
    };
    saveActivities([newAct, ...activities]);
    if (user?.id) {
      dbService.createActivity(newAct, user.id);
    }

    // Update Project Scores
    const updatedProj = recomputeScores(projects, updatedStds);
    saveProjects(updatedProj);
  };

  const handleAddStandard = (newStd: Standard) => {
    const updatedStds = [...standards, newStd];
    saveStandards(updatedStds);

    if (user?.id) {
      dbService.createStandard(newStd, user.id).catch(err => {
        console.error('Error creating standard in DB:', err);
      });
    }

    const newAct: Activity = {
      id: `act-${Date.now()}`,
      text: `Enabled new Team standard rule: "${newStd.name}".`,
      type: 'info',
      time: 'Just now'
    };
    saveActivities([newAct, ...activities]);
    if (user?.id) {
      dbService.createActivity(newAct, user.id);
    }

    const updatedProj = recomputeScores(projects, updatedStds);
    saveProjects(updatedProj);
  };

  // Ingest Project
  const handleImportProject = (newProj: Project & { extractedMemories?: Memory[] }) => {
    const newList = [newProj, ...projects];
    // Recompute scores on newly added project
    const recalculated = recomputeScores(newList, standards);
    saveProjects(recalculated);
    
    // Auto select workspace
    setActiveProjectId(newProj.id);
    setActiveFileId(newProj.files[0].id);
    setView('workspace');

    // Create DB entries
    dbService.createProject({
      name: newProj.name,
      description: newProj.description,
      source_type: newProj.name.includes('github') ? 'github' : 'folder'
    }, user?.id || '').then(dbProjId => {
      // Update state and active project IDs to match Supabase UUID
      setProjects(prev => {
        const updated = prev.map(p => {
          if (p.id === newProj.id) {
            return {
              ...p,
              id: dbProjId,
              files: p.files.map(f => ({ ...f, projectId: dbProjId }))
            };
          }
          return p;
        });
        localStorage.setItem('codemind_projects', JSON.stringify(updated));
        return updated;
      });
      setActiveProjectId(dbProjId);

      dbService.saveReview({
        project_id: dbProjId,
        overall_score: newProj.overallScore,
        security_score: newProj.securityScore,
        architecture_score: newProj.architectureScore,
        performance_score: newProj.performanceScore,
        maintainability_score: newProj.maintainabilityScore,
        summary: 'CodeMind automated ingestion review scan.',
        review_metadata: {
          files_scanned: newProj.files.length,
          critical_count: newProj.files.flatMap(f => f.issues).filter(i => i.severity === 'critical').length,
          high_count: newProj.files.flatMap(f => f.issues).filter(i => i.severity === 'high').length,
          medium_count: newProj.files.flatMap(f => f.issues).filter(i => i.severity === 'medium').length
        }
      }, user?.id || '').then(reviewId => {
        // Save vulnerabilities
        newProj.files.forEach(file => {
          file.issues.forEach(issue => {
            dbService.saveVulnerability({
              id: issue.id,
              project_id: dbProjId,
              review_id: reviewId,
              file_path: file.path,
              severity: issue.severity,
              status: 'open',
              vulnerability_data: {
                line: issue.line,
                issue: issue.type,
                explanation: issue.explanation,
                fix: issue.recommendedFix,
                code_snippet: file.code || ''
              }
            }, user?.id || '');
          });
        });

        const memoryPromises: Promise<any>[] = [];

        // Seed default memories if memories is empty
        if (memories.length === 0) {
          console.log('CodeMind AI: Seeding default memories on first project import');
          INITIAL_MEMORIES.forEach(mem => {
            memoryPromises.push(
              dbService.saveMemory({
                project_id: dbProjId,
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
                }
              }, user?.id || '').catch(err => console.error('Error seeding memory:', err))
            );
          });
        }

        // Save extracted memories from the ingested project
        if (newProj.extractedMemories && newProj.extractedMemories.length > 0) {
          console.log(`CodeMind AI: Saving ${newProj.extractedMemories.length} extracted memories for project:`, dbProjId);
          newProj.extractedMemories.forEach(mem => {
            memoryPromises.push(
              dbService.saveMemory({
                project_id: dbProjId,
                memory_type: 'security',
                title: mem.issue,
                description: mem.recommendation,
                memory_data: {
                  issue_type: mem.issue,
                  severity: 'high',
                  file: mem.issue.split(' in ')[1] || '',
                  line: 1,
                  recommended_fix: mem.fix,
                  outcome: mem.outcome,
                  tags: ['extracted']
                }
              }, user?.id || '').catch(err => console.error('Error saving extracted memory:', err))
            );
          });
        }

        if (memoryPromises.length > 0) {
          Promise.all(memoryPromises).then(() => {
            if (user?.id) {
              dbService.getMemories(user.id).then(dbMems => {
                setMemories(dbMems);
              });
            }
          });
        }
      });

      // Save dependency graph with full file metadata and content
      const nodes = newProj.files.map(f => ({
        id: f.id,
        label: f.name,
        path: f.path,
        risk: f.issues.some(i => !i.applied) ? f.riskState : 'safe',
        isDir: f.isDir,
        isCode: f.isCode,
        language: f.language,
        code: f.code,
        riskScore: f.riskScore,
        size: f.size,
        imports: f.imports || [],
        exports: f.exports || []
      }));
      const edges = newProj.files.flatMap(f => (f.dependencies || []).map(d => ({
        source: f.id,
        target: newProj.files.find(tf => tf.path === d)?.id || '',
        isAffected: f.issues.some(i => !i.applied)
      }))).filter(edge => edge.target !== '');

      dbService.saveDependencyGraph({
        project_id: dbProjId,
        graph_data: { 
          nodes, 
          edges,
          analysisStats: newProj.analysisStats 
        }
      }, user?.id || '');
    }).catch(err => {
      console.error('CodeMind: DB write error during ingestion:', err);
    });
  };

  const handleAddActivity = (newAct: Activity) => {
    saveActivities([newAct, ...activities]);
    if (user?.id) {
      dbService.createActivity(newAct, user.id);
    }
  };
  // Apply Resolution Fix & Save Memory
  const handleApplyFix = async (projId: string, fileId: string, issueId: string) => {
    const targetProj = projects.find(p => p.id === projId);
    const targetFile = targetProj?.files.find(f => f.id === fileId);
    const targetIssue = targetFile?.issues.find(i => i.id === issueId);

    if (!targetIssue || !targetFile || !targetProj) return;

    // Log Activity
    const actId = `act-${Date.now()}`;
    const startAct: Activity = {
      id: actId,
      text: `Refactoring ${targetFile.name} to resolve "${targetIssue.type}"...`,
      type: 'info',
      time: 'Just now',
      projectId: projId
    };
    saveActivities([startAct, ...activities]);
    if (user?.id) {
      dbService.createActivity(startAct, user.id);
    }

    let newCode = targetFile.code || '';
    let success = false;

    // Try AI dynamic refactoring first if keys are available
    try {
      const keys = [
        import.meta.env.VITE_GROQ_API_KEY,
        import.meta.env.VITE_GROQ_API_KEY_FALLBACK,
        import.meta.env.VITE_GROQ_API_KEY_3,
        import.meta.env.VITE_GROQ_API_KEY_4
      ].filter((k): k is string => typeof k === 'string' && k.trim() !== '');

      if (keys.length > 0) {
        const cleanMemories = memories.slice(0, 10).map(m => ({
          issue: m.issue,
          fix: m.fix,
          recommendation: m.recommendation
        }));

        const sysPrompt = `You are an expert software engineer and security refactoring agent.
Your task is to fix a vulnerability in the provided code.
Vulnerability Details:
- Issue Type: ${targetIssue.type}
- Line: ${targetIssue.line}
- Explanation: ${targetIssue.explanation}
- Recommended Fix: ${targetIssue.recommendedFix}

Historical Memories of verified fixes:
${JSON.stringify(cleanMemories)}

Instructions:
1. Locate the vulnerability in the code (around line ${targetIssue.line}).
2. Refactor the code to resolve the issue using the recommended fix and learning from the historical memories where applicable.
3. Keep the rest of the code exactly the same. Do not remove unrelated code.
4. Return ONLY the complete, raw refactored code. Do NOT wrap it in markdown code blocks, and do not add any comments or explanations outside the code. Just return the code.`;

        const executeAI = async (apiKey: string) => {
          const baseUrl = import.meta.env.DEV ? '/api-groq' : 'https://api.groq.com';
          const res = await fetch(`${baseUrl}/openai/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: targetFile.code || '' }],
              temperature: 0.1,
            }),
          });
          if (!res.ok) throw new Error(`HTTP status ${res.status}`);
          const data = await res.json();
          let txt = data.choices?.[0]?.message?.content ?? '';
          const match = txt.match(/```(?:[a-zA-Z0-9]+)?\s*([\s\S]*?)```/);
          if (match) txt = match[1];
          return txt.trim();
        };

        for (const key of keys) {
          try {
            const aiFixedCode = await executeAI(key);
            if (aiFixedCode && aiFixedCode.length > 10) {
              newCode = aiFixedCode;
              success = true;
              break;
            }
          } catch (err) {
            console.warn("AI fix attempt failed:", err);
          }
        }
      }
    } catch (aiErr) {
      console.error("AI dynamic refactoring failed, falling back to local replacement:", aiErr);
    }

    if (!success) {
      newCode = applyLocalFallbackFix(targetFile.code || '', targetIssue, targetFile.name);
    }

    const updatedProjList = projects.map(proj => {
      if (proj.id !== projId) return proj;

      const updatedFiles = proj.files.map(file => {
        if (file.id !== fileId) return file;

        const updatedIssues = file.issues.map(issue => {
          if (issue.id !== issueId) return issue;
          return { ...issue, applied: true };
        });

        const stillVulnerable = updatedIssues.some(i => !i.applied);
        const riskState = stillVulnerable ? file.riskState : 'safe';

        return {
          ...file,
          issues: updatedIssues,
          code: newCode,
          riskState
        };
      });

      return {
        ...proj,
        files: updatedFiles
      };
    });

    const finalProjList = recomputeScores(updatedProjList, standards);
    saveProjects(finalProjList);

    // Save resolution as a memory
    const newMemory: Memory = {
      id: `mem-${Date.now()}`,
      issue: `${targetIssue.type} detected in ${targetFile.name}`,
      fix: targetIssue.recommendedFix.split('\n')[0].replace('// ', ''),
      outcome: `Code Integrity restored. Vulnerability closed in ${targetProj.name}.`,
      recommendation: `Enforce "${targetIssue.type}" checks in git hooks.`,
      date: new Date().toISOString().split('T')[0],
      ownerId: user?.id || ''
    };
    saveMemories([newMemory, ...memories]);

    // Database service save memory
    dbService.saveMemory({
      project_id: projId,
      memory_type: targetIssue.severity === 'critical' || targetIssue.severity === 'high' ? 'security' : 'architecture',
      title: `${targetIssue.type} detected in ${targetFile.name}`,
      description: `Enforce "${targetIssue.type}" checks in git hooks.`,
      memory_data: {
        issue_type: `${targetIssue.type} detected in ${targetFile.name}`,
        severity: targetIssue.severity,
        file: targetFile.path,
        line: targetIssue.line,
        recommended_fix: targetIssue.recommendedFix,
        outcome: `Code Integrity restored. Vulnerability closed in ${targetProj.name}.`,
        tags: [targetIssue.severity, 'vulnerability-repair']
      }
    }, user?.id || '').catch(err => console.error('CodeMind: DB write error during memory save:', err));

    if (user?.id) {
      dbService.updateVulnerabilityStatus(issueId, 'resolved', user.id).catch(err => {
        console.error('Error updating vulnerability status in DB:', err);
      });
    }

    // Log success Activity
    const newAct: Activity = {
      id: `act-${Date.now()}`,
      text: `Resolved "${targetIssue.type}" in ${targetFile.name}. Saved resolution to Memory database.`,
      type: 'success',
      time: 'Just now',
      projectId: projId
    };
    saveActivities([newAct, ...activities.filter(a => a.id !== actId)]);
    if (user?.id) {
      dbService.createActivity(newAct, user.id);
    }
  };

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    const proj = projects.find(p => p.id === id);
    if (proj && proj.files.length > 0) {
      setActiveFileId(proj.files[0].id);
    }
    setView('workspace');
  };

  const handleSelectFile = (id: string) => {
    setActiveFileId(id);
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        color: '#fff',
        gap: '15px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>Loading Workspace Console...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Navbar (Only rendered inside App Views, not Landing Page) */}
      {view !== 'landing' && (
        <header className="main-header no-print">
          <div className="logo-section" style={{ cursor: 'pointer' }} onClick={() => setView('landing')}>
            <Brain className="logo-icon" size={20} />
            <span style={{ letterSpacing: '-0.02em' }}>CodeMind AI</span>
          </div>
          
          <nav className="nav-links">
            <button 
              className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => setView('dashboard')}
            >
              <LayoutDashboard size={14} />
              Console
            </button>
            <button 
              className={`nav-item ${view === 'workspace' ? 'active' : ''}`}
              disabled={projects.length === 0}
              style={projects.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              onClick={() => {
                if (!activeProjectId && projects.length > 0) {
                  handleSelectProject(projects[0].id);
                } else if (projects.length > 0) {
                  setView('workspace');
                }
              }}
            >
              <Code size={14} />
              Workspace
            </button>
            <button 
              className={`nav-item ${view === 'memories' ? 'active' : ''}`}
              onClick={() => setView('memories')}
            >
              <BookOpen size={14} />
              Memory Center
            </button>
            <button 
              className={`nav-item ${view === 'standards' ? 'active' : ''}`}
              onClick={() => setView('standards')}
            >
              <ToggleLeft size={14} />
              Standards
            </button>
          </nav>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {view === 'workspace' && activeProjectId && (
              <button className="btn" onClick={() => setShowReportModal(true)}>
                Export Audit Report
              </button>
            )}
            <UserButton afterSignOutUrl="/">
              <UserButton.MenuItems>
                <UserButton.Action
                  label="Console"
                  labelIcon={<LayoutDashboard size={14} />}
                  onClick={() => setView('dashboard')}
                />
                <UserButton.Action
                  label="Memory Center (History)"
                  labelIcon={<BookOpen size={14} />}
                  onClick={() => setView('memories')}
                />
              </UserButton.MenuItems>
            </UserButton>
          </div>
        </header>
      )}

      {/* View Router */}
      <main className="main-content">
        {view === 'landing' && (
          <LandingPage onEnterApp={(targetView, openIngest) => {
            setView(targetView || 'dashboard');
            if (openIngest) {
              setAutoOpenIngest(true);
            }
          }} />
        )}
        
        {view === 'dashboard' && (
          <Dashboard
            projects={projects}
            memories={memories}
            activities={activities}
            analytics={analytics}
            standards={standards}
            onSelectProject={handleSelectProject}
            onImportProject={handleImportProject}
            onAddActivity={handleAddActivity}
            autoOpenIngest={autoOpenIngest}
            clearAutoOpenIngest={() => setAutoOpenIngest(false)}
          />
        )}

        {view === 'workspace' && activeProjectId && (
          <ProjectWorkspace
            projects={projects}
            activeProjectId={activeProjectId}
            activeFileId={activeFileId}
            memories={memories}
            onSelectProject={handleSelectProject}
            onSelectFile={handleSelectFile}
            onApplyFix={handleApplyFix}
            onBackToDashboard={() => setView('dashboard')}
          />
        )}

        {view === 'memories' && (
          <MemoryCenter memories={memories} />
        )}

        {view === 'standards' && (
          <TeamStandards
            standards={standards}
            onToggleStandard={handleToggleStandard}
            onAddStandard={handleAddStandard}
          />
        )}
      </main>

      {/* PDF Audit Report Modal */}
      {showReportModal && activeProjectId && (
        <ReportGenerator
          project={projects.find(p => p.id === activeProjectId)!}
          memories={memories}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
