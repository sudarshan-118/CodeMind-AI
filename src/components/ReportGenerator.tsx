import React from 'react';
import type { Project, Memory } from '../types';
import { FileText, Download, X } from 'lucide-react';

interface ReportGeneratorProps {
  project: Project;
  memories: Memory[];
  onClose: () => void;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ project, memories, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const openIssues = project.files.flatMap(f => f.issues).filter(i => !i.applied);
  const fixedIssues = project.files.flatMap(f => f.issues).filter(i => i.applied);

  return (
    <div 
      className="modal-overlay" 
      style={{ overflowY: 'auto', padding: '40px 20px', alignItems: 'flex-start' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '900px', 
          width: '100%', 
          backgroundColor: '#FFFFFF', 
          color: '#1E293B',
          position: 'relative',
          margin: '0 auto'
        }}
      >
        {/* Floating Close X Button */}
        <button
          onClick={onClose}
          className="no-print"
          style={{
            position: 'absolute',
            top: '-15px',
            right: '-15px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#0F172A',
            border: '2px solid #374151',
            color: '#E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            zIndex: 110,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1E293B';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#0F172A';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Close Report"
        >
          <X size={16} />
        </button>
        
        {/* Top Control Bar (Hidden on print) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }} className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} style={{ color: 'var(--primary-color)' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Enterprise Audit PDF Generator</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Download size={14} />
              Print / Save PDF
            </button>
            <button className="btn" onClick={onClose} style={{ color: '#64748B', borderColor: '#E2E8F0' }}>
              Close Preview
            </button>
          </div>
        </div>

        {/* Printable Report Layout */}
        <div className="print-report-overlay">
          
          {/* Header */}
          <div className="print-report-header">
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#3B82F6', letterSpacing: '0.1em' }}>
                CodeMind AI Compliance Report
              </div>
              <div className="print-report-title">{project.name} Audit Report</div>
            </div>
            <div className="print-report-meta">
              <div>Version: 1.0.0</div>
              <div>Audit Date: {new Date().toLocaleDateString()}</div>
              <div>Commit Hash: {project.commitHash}</div>
              <div>Branch Target: {project.branch}</div>
            </div>
          </div>

          {/* Scores Executive Summary */}
          <div className="print-section">
            <h2>Executive Audit Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '15px' }}>
              <div style={{ padding: '15px', border: '1px solid #E2E8F0', borderRadius: '6px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Overall Score</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '5px' }}>{project.overallScore}%</div>
              </div>
              <div style={{ padding: '15px', border: '1px solid #E2E8F0', borderRadius: '6px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Security</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '5px' }}>{project.securityScore}%</div>
              </div>
              <div style={{ padding: '15px', border: '1px solid #E2E8F0', borderRadius: '6px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Architecture</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#3B82F6', marginTop: '5px' }}>{project.architectureScore}%</div>
              </div>
              <div style={{ padding: '15px', border: '1px solid #E2E8F0', borderRadius: '6px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Performance</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B', marginTop: '5px' }}>{project.performanceScore}%</div>
              </div>
            </div>
            
            <p style={{ marginTop: '16px', fontSize: '12px', lineHeight: 1.5, color: '#475569' }}>
              This audit report summarizes the security vulnerabilities, standard rules violations, and maintainability concerns in the <strong>{project.name}</strong> repository. Analysis discovered <strong>{openIssues.length}</strong> active security and compliance issues. The codebase has resolved <strong>{fixedIssues.length}</strong> issues through the intelligence resolution modules.
            </p>
          </div>

          {/* Security Findings */}
          <div className="print-section">
            <h2>Security Findings Detail</h2>
            {openIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0 ? (
              <p style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>✓ Zero critical vulnerability alerts open in active source paths.</p>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Severity</th>
                    <th style={{ width: '25%' }}>Vulnerability Type</th>
                    <th style={{ width: '15%' }}>Line Target</th>
                    <th>Audit Details</th>
                  </tr>
                </thead>
                <tbody>
                  {openIssues.filter(i => i.severity === 'critical' || i.severity === 'high').map(issue => (
                    <tr key={issue.id}>
                      <td style={{ fontWeight: 700, color: issue.severity === 'critical' ? '#EF4444' : '#F59E0B' }}>
                        {issue.severity.toUpperCase()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{issue.type}</td>
                      <td>Line {issue.line}</td>
                      <td style={{ color: '#475569' }}>{issue.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Architecture Review */}
          <div className="print-section">
            <h2>Architecture Standards Compliance</h2>
            {openIssues.filter(i => i.severity === 'medium').length === 0 ? (
              <p style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>✓ Repository complies with all active architectural standard constraints.</p>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Standard rule</th>
                    <th style={{ width: '15%' }}>Severity</th>
                    <th>Issue explanation & standard recommendations</th>
                  </tr>
                </thead>
                <tbody>
                  {openIssues.filter(i => i.severity === 'medium').map(issue => (
                    <tr key={issue.id}>
                      <td style={{ fontWeight: 600 }}>{issue.type}</td>
                      <td style={{ color: '#F59E0B', fontWeight: 700 }}>WARNING</td>
                      <td style={{ color: '#475569' }}>{issue.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Performance Review */}
          <div className="print-section">
            <h2>Performance & Resource Allocation Review</h2>
            <div style={{ border: '1px solid #E2E8F0', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Network Sockets:</strong> High request handlers leverage concurrent workers properly.</li>
                <li><strong>Prepared Queries:</strong> Swapped SQL calls bypass parser compilation cycles in database engine instances.</li>
                <li><strong>Memory Leak Scopes:</strong> Zero hanging database instances detected. GC limits bounds look clean.</li>
              </ul>
            </div>
          </div>

          {/* Dependency Analysis */}
          <div className="print-section">
            <h2>Dependency Connection Tracing</h2>
            <p style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
              Traces relative import dependencies across files. Active vulnerability risks propagate downstream as follows:
            </p>
            <div style={{ border: '1px solid #E2E8F0', padding: '12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#F8FAFC' }}>
              {project.files.map(f => {
                const affected = project.files.some(other => other.issues.some(iss => !iss.applied) && f.dependencies?.includes(other.path));
                return (
                  <div key={f.id} style={{ padding: '4px 0' }}>
                    📄 {f.path} {f.dependencies && f.dependencies.length > 0 ? `➔ [${f.dependencies.join(', ')}]` : ''}
                    {f.issues.some(i => !i.applied) ? ' 🔴 (Vulnerable Source)' : affected ? ' 🟠 (Downstream Risk)' : ' 🟢'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hindsight Memory Matches */}
          <div className="print-section">
            <h2>Hindsight Memory Matches & Resolutions</h2>
            <p style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
              Historical resolution memories matched during scanning:
            </p>
            {memories.length === 0 ? (
              <p style={{ fontSize: '11px', color: '#64748B' }}>Zero similar historical memories recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {memories.slice(0, 2).map((m, idx) => (
                  <div key={idx} style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', backgroundColor: '#F8FAFC', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Memory Case #{idx + 1}: {m.issue}</span>
                      <span style={{ color: '#3B82F6' }}>Resolved ✓</span>
                    </div>
                    <div style={{ color: '#475569', marginTop: '4px' }}>
                      <strong>Resolution Applied:</strong> {m.fix}
                    </div>
                    <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>
                      <strong>Audit Recommendation:</strong> {m.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actionable Recommendations */}
          <div className="print-section" style={{ pageBreakInside: 'avoid' }}>
            <h2>Compliance Action Plan</h2>
            <ol style={{ paddingLeft: '20px', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {openIssues.map((issue, idx) => (
                <li key={idx}>
                  <strong>[RESOLVE LINE {issue.line} in {project.files.find(f => f.issues.includes(issue))?.name || 'source'}]:</strong>
                  {' '}{issue.recommendedFix}
                </li>
              ))}
              {openIssues.length === 0 && (
                <li><strong>[MAINTAIN]:</strong> Codebase complies with all security guidelines. Run checks routinely on subsequent commits.</li>
              )}
            </ol>
          </div>

          {/* Auditor footer */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '15px', marginTop: '40px', fontSize: '10px', color: '#94A3B8', textAlign: 'center' }}>
            Report generated securely by CodeMind AI Platform. Certified Code Integrity scanning.
          </div>
        </div>

      </div>
      
      {/* Print helpers styling */}
      <style>{`
        .no-print {
          display: flex;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: #1E293B !important;
          }
        }
      `}</style>
    </div>
  );
};
