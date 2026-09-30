import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, Key, Zap, Bell, Users, Shield, Copy, Trash2, Plus, UserPlus, MoreVertical
} from 'lucide-react';
import './Settings.css';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const contentRef = useRef(null);

  const sectionRefs = {
    general: useRef(null),
    keys: useRef(null),
    engine: useRef(null),
    notifications: useRef(null),
    team: useRef(null)
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      
      const scrollPosition = contentRef.current.scrollTop;
      const offsets = Object.entries(sectionRefs).map(([key, ref]) => {
        return {
          key,
          offset: ref.current ? ref.current.offsetTop - 150 : 0
        };
      });

      // Find the current active section based on scroll position
      for (let i = offsets.length - 1; i >= 0; i--) {
        if (scrollPosition >= offsets[i].offset) {
          setActiveTab(offsets[i].key);
          break;
        }
      }
    };

    const container = contentRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToSection = (sectionId) => {
    setActiveTab(sectionId);
    if (sectionRefs[sectionId]?.current && contentRef.current) {
      contentRef.current.scrollTo({
        top: sectionRefs[sectionId].current.offsetTop - 50,
        behavior: 'smooth'
      });
    }
  };

  const [aiLevel, setAiLevel] = useState(8.5);
  const [autoRemediate, setAutoRemediate] = useState(true);
  const [deepFuzzing, setDeepFuzzing] = useState(false);

  return (
    <div className="settings-page">
      {/* SIDEBAR */}
      <div className="settings-sidebar">
        <div className="settings-sidebar-header">
          <h2 className="settings-sidebar-title">Settings</h2>
          <p className="settings-sidebar-subtitle">Manage your workspace</p>
        </div>

        <div className="settings-nav">
          <button 
            className={`settings-nav-item ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => scrollToSection('general')}
          >
            <SettingsIcon size={16} /> General
          </button>
          <button 
            className={`settings-nav-item ${activeTab === 'keys' ? 'active' : ''}`}
            onClick={() => scrollToSection('keys')}
          >
            <Key size={16} /> API Keys
          </button>
          <button 
            className={`settings-nav-item ${activeTab === 'engine' ? 'active' : ''}`}
            onClick={() => scrollToSection('engine')}
          >
            <Zap size={16} /> Engine Config
          </button>
          <button 
            className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => scrollToSection('notifications')}
          >
            <Bell size={16} /> Notifications
          </button>
          <button 
            className={`settings-nav-item ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => scrollToSection('team')}
          >
            <Users size={16} /> Team Management
          </button>
        </div>

        <div className="settings-sidebar-footer">
          <div className="shield-icon">
            <Shield size={24} />
          </div>
          <div>
            <div className="brand-text">AutoSec Pro</div>
            <div className="version-text">V2.4.0-ALPHA</div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="settings-content-wrapper" ref={contentRef}>
        
        {/* GENERAL SETTINGS */}
        <div className="settings-section" ref={sectionRefs.general} id="general">
          <div className="settings-section-header">
            <SettingsIcon size={18} color="#c4b5fd" /> General Settings
          </div>
          <div className="settings-card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="settings-input-group">
                <label className="settings-label">Workspace Name</label>
                <input type="text" className="settings-input" defaultValue="AutoSec Research Lab" />
              </div>
              <div className="settings-input-group">
                <label className="settings-label">Primary Contact</label>
                <input type="email" className="settings-input" defaultValue="admin@autosec.io" />
              </div>
            </div>
            <button className="settings-save-btn">Save Changes</button>
          </div>
        </div>

        {/* API KEYS */}
        <div className="settings-section" ref={sectionRefs.keys} id="keys">
          <div className="settings-section-header">
            <Key size={18} color="#c4b5fd" /> API Keys
          </div>
          <div className="settings-card">
            <div className="settings-table-header">
              <div></div>
              <button className="settings-add-btn">
                <Plus size={16} /> Generate New Key
              </button>
            </div>
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Key Fragment</th>
                  <th>Created</th>
                  <th style={{textAlign: 'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{fontWeight: 600}}>Production CLI</td>
                  <td className="mono">as_live_••••••••3f2d</td>
                  <td>Oct 12, 2023</td>
                  <td className="actions">
                    <button className="settings-icon-btn copy"><Copy size={16} /></button>
                    <button className="settings-icon-btn trash"><Trash2 size={16} /></button>
                  </td>
                </tr>
                <tr>
                  <td style={{fontWeight: 600}}>Staging Environment</td>
                  <td className="mono">as_test_••••••••9a1e</td>
                  <td>Nov 04, 2023</td>
                  <td className="actions">
                    <button className="settings-icon-btn copy"><Copy size={16} /></button>
                    <button className="settings-icon-btn trash"><Trash2 size={16} /></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ENGINE CONFIGURATION */}
        <div className="settings-section" ref={sectionRefs.engine} id="engine">
          <div className="settings-section-header">
            <Zap size={18} color="#c4b5fd" /> Engine Configuration
          </div>
          <div className="settings-card">
            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <h4>Auto-remediate low-risk findings</h4>
                <p>Automatically apply patches for known low-impact vulnerabilities.</p>
              </div>
              <div 
                className={`toggle-switch ${autoRemediate ? 'on' : ''}`} 
                onClick={() => setAutoRemediate(!autoRemediate)}
                style={{ backgroundColor: autoRemediate ? '#8b5cf6' : 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '40px', height: '24px', borderRadius: '12px', position: 'relative' }}
              >
                <div className="toggle-knob" style={{ transform: autoRemediate ? 'translateX(18px)' : 'translateX(2px)', transition: 'transform 0.2s', position: 'absolute', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white' }}></div>
              </div>
            </div>
            
            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <h4>Deep Fuzzing Mode</h4>
                <p>Extend scan duration to perform exhaustive mutation testing.</p>
              </div>
              <div 
                className={`toggle-switch ${deepFuzzing ? 'on' : ''}`} 
                onClick={() => setDeepFuzzing(!deepFuzzing)}
                style={{ backgroundColor: deepFuzzing ? '#8b5cf6' : 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '40px', height: '24px', borderRadius: '12px', position: 'relative' }}
              >
                <div className="toggle-knob" style={{ transform: deepFuzzing ? 'translateX(18px)' : 'translateX(2px)', transition: 'transform 0.2s', position: 'absolute', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white' }}></div>
              </div>
            </div>

            <div className="settings-slider-row">
              <div className="settings-slider-header">
                <div>
                  <h4>AI Reasoning Level</h4>
                  <p>Computational depth used for false-positive reduction.</p>
                </div>
                <div className="settings-slider-value">{aiLevel.toFixed(1)} / 10</div>
              </div>
              <input 
                type="range" 
                className="settings-slider" 
                min="1" 
                max="10" 
                step="0.5" 
                value={aiLevel} 
                onChange={(e) => setAiLevel(parseFloat(e.target.value))} 
              />
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div className="settings-section" ref={sectionRefs.notifications} id="notifications">
          <div className="settings-section-header">
            <Bell size={18} color="#c4b5fd" /> Notifications & Integrations
          </div>
          <div className="settings-card">
            <div className="settings-input-group">
              <label className="settings-label">Slack Webhook URL</label>
              <div style={{display: 'flex', gap: '1rem'}}>
                <input type="text" className="settings-input" defaultValue="https://hooks.slack.com/services/..." />
                <button className="settings-save-btn" style={{backgroundColor: 'rgba(255,255,255,0.1)', color: '#cbd5e1'}}>Test</button>
              </div>
            </div>
            <div className="settings-input-group">
              <label className="settings-label">Discord Webhook URL</label>
              <div style={{display: 'flex', gap: '1rem'}}>
                <input type="text" className="settings-input" defaultValue="https://discord.com/api/webhooks/..." />
                <button className="settings-save-btn" style={{backgroundColor: 'rgba(255,255,255,0.1)', color: '#cbd5e1'}}>Test</button>
              </div>
            </div>
          </div>
        </div>

        {/* TEAM MANAGEMENT */}
        <div className="settings-section" ref={sectionRefs.team} id="team">
          <div className="settings-section-header">
            <Users size={18} color="#c4b5fd" /> Team Management
          </div>
          <div className="settings-card">
            <div className="settings-table-header">
              <div></div>
              <button className="settings-add-btn purple">
                <UserPlus size={16} /> Invite Member
              </button>
            </div>
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{textAlign: 'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="settings-member-cell">
                      <div className="settings-avatar">EL</div>
                      <div className="settings-member-info">
                        <h5>Elias Thorne</h5>
                        <p>elias@autosec.io</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="settings-role-badge admin">ADMIN</span></td>
                  <td>
                    <div className="settings-status-indicator">
                      <div className="settings-status-dot active"></div> Active
                    </div>
                  </td>
                  <td className="actions">
                    <button className="settings-icon-btn"><MoreVertical size={16} /></button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="settings-member-cell">
                      <div className="settings-avatar">MK</div>
                      <div className="settings-member-info">
                        <h5>Marcus Kaine</h5>
                        <p>marcus.k@contract.io</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="settings-role-badge auditor">AUDITOR</span></td>
                  <td>
                    <div className="settings-status-indicator">
                      <div className="settings-status-dot active"></div> Active
                    </div>
                  </td>
                  <td className="actions">
                    <button className="settings-icon-btn"><MoreVertical size={16} /></button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="settings-member-cell">
                      <div className="settings-avatar" style={{backgroundColor: 'rgba(148, 163, 184, 0.2)', color: '#94a3b8'}}>SR</div>
                      <div className="settings-member-info">
                        <h5>Sarah Reed</h5>
                        <p>sarah@autosec.io</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="settings-role-badge developer">DEVELOPER</span></td>
                  <td>
                    <div className="settings-status-indicator">
                      <div className="settings-status-dot"></div> Offline
                    </div>
                  </td>
                  <td className="actions">
                    <button className="settings-icon-btn"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Footer content */}
          <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.75rem', fontWeight: '500' }}>
            <div>v2.4.0-alpha • System Status: Operational</div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
              <span style={{ cursor: 'pointer' }}>Terms of Service</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
