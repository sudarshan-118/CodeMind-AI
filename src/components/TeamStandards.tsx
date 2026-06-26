import React, { useState } from 'react';
import type { Standard } from '../types';
import { Plus, Info, Trash2, Sparkles, Loader2 } from 'lucide-react';

interface TeamStandardsProps {
  standards: Standard[];
  onToggleStandard: (id: string) => void;
  onAddStandard: (std: Standard) => void;
  onDeleteStandard: (id: string) => void;
  aiSuggestions: Standard[];
  isGeneratingSuggestions: boolean;
  onGenerateSuggestions: () => void;
}

export const TeamStandards: React.FC<TeamStandardsProps> = ({
  standards,
  onToggleStandard,
  onAddStandard,
  onDeleteStandard,
  aiSuggestions,
  isGeneratingSuggestions,
  onGenerateSuggestions
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [severity, setSeverity] = useState<'warning' | 'critical'>('warning');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !ruleKeyword) return;

    onAddStandard({
      id: `std-${Date.now()}`,
      name,
      description,
      ruleKeyword,
      severity,
      enabled: true
    });

    setName('');
    setDescription('');
    setRuleKeyword('');
    setSeverity('warning');
    setShowAddForm(false);
  };

  const visibleSuggestions = aiSuggestions.filter(
    sug => !standards.some(std => std.ruleKeyword.toLowerCase() === sug.ruleKeyword.toLowerCase() || std.name.toLowerCase() === sug.name.toLowerCase())
  );

  return (
    <div className="standards-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Team Architecture Standards</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Configure code structure patterns and standard practices to validate code audits against.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={16} />
          Add Standard Rule
        </button>
      </div>

      {/* Add Standard Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'var(--card-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Create Architectural Rule</h3>
          
          <div className="form-group">
            <label className="form-label">Rule Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Enforce Repository Pattern"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Rule Description</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Explain why this rule standard is required..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Trigger Rule Keyword (checked in code)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 'Repository' or 'extends Model'"
                value={ruleKeyword}
                onChange={(e) => setRuleKeyword(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Rule Violation Severity</label>
              <select 
                className="form-input"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as 'warning' | 'critical')}
              >
                <option value="warning">Warning (Medium)</option>
                <option value="critical">Critical (High/Severe)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Enable Standard Rule</button>
          </div>
        </form>
      )}

      {/* Rules list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {standards.map((std) => (
          <div key={std.id} className="standard-row" style={{
            opacity: std.enabled ? 1 : 0.65
          }}>
            <div className="standard-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="standard-name">{std.name}</span>
                <span className={`severity-badge ${std.severity === 'critical' ? 'critical' : 'warning'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                  {std.severity}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                  matches: "{std.ruleKeyword}"
                </span>
              </div>
              <span className="standard-desc">{std.description}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: std.enabled ? 'var(--success-color)' : 'var(--text-secondary)', fontWeight: 600 }}>
                  {std.enabled ? 'ACTIVE ENFORCED' : 'MUTED'}
                </span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={std.enabled} 
                    onChange={() => onToggleStandard(std.id)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <button 
                type="button"
                className="btn btn-danger" 
                style={{ 
                  padding: '6px', 
                  borderRadius: '6px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  color: 'var(--critical-color)',
                  cursor: 'pointer'
                }}
                onClick={() => onDeleteStandard(std.id)}
                title="Delete this standard"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* AI Recommendations Section */}
      {visibleSuggestions.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(99, 102, 241, 0.03)',
          border: '1px dashed rgba(99, 102, 241, 0.25)',
          borderRadius: '8px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#A5B4FC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#818CF8' }} />
                AI Suggested Standards
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                Quickly add common industry rules or generate custom standards using AI.
              </p>
            </div>
            <button 
              type="button" 
              className="btn" 
              style={{ 
                backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                borderColor: 'rgba(99, 102, 241, 0.2)', 
                color: '#A5B4FC',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={onGenerateSuggestions}
              disabled={isGeneratingSuggestions}
            >
              {isGeneratingSuggestions ? (
                <>
                  <Loader2 style={{ animation: 'spin 1.5s linear infinite' }} size={14} />
                  Generating suggestions...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Ask AI for Custom Rules
                </>
              )}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {visibleSuggestions.map((suggestion) => (
              <div key={suggestion.id} style={{
                backgroundColor: 'var(--card-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{suggestion.name}</span>
                    <span className={`severity-badge ${suggestion.severity === 'critical' ? 'critical' : 'warning'}`} style={{ fontSize: '8px', padding: '1px 4px' }}>
                      {suggestion.severity}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', backgroundColor: 'rgba(15, 23, 42, 0.3)', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                    keyword: "{suggestion.ruleKeyword}"
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {suggestion.description}
                  </p>
                </div>
                <button 
                  type="button"
                  className="btn btn-primary" 
                  style={{ width: '100%', fontSize: '12px', padding: '8px 12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                  onClick={() => onAddStandard(suggestion)}
                >
                  <Plus size={14} />
                  Add to My Standards
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info helper */}
      <div style={{
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
        border: '1px solid rgba(37, 99, 235, 0.2)',
        borderRadius: '6px',
        padding: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        color: 'var(--text-secondary)',
        fontSize: '13px'
      }}>
        <Info size={18} style={{ color: 'var(--primary-color)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Standard Rules Scope:</strong>
          <p style={{ marginTop: '4px', lineHeight: 1.4 }}>
            Toggling standards adjusts target project vulnerability alerts instantly. Muted rules clear file tree flags and increase overall architecture scores. Disabling a rule removes its warning flags from code inspections.
          </p>
        </div>
      </div>
    </div>
  );
};
