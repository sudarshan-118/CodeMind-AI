import React, { useState } from 'react';
import type { Memory } from '../types';
import { Search, Clock, HelpCircle, Plus, Trash2, ShieldCheck, User } from 'lucide-react';

interface MemoryCenterProps {
  memories: Memory[];
  userEmail?: string;
  onAddMemory?: (mem: Memory) => void;
  onDeleteMemory?: (id: string) => void;
}

export const MemoryCenter: React.FC<MemoryCenterProps> = ({
  memories,
  userEmail,
  onAddMemory,
  onDeleteMemory
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal form states
  const [issue, setIssue] = useState('');
  const [fix, setFix] = useState('');
  const [outcome, setOutcome] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const filteredMemories = memories.filter(m =>
    m.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.fix.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.recommendation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitNewMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim() || !fix.trim()) return;

    const newMem: Memory = {
      id: `mem-${Date.now()}`,
      issue: issue.trim(),
      fix: fix.trim(),
      outcome: outcome.trim() || 'Issue resolved and verified.',
      recommendation: recommendation.trim() || `Follow security best practices for ${issue.trim()}`,
      date: new Date().toISOString().split('T')[0],
      matchPercentage: 95
    };

    if (onAddMemory) {
      onAddMemory(newMem);
    }

    setIssue('');
    setFix('');
    setOutcome('');
    setRecommendation('');
    setShowAddModal(false);
  };

  return (
    <div className="memories-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Hindsight Memory Center</h1>
            {userEmail && (
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--primary-color)',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '3px 8px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <User size={12} />
                {userEmail}'s Vault
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Your personal database of historical vulnerabilities, verified fixes, and learned code patterns.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, var(--primary-color) 0%, #4f46e5 100%)'
          }}
        >
          <Plus size={16} />
          Add Memory
        </button>
      </div>

      {/* Filter bar */}
      <div className="search-filters-bar" style={{ marginTop: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search memory database..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredMemories.length}</strong> personal {filteredMemories.length === 1 ? 'memory' : 'memories'}
        </div>
      </div>

      {/* Timeline view */}
      {filteredMemories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-color)' }}>
          <HelpCircle size={40} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <p style={{ fontWeight: 600 }}>No memories found matching your search</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            {searchQuery ? 'Try searching for general keywords like "SQL", "Injection", or "Stripe".' : 'Click "Add Memory" above to store your first security pattern.'}
          </p>
        </div>
      ) : (
        <div className="timeline-view">
          {filteredMemories.map((mem) => (
            <div key={mem.id} className="timeline-node">
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    Audited on {mem.date}
                  </span>
                  <span className="severity-badge success" style={{ padding: '1px 6px', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <ShieldCheck size={10} /> LEARNED ✓
                  </span>
                </div>

                {onDeleteMemory && (
                  <button
                    onClick={() => onDeleteMemory(mem.id)}
                    title="Delete Memory"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'color 0.2s ease, background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Memory Flow Card */}
              <div className="memory-flow">
                <div className="flow-step">
                  <div className="flow-step-label">Vulnerable Issue</div>
                  <div className="flow-step-content" style={{ borderLeft: '3px solid var(--critical-color)' }}>
                    {mem.issue}
                  </div>
                </div>

                <div className="flow-step">
                  <div className="flow-step-label">Verified Fix</div>
                  <div className="flow-step-content" style={{ borderLeft: '3px solid var(--primary-color)', fontFamily: 'monospace', fontSize: '12px', color: '#6EE7B7' }}>
                    {mem.fix}
                  </div>
                </div>

                <div className="flow-step">
                  <div className="flow-step-label">Outcome Status</div>
                  <div className="flow-step-content" style={{ borderLeft: '3px solid var(--success-color)' }}>
                    {mem.outcome}
                  </div>
                </div>

                <div className="flow-step">
                  <div className="flow-step-label">Recommendation</div>
                  <div className="flow-step-content" style={{ borderLeft: '3px solid var(--warning-color)' }}>
                    {mem.recommendation}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Custom Memory */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: '#f8fafc' }}>
              Add Personal Memory
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Record a verified code fix or architectural pattern to reference in future automated scans.
            </p>

            <form onSubmit={handleSubmitNewMemory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Vulnerable Issue / Pattern *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Hardcoded JWT Secret in auth.ts"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Verified Fix / Code Pattern *
                </label>
                <textarea
                  className="form-input"
                  placeholder="e.g. const secret = process.env.JWT_SECRET;"
                  rows={3}
                  value={fix}
                  onChange={(e) => setFix(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Outcome Status
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Token leakage prevented. Secrets isolated."
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Recommendation / Standard
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Always load security keys from environment config."
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowAddModal(false)}
                  style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 20px' }}
                >
                  Save Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
