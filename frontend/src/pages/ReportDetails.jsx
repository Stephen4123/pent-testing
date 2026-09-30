import React, { useState, useEffect } from 'react';
import { ClipboardList, Shield, FileText, Settings, HelpCircle, Activity, AlertCircle, ArrowLeft, Download, Search, CheckCircle, Hourglass, ChevronRight, X, Bug, Sparkles, Code, ChevronDown, Server, Network, Layers, Terminal, StopCircle, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import './ReportDetails.css';
import './ReportDetails-report.css';

export default function ReportDetails() {
  const [activeTab, setActiveTab] = useState('progress');
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [selectedReconCard, setSelectedReconCard] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [subdomainsModal, setSubdomainsModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleDownload = async (type) => {
    if (!scanId) return;
    try {
      const response = await axios.get(`/scans/${scanId}/${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scan_report_${scanId}.${type}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error downloading ${type}:`, error);
    }
  };

  const handleTerminate = async () => {
    if (!scanId) return;
    if (!window.confirm("Are you sure you want to terminate this scan?")) return;
    try {
      await axios.post(`/scans/${scanId}/terminate`);
      setStatusData(prev => ({...prev, status: 'TERMINATED', current_stage: 'TERMINATED'}));
    } catch (error) {
      console.error("Failed to terminate scan", error);
    }
  };

  // Try to read scanId from state, otherwise default/fallback
  const scanData = location.state || {};
  const [scanId, setScanId] = useState(scanData.scanId || null);
  const [targetUrl, setTargetUrl] = useState(scanData.target || 'https://example.com');
  const [findings, setFindings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [scannerFilter, setScannerFilter] = useState('All Scanners');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  const filteredFindings = findings.filter(finding => {
    const matchesSearch = finding.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          finding.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'All Severities' || finding.severity.toUpperCase() === severityFilter.toUpperCase();
    const matchesScanner = scannerFilter === 'All Scanners' || finding.source_scanner === scannerFilter;
    const matchesStatus = statusFilter === 'All Statuses' || finding.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesScanner && matchesStatus;
  });

  const uniqueScanners = ['All Scanners', ...new Set(findings.map(f => f.source_scanner))];
  const uniqueStatuses = ['All Statuses', ...new Set(findings.map(f => f.status))];
  const severities = ['All Severities', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  const [statusData, setStatusData] = useState({
    scan_id: '',
    status: 'PENDING',
    current_stage: '1. VALIDATION',
    progress_percentage: 0,
    stages_completed: [],
    stages_remaining: [
      "1. VALIDATION",
      "2. RECON",
      "3. AI PLANNING",
      "4. DISCOVERY",
      "5. PROCESSING",
      "6. COMPLETED"
    ],
    live_findings_count: { critical: 0, high: 0, medium: 0, low: 0 },
    recon_summary: { subdomains: [], technologies: [], ports: [], dns_records: {} },
    log_entries: []
  });

  // If scanId is null, fetch the most recent scan to hook into
  useEffect(() => {
    if (!scanId) {
      axios.get('/scans')
        .then(res => {
          if (res.data && res.data.length > 0) {
            setScanId(res.data[0].id);
            setTargetUrl(res.data[0].target);
          }
        })
        .catch(err => console.error("Error fetching recent scan:", err));
    }
  }, [scanId]);

  // Status and logs polling
  useEffect(() => {
    if (!scanId) return;

    const fetchStatus = () => {
      axios.get(`/scans/${scanId}/status`)
        .then(res => {
          setStatusData(res.data);
        })
        .catch(err => console.error("Error fetching scan status:", err));
    };

    const fetchFindings = () => {
      axios.get(`/scans/${scanId}/findings`)
        .then(res => {
          setFindings(res.data);
        })
        .catch(err => console.error("Error fetching scan findings:", err));
    };

    fetchStatus();
    fetchFindings();

    const interval = setInterval(() => {
      fetchStatus();
      fetchFindings();
    }, 2000);

    return () => clearInterval(interval);
  }, [scanId]);

  let hostname = targetUrl;
  try {
    hostname = new URL(targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`).hostname;
  } catch (e) { }

  const allStages = [
    "1. VALIDATION",
    "2. RECON",
    "3. AI PLANNING",
    "4. DISCOVERY",
    "5. PROCESSING",
    "6. COMPLETED"
  ];

  const [elapsedTime, setElapsedTime] = useState('00:00');

  useEffect(() => {
    if (!statusData.created_at) return;

    const interval = setInterval(() => {
      let endTime = Date.now();
      if (statusData.status === 'COMPLETED' || statusData.status === 'FAILED' || statusData.status === 'TERMINATED') {
        if (statusData.updated_at) {
          const updatedStr = statusData.updated_at.endsWith('Z') ? statusData.updated_at : `${statusData.updated_at}Z`;
          endTime = new Date(updatedStr).getTime();
        }
      }
      const createdStr = statusData.created_at.endsWith('Z') ? statusData.created_at : `${statusData.created_at}Z`;
      const start = new Date(createdStr).getTime();
      const diff = Math.max(0, endTime - start);
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      
      if (statusData.status === 'COMPLETED' || statusData.status === 'FAILED' || statusData.status === 'TERMINATED') {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [statusData.created_at, statusData.updated_at, statusData.status]);

  return (
    <div className="report-details-container">
      {/* SIDEBAR */}
      <div className={`rd-sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
        <div className="rd-sidebar-header-row">
          {isSidebarOpen && (
            <div className="rd-brand">
              <div className={`rd-pulse-dot ${statusData.status === 'COMPLETED' ? 'completed' : ''}`}></div>
              {statusData.status === 'COMPLETED' ? 'SCAN COMPLETE' : 'AI ENGINE ACTIVE'}
            </div>
          )}
          <button className="rd-sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={18} />
          </button>
        </div>

        {isSidebarOpen && (
          <div className="rd-scan-info">
            <div className="rd-scan-title">Scan Details</div>
            <div className="rd-session-id">Session ID: {scanId ? scanId.substring(0, 8).toUpperCase() : 'N/A'}</div>
          </div>
        )}

        <nav className="rd-nav">
          <button
            className={`rd-nav-btn ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            <div className="rd-nav-icon"><ClipboardList size={18} /></div>
            {isSidebarOpen && <span className="rd-nav-text">PROGRESS</span>}
          </button>
          <button
            className={`rd-nav-btn ${activeTab === 'findings' ? 'active' : ''}`}
            onClick={() => setActiveTab('findings')}
          >
            <div className="rd-nav-icon"><Shield size={18} /></div>
            {isSidebarOpen && <span className="rd-nav-text">FINDINGS</span>}
          </button>
          <button
            className={`rd-nav-btn ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            <div className="rd-nav-icon"><FileText size={18} /></div>
            {isSidebarOpen && <span className="rd-nav-text">REPORT</span>}
          </button>
        </nav>

        <div className="rd-bottom-nav">
          <button className="rd-nav-btn" onClick={() => navigate('/')}>
            <div className="rd-nav-icon"><ArrowLeft size={18} /></div>
            {isSidebarOpen && <span className="rd-nav-text">DASHBOARD</span>}
          </button>
          <button className="rd-nav-btn" onClick={() => navigate('/support')}>
            <div className="rd-nav-icon"><HelpCircle size={18} /></div>
            {isSidebarOpen && <span className="rd-nav-text">SUPPORT</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="rd-main">
        <AnimatePresence mode="wait">
        {activeTab === 'progress' && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <div className="rd-header">
              <div className="rd-target">Target: <span className="rd-target-url">{targetUrl}</span></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <div className="rd-status-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="rd-status-badge">STATUS: {statusData.status}</span>
                  {['RUNNING', 'PENDING', 'VALIDATING', 'RECON', 'PLANNING', 'DISCOVERY', 'AI_PROCESSING', 'VALIDATION'].includes(statusData.status) && (
                    <button 
                      className="action-btn" 
                      style={{ color: 'var(--severity-critical)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                      onClick={handleTerminate}
                    >
                      <StopCircle size={14} /> Terminate
                    </button>
                  )}
                  <span className="rd-last-updated">Last updated: Just now</span>
                </div>
                <div className="rd-completion-row">
                  <div className="rd-completion-text">
                    SCAN COMPLETION
                    <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      ({elapsedTime})
                    </span>
                  </div>
                  <div className="rd-completion-percent">{statusData.progress_percentage}%</div>
                </div>
              </div>

              <div className="rd-progress-track">
                <div className="rd-progress-fill" style={{ width: `${statusData.progress_percentage}%` }}></div>
              </div>
            </div>

            <div className="rd-stepper">
              {allStages.map((stage, idx) => {
                const isCompleted = statusData.stages_completed.includes(stage) || statusData.status === 'COMPLETED';
                const isActive = statusData.current_stage === stage && statusData.status !== 'COMPLETED';
                return (
                  <div key={idx} className={`rd-step ${isCompleted ? 'completed' : isActive ? 'active' : 'pending'}`}>
                    <div className="rd-step-icon">
                      {isCompleted ? '✓' : isActive ? '⟳' : ''}
                    </div>
                    <div className="rd-step-label">{stage}</div>
                  </div>
                );
              })}
            </div>

            <div className="rd-findings-panel-horizontal">
              <div className="rd-findings-header-row">
                <div className="rd-findings-header">
                  <AlertCircle size={20} color="rgba(239, 68, 68, 0.8)" />
                  <h2>Findings So Far</h2>
                </div>
                <button className="rd-report-btn" onClick={() => setActiveTab('findings')}>VIEW REAL-TIME REPORT</button>
              </div>
              <div className="rd-findings-cards">
                <div className="rd-finding-card critical" onClick={() => { setSeverityFilter('CRITICAL'); setActiveTab('findings'); }} style={{ cursor: 'pointer' }}>
                  <div className="rd-finding-count">{statusData.live_findings_count?.critical || 0}</div>
                  <div>
                    <div className="rd-finding-severity">CRITICAL</div>
                    <div className="rd-finding-desc">Immediate action required</div>
                  </div>
                </div>

                <div className="rd-finding-card high" onClick={() => { setSeverityFilter('HIGH'); setActiveTab('findings'); }} style={{ cursor: 'pointer' }}>
                  <div className="rd-finding-count">{statusData.live_findings_count?.high || 0}</div>
                  <div>
                    <div className="rd-finding-severity">HIGH SEVERITY</div>
                    <div className="rd-finding-desc">Sensitive data exposure</div>
                  </div>
                </div>

                <div className="rd-finding-card medium" onClick={() => { setSeverityFilter('MEDIUM'); setActiveTab('findings'); }} style={{ cursor: 'pointer' }}>
                  <div className="rd-finding-count">{statusData.live_findings_count?.medium || 0}</div>
                  <div>
                    <div className="rd-finding-severity">MEDIUM</div>
                    <div className="rd-finding-desc">Misconfigurations detected</div>
                  </div>
                </div>
                
                <div className="rd-finding-card low" onClick={() => { setSeverityFilter('LOW'); setActiveTab('findings'); }} style={{ cursor: 'pointer' }}>
                  <div className="rd-finding-count">{statusData.live_findings_count?.low || 0}</div>
                  <div>
                    <div className="rd-finding-severity" style={{color: 'var(--severity-low)'}}>LOW</div>
                    <div className="rd-finding-desc">Best practices</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rd-recon-info-row">
              <div className="rd-stat-box">
                <div className="rd-stat-title">HOST ASSETS</div>
                <div
                  className="rd-stat-row rd-stat-row-clickable"
                  onClick={() => setSubdomainsModal(true)}
                >
                  <span>Subdomains</span>
                  <span className="rd-stat-val">{statusData.recon_summary?.subdomains?.length || 0}</span>
                </div>
              </div>
              <div className="rd-stat-box tech-profile">
                <div className="rd-stat-title">TECHNOLOGICAL PROFILE</div>
                <div className="rd-tech-pills">
                  {statusData.recon_summary?.technologies?.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No stack profile loaded yet.</span>
                  ) : (
                    statusData.recon_summary?.technologies?.map((tech, idx) => (
                      <span key={idx} className="rd-tech-pill">
                        <span className={`rd-dot ${tech.split(' ')[0].toLowerCase()}`}></span> {tech}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rd-content-grid">
              <div className="rd-left-col">
                <div className="rd-activity-stream">
                  <div className="rd-stream-header">
                    <span style={{ letterSpacing: '1px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>LIVE ACTIVITY STREAM</span>
                    <Activity size={16} color="var(--text-muted)" />
                  </div>
                  <div className="rd-terminal">
                    {statusData.log_entries.length === 0 ? (
                      <div className="rd-term-line">
                        <span className="rd-term-time">[-]</span>
                        <span className="rd-term-tag inf">INF</span>
                        <span className="rd-term-text">Waiting for scan session initialization...</span>
                      </div>
                    ) : (
                      statusData.log_entries.map((log, idx) => (
                        <div key={idx} className={`rd-term-line ${idx === statusData.log_entries.length - 1 ? 'active-line' : ''}`}>
                          <span className="rd-term-time">[{log.time}]</span>
                          <span className={`rd-term-tag ${log.tag.toLowerCase()}`}>{log.tag}</span>
                          <span className="rd-term-text">{log.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'findings' && (
          <motion.div
            key="findings"
            className="rd-findings-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rd-findings-header-top">
              <div>
                <h2>Findings: {hostname}</h2>
                <div className="rd-findings-subtitle">
                  <span className="rd-live-dot"></span> {statusData.status} Scan
                  <span className="rd-dot-divider">•</span>
                  Target: <span className="rd-target-text">{targetUrl}</span>
                </div>
              </div>

            </div>

            <div className="rd-findings-filters">
              <div className="rd-search-input">
                <Search size={16} color="var(--text-muted)" />
                <input type="text" placeholder="Search findings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <select className="rd-filter-select" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
                {severities.map(s => <option key={s} value={s}>{s === 'All Severities' ? s : s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
              <select className="rd-filter-select" value={scannerFilter} onChange={e => setScannerFilter(e.target.value)}>
                {uniqueScanners.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="rd-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="rd-findings-table-container">
              {filteredFindings.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No findings detected yet. Continue scanning to discover alerts.
                </div>
              ) : (
                <table className="rd-findings-table">
                  <thead>
                    <tr>
                      <th>SEVERITY</th>
                      <th>FINDING TITLE</th>
                      <th>SCANNER</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredFindings].sort((a, b) => {
                      const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
                      const wA = severityWeight[a.severity?.toUpperCase()] ?? -1;
                      const wB = severityWeight[b.severity?.toUpperCase()] ?? -1;
                      return wB - wA;
                    }).map((finding) => (
                        <tr key={finding.id} onClick={() => setSelectedFinding(finding)} style={{ cursor: 'pointer' }}>
                        <td><span className={`rd-sev-badge ${finding.severity.toLowerCase()}`}>{finding.severity}</span></td>
                        <td>
                          <div className="rd-finding-title">{finding.title}</div>
                          <div className="rd-finding-desc">{finding.description.substring(0, 100)}...</div>
                        </td>
                        <td className="rd-scanner-text">{finding.source_scanner}</td>
                        <td><span className="rd-status-verified"><CheckCircle size={14} /> {finding.status}</span></td>
                        <td><ChevronRight size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'report' && (
          <motion.div
            key="report"
            className="rd-report-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rd-report-header-section">
              <div>
                <div className="rd-breadcrumbs">Reports <ChevronRight size={12} /> {scanId ? scanId.substring(0, 8).toUpperCase() : 'N/A'}</div>
                <h1 className="rd-report-title">Security Audit Report</h1>
                <div className="rd-report-subtitle">Generated on {new Date().toLocaleDateString()} &bull; Target: {targetUrl}</div>
              </div>
              <div className="rd-report-actions">
                <button className="rd-action-btn" onClick={() => handleDownload('pdf')}><Download size={14} /> Download PDF</button>
                <button className="rd-action-btn" onClick={() => handleDownload('json')}><Code size={14} /> JSON Export</button>
              </div>
            </div>

            <div className="rd-report-row-top">
              <div className="rd-card executive-summary-card">
                <div className="rd-card-header">
                  <h2>Executive Summary</h2>
                  <div className={`rd-high-risk-badge ${statusData.live_findings_count?.critical > 0 ? 'high-risk' : ''}`}>
                    <div className="rd-dots"><span className="dot"></span><span className="dot"></span></div>
                    {statusData.live_findings_count?.critical > 0 ? 'HIGH RISK' : 'STABLE'}
                  </div>
                </div>
                <p className="rd-summary-text">
                  The automated security assessment of <span className="rd-highlight">{hostname}</span> has identified {findings.length} total findings. Of primary concern are {statusData.live_findings_count?.critical} critical vulnerabilities. Immediate remediation is highly recommended.
                </p>
                <div className="rd-summary-stats">
                  <div className="rd-stat">
                    <div className="rd-stat-label">TOTAL FINDINGS</div>
                    <div className="rd-stat-value">{findings.length}</div>
                  </div>
                  <div className="rd-stat">
                    <div className="rd-stat-label">CRITICALITIES</div>
                    <div className="rd-stat-value critical">{statusData.live_findings_count?.critical}</div>
                  </div>
                  <div className="rd-stat">
                    <div className="rd-stat-label">REMEDIATION ETA</div>
                    <div className="rd-stat-value cyan">7 Days</div>
                  </div>
                </div>
              </div>

              <div className="rd-card target-identity-card">
                <div className="rd-card-header">
                  <h3 className="rd-card-title-small">TARGET IDENTITY</h3>
                </div>
                <div className="rd-identity-item">
                  <div className="rd-identity-label">PRIMARY DOMAIN</div>
                  <div className="rd-identity-value">{hostname}</div>
                </div>
                <div className="rd-identity-item">
                  <div className="rd-identity-label">ENVIRONMENT</div>
                  <div className="rd-identity-value">Development/Staging Infrastructure</div>
                </div>
                <div className="rd-identity-item">
                  <div className="rd-identity-label">IP ADDRESSES</div>
                  <div className="rd-identity-value">{statusData.recon_summary?.dns_records?.A?.join(', ') || '127.0.0.1'}</div>
                </div>
                <div className="rd-identity-item">
                  <div className="rd-identity-label">COMPLIANCE SCOPE</div>
                  <div className="rd-compliance-badges">
                    <span className="rd-comp-badge">SOC2</span>
                    <span className="rd-comp-badge">GDPR</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rd-report-row-bottom">
              <div className="rd-card severity-card">
                <div className="rd-card-header">
                  <h2>Severity Breakdown</h2>
                </div>
                <div className="rd-severity-content">
                  <div className="rd-donut-chart-placeholder">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Critical', value: statusData.live_findings_count?.critical || 0, color: '#fca5a5' },
                            { name: 'High', value: statusData.live_findings_count?.high || 0, color: '#fdba74' },
                            { name: 'Medium', value: statusData.live_findings_count?.medium || 0, color: '#06b6d4' },
                            { name: 'Low', value: statusData.live_findings_count?.low || 0, color: '#94a3b8' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {
                            [
                              { name: 'Critical', value: statusData.live_findings_count?.critical || 0, color: '#fca5a5' },
                              { name: 'High', value: statusData.live_findings_count?.high || 0, color: '#fdba74' },
                              { name: 'Medium', value: statusData.live_findings_count?.medium || 0, color: '#06b6d4' },
                              { name: 'Low', value: statusData.live_findings_count?.low || 0, color: '#94a3b8' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))
                          }
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="rd-donut-center">
                      <div className="rd-donut-total">{findings.length}</div>
                      <div className="rd-donut-label">TOTAL</div>
                    </div>
                  </div>
                  <div className="rd-severity-legend">
                    <div className="rd-legend-item"><span className="rd-dot critical"></span> Critical ({statusData.live_findings_count?.critical})</div>
                    <div className="rd-legend-item"><span className="rd-dot high"></span> High ({statusData.live_findings_count?.high})</div>
                    <div className="rd-legend-item"><span className="rd-dot medium"></span> Medium ({statusData.live_findings_count?.medium})</div>
                    <div className="rd-legend-item"><span className="rd-dot low"></span> Low ({statusData.live_findings_count?.low})</div>
                  </div>
                </div>
              </div>

              <div className="rd-card categories-card">
                <div className="rd-card-header">
                  <h2>Vulnerability Categories</h2>
                </div>
                <div className="rd-categories-list">
                  <div className="rd-category-item">
                    <div className="rd-category-header">
                      <span>INJECTION</span>
                      <span>{statusData.live_findings_count?.critical > 0 ? '100%' : '0%'}</span>
                    </div>
                    <div className="rd-progress-bar"><div className="rd-progress-fill purple" style={{ width: statusData.live_findings_count?.critical > 0 ? '100%' : '0%' }}></div></div>
                  </div>
                  <div className="rd-category-item">
                    <div className="rd-category-header">
                      <span>BROKEN AUTH</span>
                      <span>0%</span>
                    </div>
                    <div className="rd-progress-bar"><div className="rd-progress-fill cyan" style={{ width: '0%' }}></div></div>
                  </div>
                  <div className="rd-category-item">
                    <div className="rd-category-header">
                      <span>SENSITIVE DATA</span>
                      <span>{statusData.live_findings_count?.high > 0 ? '100%' : '0%'}</span>
                    </div>
                    <div className="rd-progress-bar"><div className="rd-progress-fill purple" style={{ width: statusData.live_findings_count?.high > 0 ? '100%' : '0%' }}></div></div>
                  </div>
                  <div className="rd-category-item">
                    <div className="rd-category-header">
                      <span>MISCONFIGURATION</span>
                      <span>{statusData.live_findings_count?.medium > 0 ? '100%' : '0%'}</span>
                    </div>
                    <div className="rd-progress-bar"><div className="rd-progress-fill blue" style={{ width: statusData.live_findings_count?.medium > 0 ? '100%' : '0%' }}></div></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rd-section-header">
              <h2 className="rd-section-title">Technical Reconnaissance</h2>
            </div>

            <div className="rd-recon-grid">
              <div className="rd-recon-card" onClick={() => setSelectedReconCard("DNS Records")} style={{ cursor: 'pointer' }}>
                <div className="rd-recon-header">
                  <Server size={14} /> DNS RECORDS
                </div>
                <table className="rd-recon-table">
                  <tbody>
                    {Object.entries(statusData.recon_summary?.dns_records || {}).slice(0, 3).map(([key, val]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{val.join(', ')}</td>
                      </tr>
                    ))}
                    {Object.keys(statusData.recon_summary?.dns_records || {}).length > 3 && (
                      <tr>
                        <td colSpan="2" style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: '600', paddingTop: '0.5rem' }}>
                          + {Object.keys(statusData.recon_summary.dns_records).length - 3} more records
                        </td>
                      </tr>
                    )}
                    {Object.keys(statusData.recon_summary?.dns_records || {}).length === 0 && (
                      <tr><td colSpan="2" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No DNS records loaded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rd-recon-card" onClick={() => setSelectedReconCard("Subdomains")} style={{ cursor: 'pointer' }}>
                <div className="rd-recon-header">
                  <Network size={14} /> SUBDOMAINS
                </div>
                <div className="rd-recon-list">
                  {statusData.recon_summary?.subdomains?.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No subdomains loaded</div>
                  ) : (
                    <>
                      {statusData.recon_summary?.subdomains?.slice(0, 3).map((sub, idx) => <div key={idx}>{sub}</div>)}
                      {statusData.recon_summary?.subdomains?.length > 3 && (
                        <div style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.5rem' }}>
                          + {statusData.recon_summary.subdomains.length - 3} more subdomains
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="rd-recon-card" onClick={() => setSelectedReconCard("Tech Stack")} style={{ cursor: 'pointer' }}>
                <div className="rd-recon-header">
                  <Layers size={14} /> TECH STACK
                </div>
                <div className="rd-recon-stack">
                  {statusData.recon_summary?.technologies?.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No stack information loaded</div>
                  ) : (
                    <>
                      {statusData.recon_summary?.technologies?.slice(0, 3).map((tech, idx) => (
                        <div key={idx} className="rd-recon-badge">{tech}</div>
                      ))}
                      {statusData.recon_summary?.technologies?.length > 3 && (
                        <div style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: '600', width: '100%', marginTop: '0.5rem' }}>
                          + {statusData.recon_summary.technologies.length - 3} more technologies
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="rd-recon-card" onClick={() => setSelectedReconCard("Open Ports")} style={{ cursor: 'pointer' }}>
                <div className="rd-recon-header">
                  <Terminal size={14} /> OPEN PORTS
                </div>
                <table className="rd-recon-table">
                  <tbody>
                    {statusData.recon_summary?.ports?.length === 0 ? (
                      <tr><td style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No ports discovered yet</td></tr>
                    ) : (
                      <>
                        {statusData.recon_summary?.ports?.slice(0, 3).map((portInfo, idx) => (
                          <tr key={idx}>
                            <td>{portInfo.port}</td>
                            <td className="rd-recon-status open">{portInfo.status}</td>
                          </tr>
                        ))}
                        {statusData.recon_summary?.ports?.length > 3 && (
                          <tr>
                            <td colSpan="2" style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: '600', paddingTop: '0.5rem' }}>
                              + {statusData.recon_summary.ports.length - 3} more ports
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* VULNERABILITY DETAIL MODAL */}
      {selectedFinding && (
        <div className="rd-modal-overlay" onClick={() => setSelectedFinding(null)}>
          <div className="rd-vuln-modal" onClick={e => e.stopPropagation()}>
            <div className="rd-modal-header">
              <div className="rd-modal-title">
                <Bug size={18} color="var(--severity-critical)" />
                <span>Vulnerability Details</span>
              </div>
              <button className="rd-modal-close" onClick={() => setSelectedFinding(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="rd-vuln-modal-meta">
              <span className={`rd-sev-badge ${selectedFinding.severity.toLowerCase()}`}>{selectedFinding.severity} SEVERITY</span>
              <span className="rd-vuln-cve">{selectedFinding.cve_id || 'No CVE ID'}</span>
              <span className="rd-vuln-scanner">via {selectedFinding.source_scanner}</span>
            </div>

            <div className="rd-vuln-modal-body">
              <h2 className="rd-vuln-title">{selectedFinding.title}</h2>

              <div className="rd-vuln-section">
                <div className="rd-vuln-section-label">DESCRIPTION</div>
                <p className="rd-vuln-desc">{selectedFinding.description}</p>
              </div>

              {selectedFinding.evidence && Object.keys(selectedFinding.evidence).length > 0 && (
                <div className="rd-vuln-section">
                  <div className="rd-vuln-section-label">EVIDENCE (REQUEST / RESPONSE)</div>
                  <div className="rd-code-block">
                    <pre style={{ color: '#38bdf8', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                      {typeof selectedFinding.evidence === 'string'
                        ? selectedFinding.evidence
                        : selectedFinding.evidence.request
                          ? `${selectedFinding.evidence.request}\n\n${selectedFinding.evidence.response}`
                          : JSON.stringify(selectedFinding.evidence, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="rd-remediation-card">
                <div className="rd-remediation-header">
                  <Sparkles size={15} />
                  AI REMEDIATION STEPS
                </div>
                <p className="rd-remediation-text">
                  {selectedFinding.remediation || 'Review input sanitization guidelines and ensure proper parameter filtering/escaping.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECON DETAILS MODAL */}
      {selectedReconCard && (
        <div className="rd-modal-overlay" onClick={() => setSelectedReconCard(null)}>
          <div className="rd-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="rd-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {selectedReconCard === "DNS Records" && <Server size={20} color="var(--accent-primary)" />}
                {selectedReconCard === "Subdomains" && <Network size={20} color="var(--accent-secondary)" />}
                {selectedReconCard === "Tech Stack" && <Layers size={20} color="var(--accent-primary)" />}
                {selectedReconCard === "Open Ports" && <Terminal size={20} color="var(--severity-critical)" />}
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f1f5f9' }}>{selectedReconCard} Detailed View</h3>
              </div>
              <button className="rd-modal-close" onClick={() => setSelectedReconCard(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="rd-modal-body">
              {selectedReconCard === "DNS Records" && (
                <table className="rd-recon-table modal-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>Type</th>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(statusData.recon_summary?.dns_records || {}).map(([key, val]) => (
                      <tr key={key}>
                        <td style={{ fontWeight: '600', padding: '0.75rem 0' }}>{key}</td>
                        <td style={{ padding: '0.75rem 0', color: 'var(--text-muted)' }}>{val.join(', ')}</td>
                      </tr>
                    ))}
                    {Object.keys(statusData.recon_summary?.dns_records || {}).length === 0 && (
                      <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No DNS records loaded</td></tr>
                    )}
                  </tbody>
                </table>
              )}

              {selectedReconCard === "Subdomains" && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Found {statusData.recon_summary?.subdomains?.length || 0} subdomains:
                  </div>
                  {statusData.recon_summary?.subdomains?.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>No subdomains loaded</div>
                  ) : (
                    statusData.recon_summary?.subdomains?.map((sub, idx) => (
                      <div key={idx} className="rd-recon-badge" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span>{sub}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>active</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedReconCard === "Tech Stack" && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Identified technology stack components:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {statusData.recon_summary?.technologies?.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)' }}>No stack information loaded</div>
                    ) : (
                      statusData.recon_summary?.technologies?.map((tech, idx) => (
                        <div key={idx} className="rd-recon-badge" style={{ padding: '0.75rem 1rem', fontSize: '0.95rem' }}>{tech}</div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {selectedReconCard === "Open Ports" && (
                <table className="rd-recon-table modal-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>Port</th>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusData.recon_summary?.ports?.length === 0 ? (
                      <tr><td style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No ports discovered yet</td></tr>
                    ) : (
                      statusData.recon_summary?.ports?.map((portInfo, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '0.75rem 0', fontWeight: '600' }}>{portInfo.port}</td>
                          <td style={{ padding: '0.75rem 0' }} className="rd-recon-status open">{portInfo.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {/* SUBDOMAINS MODAL */}
      {subdomainsModal && (
        <div className="rd-modal-overlay" onClick={() => setSubdomainsModal(false)}>
          <div className="rd-modal" onClick={e => e.stopPropagation()}>
            <div className="rd-modal-header">
              <div className="rd-modal-title">
                <Network size={18} color="#06b6d4" />
                <span>Discovered Subdomains</span>
              </div>
              <button className="rd-modal-close" onClick={() => setSubdomainsModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="rd-modal-meta">
              <span className="rd-modal-badge">{statusData.recon_summary?.subdomains?.length || 0} subdomains found</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Target: {targetUrl}</span>
            </div>
            <div className="rd-modal-body">
              {statusData.recon_summary?.subdomains?.length > 0 ? (
                <ul className="rd-modal-subdomain-list">
                  {statusData.recon_summary.subdomains.map((sub, idx) => (
                    <li key={idx} className="rd-modal-subdomain-item">
                      <span className="rd-modal-subdomain-index">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="rd-modal-subdomain-text">{sub}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rd-modal-empty">
                  <Network size={32} color="#334155" />
                  <p>No subdomains discovered during reconnaissance.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
