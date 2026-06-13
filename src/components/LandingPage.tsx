import React from 'react';
import { Shield, Brain, Layers, Activity, FileText, Settings, ArrowRight } from 'lucide-react';
import { SignInButton, SignUpButton, useAuth } from '@clerk/clerk-react';

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const { isSignedIn } = useAuth();

  return (
    <div style={{ backgroundColor: '#0F172A', minHeight: '100vh', width: '100%' }}>
      {/* Navbar */}
      <header className="main-header" style={{ padding: '16px 40px' }}>
        <div className="logo-section">
          <Brain className="logo-icon" size={24} />
          <span>CodeMind AI</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="#features" className="nav-item" style={{ fontSize: '14px' }}>Features</a>
          {isSignedIn ? (
            <button className="btn btn-primary" onClick={onEnterApp}>
              Launch Console
              <ArrowRight size={14} />
            </button>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="nav-item" style={{ fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn btn-primary">
                  Sign Up
                  <ArrowRight size={14} />
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="landing-container">
        <span className="hero-tag">ENTERPRISE CODE INTELLIGENCE</span>
        <h1 className="hero-title">
          Engineering Teams Forget.<br />
          <span style={{ color: '#2563EB' }}>CodeMind Remembers.</span>
        </h1>
        <p className="hero-subtitle">
          CodeMind AI is a memory-powered engineering intelligence platform. It tracks code reviews, learns how your team fixes vulnerabilities, and enforces architectural standards across your codebases.
        </p>
        <div className="hero-cta">
          {isSignedIn ? (
            <>
              <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px' }} onClick={onEnterApp}>
                Launch Console
              </button>
              <button className="btn" style={{ padding: '12px 28px', fontSize: '15px' }} onClick={onEnterApp}>
                View Workspace
              </button>
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px' }}>
                  Start Free Analysis
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="btn" style={{ padding: '12px 28px', fontSize: '15px' }}>
                  View Demo Workspace
                </button>
              </SignInButton>
            </>
          )}
        </div>

        {/* Features Grid */}
        <div id="features" className="features-section">
          <div className="section-header">
            <h2 className="section-title">Continuous Memory-Powered Auditing</h2>
            <p className="section-desc">Traditional static scanners lack context. CodeMind remembers fixes to make future audits smarter.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Brain size={20} />
              </div>
              <h3>Memory Intelligence</h3>
              <p>Creates a historical timeline database of resolved vulnerabilities and architectural flaws to automatically prevent regressions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Shield size={20} />
              </div>
              <h3>Security Auditing</h3>
              <p>Detections for OWASP top 10 risks including SQL Injection, secret leaks, and command injections with line-level highlighted details.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Layers size={20} />
              </div>
              <h3>Dependency Propagation</h3>
              <p>Visualizes file-level imports and traces how a single vulnerability affects downstream database connections and route layers.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Settings size={20} />
              </div>
              <h3>Team Standards Enforcement</h3>
              <p>Configure architectural rules, class designs, or required patterns and flag violations in real-time before code gets merged.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Activity size={20} />
              </div>
              <h3>Health Scoring & Trends</h3>
              <p>Tracks and visualizes quantitative metrics across security, architecture, performance, and maintainability for every repository.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FileText size={20} />
              </div>
              <h3>PDF Audit Reports</h3>
              <p>Instantly compile executive summaries, dependency structures, and memory matches into downloadable audit documents.</p>
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
