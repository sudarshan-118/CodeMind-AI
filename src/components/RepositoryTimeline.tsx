import React from 'react';
import type { RepositoryTimelineSnapshot } from '../backend/shared/types';
import { History, TrendingUp, TrendingDown, Clock, Layers, Award } from 'lucide-react';

interface RepositoryTimelineProps {
  snapshots: RepositoryTimelineSnapshot[];
  currentHealth: number;
  techDebtHours: number;
  detectedPattern: string;
}

export const RepositoryTimeline: React.FC<RepositoryTimelineProps> = ({
  snapshots,
  currentHealth,
  techDebtHours,
  detectedPattern
}) => {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: 'var(--card-color)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        textAlign: 'center'
      }}>
        <History size={32} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
        <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Repository Timeline History</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          No historical analysis snapshots recorded yet. Run repository scans to populate historical trend timelines.
        </p>
      </div>
    );
  }

  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const healthDiff = previous ? latest.healthScore - previous.healthScore : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Intelligence Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <div className="stat-card" style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Health Index</span>
            <Award size={16} style={{ color: currentHealth >= 80 ? '#10B981' : '#F59E0B' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>{currentHealth}/100</span>
            {healthDiff !== 0 && (
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: healthDiff > 0 ? '#10B981' : '#EF4444',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                {healthDiff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {healthDiff > 0 ? `+${healthDiff}` : healthDiff}
              </span>
            )}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Technical Debt</span>
            <Clock size={16} style={{ color: '#6366F1' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>
            {techDebtHours} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)' }}>hrs (~${techDebtHours * 50})</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Architecture Pattern</span>
            <Layers size={16} style={{ color: '#10B981' }} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>
            {detectedPattern}
          </div>
        </div>
      </div>

      {/* Snapshot Timeline List */}
      <div style={{
        backgroundColor: 'var(--card-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} style={{ color: 'var(--primary-color)' }} />
          Repository Evolution Timeline ({snapshots.length} Snapshots)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {snapshots.slice().reverse().map((snap, idx) => (
            <div key={snap.id || idx} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--primary-color)',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  {snap.version || `v1.${idx + 1}`}
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>
                    Commit Hash: <code style={{ color: '#6EE7B7' }}>{snap.commitHash}</code>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {new Date(snap.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Health</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: snap.healthScore >= 80 ? '#10B981' : '#F59E0B' }}>
                    {snap.healthScore}/100
                  </span>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Security</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: snap.securityScore >= 80 ? '#10B981' : '#EF4444' }}>
                    {snap.securityScore}/100
                  </span>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Findings</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: snap.totalFindings === 0 ? '#10B981' : '#F8FAFC' }}>
                    {snap.totalFindings} ({snap.criticalFindings} Crit)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
