import React, { useState } from 'react';
import type { Memory } from '../types';
import { Search, Clock, HelpCircle } from 'lucide-react';

interface MemoryCenterProps {
  memories: Memory[];
}

export const MemoryCenter: React.FC<MemoryCenterProps> = ({ memories }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMemories = memories.filter(m =>
    m.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.fix.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.recommendation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="memories-container">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Hindsight Memory Center</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Database of historical vulnerabilities, applied fixes, and architectural memories that CodeMind references.
        </p>
      </div>

      {/* Filter bar */}
      <div className="search-filters-bar">
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
          Showing <strong>{filteredMemories.length}</strong> memories stored
        </div>
      </div>

      {/* Timeline view */}
      {filteredMemories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-color)' }}>
          <HelpCircle size={40} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <p style={{ fontWeight: 600 }}>No memories found matching your search</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Try searching for general keywords like "SQL", "Injection", or "Stripe".</p>
        </div>
      ) : (
        <div className="timeline-view">
          {filteredMemories.map((mem) => (
            <div key={mem.id} className="timeline-node">
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  Audited on {mem.date}
                </span>
                <span className="severity-badge success" style={{ padding: '1px 6px', fontSize: '9px' }}>
                  LEARNED ✓
                </span>
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
    </div>
  );
};
