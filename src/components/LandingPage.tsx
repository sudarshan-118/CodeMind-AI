import React from 'react';
import { Shield, Brain, Layers, Activity, Code, BookOpen } from 'lucide-react';
import { SignInButton, SignUpButton, useAuth } from '@clerk/clerk-react';
import productPreview from '../assets/product_preview.png';

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const { isSignedIn } = useAuth();

  return (
    <div style={{ backgroundColor: '#0B1220', minHeight: '100vh', width: '100%', color: '#F9FAFB' }}>
      {/* Navbar */}
      <header className="main-header" style={{ padding: '16px 40px' }}>
        <div className="logo-section">
          <Brain className="logo-icon" size={20} />
          <span>CodeMind AI</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="#features" className="nav-item" style={{ fontSize: '13px' }}>Capabilities</a>
          <a href="#how-it-works" className="nav-item" style={{ fontSize: '13px' }}>Workflow</a>
          {isSignedIn ? (
            <button className="btn btn-primary" onClick={onEnterApp}>
              Launch Console
            </button>
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
          Review projects, track vulnerabilities, and build engineering memory over time.
        </p>
        
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '-16px auto 32px auto', fontSize: '14px', lineHeight: '1.55' }}>
          Upload a repository, folder, ZIP, or file. CodeMind analyzes the codebase, highlights risks, stores findings, and uses previous reviews to improve future analysis.
        </p>

        <div className="hero-cta">
          {isSignedIn ? (
            <>
              <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }} onClick={onEnterApp}>
                Start Analysis
              </button>
              <button className="btn" style={{ padding: '12px 24px', fontSize: '14px' }} onClick={onEnterApp}>
                View Workspace
              </button>
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
                  Start Analysis
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
              alt="CodeMind AI Workspace Console preview showing Project Tree, Risk Highlights, Code Inspector, and Memory Center" 
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
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Memory Center</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>Queryable record database of past vulnerabilities and user fixes.</p>
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
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Import Project</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Connect a GitHub repository URL, upload a ZIP archive, folder, or individual code file.</p>
            </div>
            <div style={{ padding: '24px', backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>STEP 2</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Analyze Codebase</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Run checks covering security defects, structural issues, performance bottlenecks, and code quality.</p>
            </div>
            <div style={{ padding: '24px', backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>STEP 3</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Review Findings</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Inspect highlighted vulnerable code paths within the file tree and apply recommended modifications.</p>
            </div>
            <div style={{ padding: '24px', backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px' }}>STEP 4</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Build Memory</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Store approved modifications and findings in the local database to improve future code analysis.</p>
            </div>
          </div>
        </div>

        {/* Core Capabilities Section */}
        <div id="features" className="features-section" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="section-header">
            <h2 className="section-title">Core Capabilities</h2>
            <p className="section-desc">Designed to audit software structure and maintain high standard compliance.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Code size={18} />
              </div>
              <h3>Project Analysis</h3>
              <p>Review entire repositories dynamically. Tracks statistics including files found, folders processed, and lines scanned.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Layers size={18} />
              </div>
              <h3>Dependency Graph</h3>
              <p>Traces structural imports and module relationships. Visually inspects how vulnerable files affect downstream services.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Brain size={18} />
              </div>
              <h3>Memory Center</h3>
              <p>Timeline-based audit catalog that records previous findings, recommended fixes, and applied code modifications.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Shield size={18} />
              </div>
              <h3>Security Review</h3>
              <p>Detects security risks, credentials leaks, and execution patterns. Flags critical vulnerabilities in source lines.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Activity size={18} />
              </div>
              <h3>Health Score</h3>
              <p>Calculates project health metrics based on architectural guidelines, performance issues, and open vulnerability files.</p>
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
                Engineering Memory System
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
                Traditional scanners evaluate code snippets in isolation, losing historical context of past fixes. CodeMind stores every applied fix and vulnerability resolution in a queryable memory database.
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                As your codebase evolves, new pull requests are evaluated against previous fixes. The pipeline checks for regression patterns and flags when resolved risks reappear in new modules or downstream files.
              </p>
            </div>
            <div style={{ 
              backgroundColor: 'var(--card-color)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px', 
              padding: '24px'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Memory Match Pipeline
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Identify Risk:</span> SQL Injection vulnerability found in user credentials routing.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success-color)', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Fix Applied:</span> Parameterized query configuration replaced raw concatenation.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Store Memory:</span> Database records resolution pattern automatically.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--warning-color)', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Regressions Blocked:</span> Future scans matching SQL raw statements block integration.
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
          <p style={{ marginTop: '8px', color: '#94A3B8', fontSize: '12px' }}>Memory-Powered Engineering Intelligence Platform.</p>
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
