import React from 'react';
import { Shield, Brain, Activity, Code, LayoutDashboard, BookOpen, FileText, Cpu, Database, Network, GitBranch } from 'lucide-react';
import { SignInButton, SignUpButton, useAuth, UserButton } from '@clerk/clerk-react';
import productPreview from '../assets/product_preview.png';

interface LandingPageProps {
  onEnterApp: (targetView?: 'dashboard' | 'workspace' | 'memories' | 'standards', autoOpenIngest?: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const { isSignedIn } = useAuth();

  return (
    <div style={{ backgroundColor: '#0B1220', minHeight: '100vh', width: '100%', color: '#F9FAFB' }}>
      {/* Navbar */}
      <header className="main-header" style={{ padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="logo-section">
          <Brain className="logo-icon" size={20} />
          <span>CodeMind AI</span>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <a href="#features" className="nav-item" style={{ fontSize: '13px', padding: '8px 12px', minWidth: 'auto' }}>Capabilities</a>
            <a href="#how-it-works" className="nav-item" style={{ fontSize: '13px', padding: '8px 12px', minWidth: 'auto' }}>Workflow</a>
          </div>
          {isSignedIn ? (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={() => onEnterApp('dashboard')}>
                Launch Console
              </button>
              <UserButton afterSignOutUrl="/">
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Console"
                    labelIcon={<LayoutDashboard size={14} />}
                    onClick={() => onEnterApp('dashboard')}
                  />
                  <UserButton.Action
                    label="Memory Center (History)"
                    labelIcon={<BookOpen size={14} />}
                    onClick={() => onEnterApp('memories')}
                  />
                </UserButton.MenuItems>
              </UserButton>
            </div>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="nav-item" style={{ fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn btn-primary">
                  Get Started
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="landing-container">
        <span className="hero-tag">ENTERPRISE CODE INTELLIGENCE</span>
        <h1 className="hero-title">
          CodeMind AI
        </h1>
        <p className="hero-subtitle">
          Deterministic repository analysis & engineering-first intelligence.
        </p>
        
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '-16px auto 32px auto', fontSize: '14px', lineHeight: '1.55' }}>
          CodeMind performs deterministic repository analysis using static analysis, graph algorithms and custom risk scoring. AI is only used to explain findings and recommend fixes.
        </p>

        <div className="hero-cta">
          {isSignedIn ? (
            <>
              <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }} onClick={() => onEnterApp('dashboard', true)}>
                Ingest Project
              </button>
              <button className="btn" style={{ padding: '12px 24px', fontSize: '14px' }} onClick={() => onEnterApp('dashboard')}>
                View Workspace
              </button>
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
                  Ingest Project
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="btn" style={{ padding: '12px 24px', fontSize: '14px' }}>
                  View Workspace
                </button>
              </SignInButton>
            </>
          )}
        </div>

        {/* Real Product Preview Section */}
        <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto 64px auto', padding: '0 16px' }}>
          <div style={{ 
            backgroundColor: 'var(--surface-color)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '4px', 
            overflow: 'hidden',
            padding: '8px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 12px', 
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-color)',
              borderRadius: '4px 4px 0 0'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginLeft: '12px' }}>
                workspace / codemind-console
              </span>
            </div>
            
            <img 
              src={productPreview} 
              alt="CodeMind AI Workspace Console preview showing Project Tree, Risk Highlights, Code Inspector, and Repository Memory" 
              style={{ 
                width: '100%', 
                height: 'auto', 
                display: 'block',
                borderRadius: '0 0 4px 4px',
                border: '1px solid var(--border-color)'
              }} 
            />
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '8px', 
            marginTop: '16px',
            textAlign: 'left'
          }}>
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-color)', borderRadius: '4px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Project Tree</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>Dynamic tree reflecting the actual repository file structure.</p>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-color)', borderRadius: '4px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Risk Highlights</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>Color-coded alerts integrated directly in source code lines.</p>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-color)', borderRadius: '4px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Code Inspector</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>Analyze files with line-by-line diagnostics and direct resolution actions.</p>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-color)', borderRadius: '4px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Repository Memory</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>Store repository snapshots, compare health, and track technical debt.</p>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" className="features-section" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="section-header">
            <h2 className="section-title">Ingestion & Analysis Pipeline</h2>
            <p className="section-desc">How CodeMind processes your codebase and extracts insights.</p>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '16px', 
            maxWidth: '1000px', 
            margin: '0 auto',
            textAlign: 'left'
          }}>
            <div style={{ padding: '24px', backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>STEP 1</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Repository Scanner</h3>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <li>Import GitHub repository or ZIP</li>
                <li>Scan project structure</li>
                <li>Ignore unnecessary files</li>
                <li>Detect repository metadata</li>
              </ul>
            </div>
            <div style={{ padding: '24px', backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>STEP 2</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Language Detection & Parsing</h3>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <li>Detect programming languages</li>
                <li>Parse source files</li>
                <li>Generate Unified AST</li>
                <li>Extract symbols and relationships</li>
              </ul>
            </div>
            <div style={{ padding: '24px', backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>STEP 3</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Repository Intelligence</h3>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <li>Static Analysis</li>
                <li>Security Analysis</li>
                <li>Dependency Graph & Knowledge Graph</li>
                <li>Architecture Detection & Risk Scoring</li>
              </ul>
            </div>
            <div style={{ padding: '24px', backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>STEP 4</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Insights & AI Assistance</h3>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <li>Historical Memory</li>
                <li>Trend Analysis</li>
                <li>Risk Prediction</li>
                <li>AI-powered explanation</li>
                <li>Interactive dashboard</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Core Capabilities Section */}
        <div id="features" className="features-section" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="section-header">
            <h2 className="section-title">Core Capabilities</h2>
            <p className="section-desc">Engineering-first repository intelligence powered by rule-based analysis and graph algorithms.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Code size={18} />
              </div>
              <h3>Repository Scanner</h3>
              <p>Scans repositories, detects languages, collects metadata and prepares projects for deterministic analysis.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FileText size={18} />
              </div>
              <h3>Unified Parsing</h3>
              <p>Parses source code into a common internal representation for language-independent analysis.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Cpu size={18} />
              </div>
              <h3>Static Analysis</h3>
              <p>Evaluates complexity, maintainability, duplicate code, documentation quality and code smells.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Shield size={18} />
              </div>
              <h3>Security Engine</h3>
              <p>Detects hardcoded secrets, injection risks, unsafe functions and common security vulnerabilities.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <GitBranch size={18} />
              </div>
              <h3>Dependency Graph</h3>
              <p>Builds file-to-file dependency relationships, detects circular dependencies and supports impact analysis.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Network size={18} />
              </div>
              <h3>Knowledge Graph</h3>
              <p>Creates rich relationships between files, classes, functions and modules for repository intelligence.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Activity size={18} />
              </div>
              <h3>Risk Engine</h3>
              <p>Calculates repository, folder and file risk scores using deterministic weighted algorithms.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Database size={18} />
              </div>
              <h3>Historical Memory</h3>
              <p>Stores repository snapshots, compares previous analyses and tracks project evolution.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Brain size={18} />
              </div>
              <h3>AI Explanation Layer</h3>
              <p>Uses AI only to explain structured findings and recommend fixes instead of analyzing the entire repository.</p>
            </div>
          </div>
        </div>

        {/* Memory System Detail Section */}
        <div className="features-section" style={{ borderTop: '1px solid var(--border-color)', textAlign: 'left', maxWidth: '1000px', margin: '0 auto 64px auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '32px',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Repository Memory
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
                CodeMind performs deterministic repository analysis using static analysis, graph algorithms and custom risk scoring. AI is only used to explain findings and recommend improvements.
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                This reduces token usage, improves consistency and makes analysis explainable across every version of your project.
              </p>
            </div>
            <div style={{ 
              backgroundColor: 'var(--card-color)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px', 
              padding: '24px'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Repository Memory Overview
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Store repository snapshots after each analysis.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success-color)', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Compare previous and current repository health.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--warning-color)', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Track technical debt evolution.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Generate repository trends over time.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="landing-footer" style={{ padding: '40px 60px' }}>
        <div>
          <span style={{ fontWeight: 700, color: '#F9FAFB' }}>CodeMind AI</span>
          <p style={{ marginTop: '8px', color: '#94A3B8', fontSize: '12px' }}>Deterministic Engineering Intelligence Platform.</p>
        </div>
        <div style={{ display: 'flex', gap: '30px' }}>
          <span>© 2026 CodeMind AI Inc.</span>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};

