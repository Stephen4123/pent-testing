import React, { useState } from 'react';
import { Shield, Rocket, AlertTriangle, Globe, Zap, Cpu, Sparkles, CheckCircle2, ArrowRight, Server, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ScanForm() {
  const navigate = useNavigate();
  const [target, setTarget] = useState('');
  const [profile, setProfile] = useState('full');
  const [showWarning, setShowWarning] = useState(false);
  const [targetError, setTargetError] = useState('');

  const isValidTarget = (val) => {
    const lenientRegex = /^(https?:\/\/)?([a-zA-Z0-9\.-]+)(:\d+)?(\/.*)?$/i;
    return lenientRegex.test(val.trim());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (target) {
      if (!isValidTarget(target)) {
        setTargetError("Invalid target format. Enter a valid domain, URL, or IP address (e.g., https://example.com)");
        return;
      }
      setShowWarning(true);
    }
  };

  const confirmAndLaunchScan = () => {
    setShowWarning(false);
    let formattedTarget = target.trim();
    if (!formattedTarget.startsWith('http://') && !formattedTarget.startsWith('https://')) {
      formattedTarget = 'https://' + formattedTarget;
    }

    axios.post('/scans', {
      target_url: formattedTarget,
      profile: profile,
      options: {}
    })
      .then(res => {
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: {
            title: 'Assessment Initialized',
            message: `Target: ${formattedTarget}`
          }
        }));

        navigate('/report/active', { state: { scanId: res.data.id, target: formattedTarget, profile: profile, options: {} } });
      })
      .catch(err => {
        console.error("Error launching scan:", err);
        alert("Failed to initialize security assessment. Ensure the backend daemon is active.");
      });
  };

  const profiles = [
    {
      id: 'full',
      title: 'Full Penetration Audit',
      badge: 'RECOMMENDED',
      badgeColor: 'var(--accent-secondary)',
      description: 'Comprehensive active audit combining AI planning, deep subdomain reconnaissance, Nuclei template fuzzing, SSL/TLS validation, and OWASP ZAP active spidering.',
      icon: <Sparkles size={22} color="var(--accent-secondary)" />
    },
    {
      id: 'quick',
      title: 'Quick Vulnerability Scan',
      badge: 'FAST (2-4m)',
      badgeColor: 'var(--severity-medium)',
      description: 'Rapid baseline assessment using top vulnerability heuristics, critical CVE templates, and header posture checks.',
      icon: <Zap size={22} color="var(--severity-medium)" />
    },
    {
      id: 'recon',
      title: 'Passive Reconnaissance Only',
      badge: 'STEALTH',
      badgeColor: 'var(--severity-low)',
      description: 'Non-intrusive target mapping including DNS records, server technologies, exposed API documentation endpoints, and certificate chains.',
      icon: <Search size={22} color="var(--severity-low)" />
    }
  ];

  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="dashboard-header" style={{ width: '100%', maxWidth: '840px' }}>
        <div>
          <div className="dashboard-header-title">
            <div className="brand-icon-wrapper" style={{ width: '32px', height: '32px' }}>
              <Shield size={18} />
            </div>
            <h1>Launch Security Assessment</h1>
          </div>
          <p>Configure assessment scope, select an audit profile, and initialize automated target testing.</p>
        </div>
      </div>

      <div className="widget-card" style={{ maxWidth: '840px', width: '100%', marginTop: '1rem', border: '1px solid var(--border-light)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* AI Orchestrator Callout Box */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(0, 210, 255, 0.08) 100%)',
            border: '1px solid var(--border-light)',
            borderLeft: '4px solid var(--accent-secondary)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem'
          }}>
            <div style={{ color: 'var(--accent-secondary)', marginTop: '2px' }}>
              <Cpu size={24} />
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                AI-Driven Adaptive Orchestration Active
              </strong>
              Target profiles are dynamically interpreted by Google Gemini to construct target-tailored payload sequences, minimize false alarms, and generate developer remediation guides.
            </div>
          </div>

          {/* Target URL/IP Input */}
          <div className="form-group">
            <label className="form-label">Target Domain, URL, or Host IP</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }}>
                <Globe size={18} />
              </div>
              <input
                type="text"
                className="form-input"
                style={{
                  paddingLeft: '2.75rem',
                  width: '100%',
                  fontFamily: 'JetBrains Mono, monospace',
                  borderColor: targetError ? 'var(--severity-critical)' : 'var(--border)'
                }}
                placeholder="https://example.com or 192.168.1.100"
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  if (targetError) setTargetError('');
                }}
                required
              />
            </div>
            {targetError && (
              <span style={{ color: 'var(--severity-critical)', fontSize: '0.825rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} /> {targetError}
              </span>
            )}
          </div>

          {/* Scan Profile Selection Cards */}
          <div className="form-group">
            <label className="form-label">Select Assessment Profile</label>
            <div className="profile-selection-grid">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`profile-select-card ${profile === p.id ? 'selected' : ''}`}
                  onClick={() => setProfile(p.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--bg-surface)' }}>
                      {p.icon}
                    </div>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.05)',
                      color: p.badgeColor,
                      border: `1px solid ${p.badgeColor}`
                    }}>
                      {p.badge}
                    </span>
                  </div>
                  <h4>{p.title}</h4>
                  <p>{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Launch Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Authorization agreement requested before launch.
            </span>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}
              disabled={!target.trim()}
            >
              <Rocket size={18} /> Initialize Assessment <ArrowRight size={16} />
            </button>
          </div>

        </form>
      </div>

      {/* Security Disclaimer Modal */}
      {showWarning && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">
              <AlertTriangle size={24} /> Authorization & Disclaimer
            </div>
            <div className="modal-body">
              <p>
                <strong>LEGAL NOTICE:</strong> You are about to initiate active security probing and vulnerability fuzzing against <strong>{target}</strong>.
              </p>
              <br />
              <p>
                By proceeding, you certify that you have express written authorization from the system owner to assess this target infrastructure. Unauthorized penetration testing is subject to civil and criminal penalties.
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowWarning(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={confirmAndLaunchScan}>
                Accept Terms & Launch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
