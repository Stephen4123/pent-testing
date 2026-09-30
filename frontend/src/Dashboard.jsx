import React, { useState, useEffect } from 'react'
import { AlertTriangle, BarChart2, Target, Timer, PieChart as PieChartIcon, Activity, History, Globe, Server, Wifi, Filter, Download, Calendar, StopCircle, Shield, ShieldCheck, ShieldAlert, ArrowUpRight, Zap, Play, Eye, ChevronRight, Radio } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import axios from 'axios'

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_scans: 0,
    active_scans: 0,
    critical_findings: 0,
    avg_scan_time: '0m',
    severity_breakdown: [
      { name: 'Critical', value: 0, color: 'var(--severity-critical)' },
      { name: 'High', value: 0, color: 'var(--severity-high)' },
      { name: 'Medium', value: 0, color: 'var(--severity-medium)' },
      { name: 'Low', value: 0, color: 'var(--severity-low)' },
    ],
    recent_scans: [],
    activity_data: []
  });
  const [activeScansList, setActiveScansList] = useState([]);

  useEffect(() => {
    const fetchStats = () => {
      axios.get('/dashboard/stats')
        .then(res => {
          setStats(res.data);
        })
        .catch(err => {
          console.error("Error fetching stats:", err);
        });

      axios.get('/scans')
        .then(res => {
          const active = res.data.filter(s => !['COMPLETED', 'FAILED', 'TERMINATED'].includes(s.status));
          setActiveScansList(active);
        })
        .catch(err => console.error("Error fetching active scans:", err));
    };

    fetchStats();
    const interval = setInterval(fetchStats, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleTerminateDashboard = async (scanId) => {
    if (!window.confirm("Are you sure you want to terminate this scan?")) return;
    try {
      await axios.post(`/scans/${scanId}/terminate`);
      setActiveScansList(prev => prev.filter(s => s.id !== scanId));
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { title: 'Scan Terminated', message: `Scan ${scanId} was stopped` }
      }));
    } catch(err) { 
      console.error(err); 
    }
  };

  const severityData = stats.severity_breakdown || [];
  const totalFindings = severityData.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const activityData = stats.activity_data && stats.activity_data.length > 0 ? stats.activity_data : [
    { name: 'Mon', count: 2 },
    { name: 'Tue', count: 5 },
    { name: 'Wed', count: 3 },
    { name: 'Thu', count: 7 },
    { name: 'Fri', count: 4 },
    { name: 'Sat', count: 6 },
    { name: 'Sun', count: 8 },
  ];
  const recentScans = stats.recent_scans || [];

  // Calculate Health / Security Posture Rating
  const criticalCount = severityData.find(s => s.name === 'Critical')?.value || 0;
  const highCount = severityData.find(s => s.name === 'High')?.value || 0;
  let securityScore = 100 - (criticalCount * 18) - (highCount * 7);
  if (securityScore < 20) securityScore = 20;
  if (totalFindings === 0) securityScore = 98;

  const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-light)',
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(10px)',
          zIndex: 100
        }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{label || payload[0].name}</p>
          <p style={{ margin: '0.25rem 0 0 0', color: payload[0].payload.color || 'var(--accent-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
            {payload[0].name ? 'Vulnerabilities' : 'Scans Conducted'}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <div className="dashboard-header-title">
            <h1>Security Operations Dashboard</h1>
          </div>
          <p>Real-time telemetry, threat landscape overview, and automated vulnerability intelligence.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/scans?filter=7days">
            <button className="btn-secondary" style={{ fontSize: '0.85rem' }}>
              <Calendar size={15} /> Last 7 Days
            </button>
          </Link>
          <Link to="/scan/new">
            <button className="btn-primary">
              <Zap size={16} /> New Assessment
            </button>
          </Link>
        </div>
      </div>

      {/* Hero Posture Banner */}
      <div className="posture-banner">
        <div className="posture-left">
          <div className="posture-badge-icon">
            <ShieldCheck size={30} />
          </div>
          <div className="posture-details">
            <h3>Enterprise Posture Rating: {securityScore}/100</h3>
            <p>
              {criticalCount > 0 
                ? `Immediate Attention: ${criticalCount} Critical vulnerabilities discovered across targets.`
                : 'All automated surface discovery tests passing within acceptable thresholds.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vulnerability Index</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: criticalCount > 0 ? 'var(--severity-critical)' : 'var(--severity-low)', fontFamily: 'JetBrains Mono' }}>
              {criticalCount > 0 ? 'HIGH RISK' : 'HEALTHY'}
            </div>
          </div>
        </div>
      </div>

      {/* 4-Column KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Assessments</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
              <Target size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.total_scans || 0}</div>
          <div className="stat-card-subtext">
            <span style={{ color: 'var(--severity-low)', fontWeight: '600' }}>Active scope</span> across internal & public assets
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Active Operations</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(0, 210, 255, 0.15)', color: 'var(--accent-secondary)' }}>
              <Radio size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: stats.active_scans > 0 ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>
            {stats.active_scans || 0}
          </div>
          <div className="stat-card-subtext">
            {stats.active_scans > 0 ? (
              <span style={{ color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="status-dot-pulse"></span> Running real-time probes
              </span>
            ) : (
              <span>Engine idle and standby ready</span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Critical Findings</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(255, 51, 102, 0.15)', color: 'var(--severity-critical)' }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: (stats.critical_findings || 0) > 0 ? 'var(--severity-critical)' : 'var(--text-primary)' }}>
            {stats.critical_findings || 0}
          </div>
          <div className="stat-card-subtext">
            <span>CVSS Score &ge; 9.0 exploits</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Mean Scan Velocity</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(255, 196, 0, 0.15)', color: 'var(--severity-medium)' }}>
              <Timer size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.avg_scan_time || '0m'}</div>
          <div className="stat-card-subtext">
            <span>Automated reconnaissance & fuzzing</span>
          </div>
        </div>
      </div>

      {/* Live Active Scans Monitor Feed */}
      {activeScansList.length > 0 && (
        <div className="active-scans-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div className="status-dot-pulse"></div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Live Target Assessments In Progress ({activeScansList.length})
            </h3>
          </div>
          {activeScansList.map((scan) => (
            <div key={scan.id} className="active-scan-radar-card">
              <div className="active-scan-info">
                <div className="target-icon">
                  <Globe size={18} />
                </div>
                <div>
                  <div className="active-scan-target">{scan.target}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <span className="active-scan-stage">
                      <Zap size={12} /> {scan.status || 'SCANNING'}
                    </span>
                    <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>ID: {scan.id?.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  className="btn-secondary"
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                  onClick={() => navigate('/report/active', { state: { scanId: scan.id, target: scan.target } })}
                >
                  <Eye size={14} /> View Telemetry
                </button>
                <button
                  className="btn-danger"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => handleTerminateDashboard(scan.id)}
                >
                  <StopCircle size={14} /> Abort
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Charts Grid */}
      <div className="dashboard-grid">
        {/* Activity Trend Chart */}
        <div className="widget-card">
          <div className="widget-header">
            <div className="widget-title">
              <Activity size={18} color="var(--accent-secondary)" />
              <span>Assessment Activity Volume</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Past 7 Days</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke="var(--accent-secondary)" strokeWidth={3} fillOpacity={1} fill="url(#activityGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution Donut Chart */}
        <div className="widget-card">
          <div className="widget-header">
            <div className="widget-title">
              <PieChartIcon size={18} color="var(--accent-primary)" />
              <span>Severity Breakdown</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
              {totalFindings} TOTAL
            </span>
          </div>

          <div style={{ width: '100%', height: 160, position: 'relative' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={severityData.length > 0 && totalFindings > 0 ? severityData : [{ name: 'None', value: 1, color: 'var(--bg-surface-elevated)' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-surface)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{totalFindings}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vulnerabilities</div>
            </div>
          </div>

          <div className="severity-legend">
            {severityData.map((item, index) => (
              <div key={index} className="severity-legend-item">
                <div className="severity-legend-label">
                  <div className="severity-bullet" style={{ backgroundColor: item.color }}></div>
                  <span>{item.name}</span>
                </div>
                <span className="severity-count-badge" style={{ color: item.color, backgroundColor: 'var(--bg-primary)' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="scans-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={18} color="var(--accent-secondary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Recent Assessment Runs</h3>
          </div>
          <Link to="/scans" style={{ color: 'var(--accent-secondary)', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View Full Registry <ChevronRight size={15} />
          </Link>
        </div>

        <table className="scans-table">
          <thead>
            <tr>
              <th>Target Asset</th>
              <th>Status</th>
              <th>Date & Time</th>
              <th>Critical / High</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentScans.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  No security assessments conducted yet. Click "New Assessment" to begin.
                </td>
              </tr>
            ) : (
              recentScans.slice(0, 5).map((scan, index) => (
                <tr key={index}>
                  <td>
                    <div className="target-info">
                      <div className="target-icon">
                        <Globe size={18} />
                      </div>
                      <div>
                        <div className="target-name">{scan.target}</div>
                        <div className="target-id">Profile: {scan.profile || 'Full Audit'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${scan.status ? scan.status.toLowerCase() : 'completed'}`}>
                      {scan.status || 'COMPLETED'}
                    </span>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{scan.date || 'Today'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <span className="severity-pill critical">
                        {scan.critical_count ?? (scan.status === 'COMPLETED' ? '0' : '-')}
                      </span>
                      <span className="severity-pill high">
                        {scan.high_count ?? (scan.status === 'COMPLETED' ? '0' : '-')}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => navigate('/report/active', { state: { scanId: scan.id, target: scan.target } })}
                    >
                      <Eye size={14} /> Report
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
