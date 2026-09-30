import React, { useState, useEffect, useRef } from 'react'
import { Server, Globe, ShieldOff, Clock, Router, BarChart2, StopCircle, Download, RotateCcw, MoreVertical, Activity, AlertTriangle, Sparkles, Rocket, Radio, Eye, Filter, ArrowUpDown, ChevronDown } from 'lucide-react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import Pagination from '../components/Pagination'

export default function Scans() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleDownloadPDF = async (scanId) => {
    try {
      const response = await axios.get(`/scans/${scanId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scan_report_${scanId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
      alert('Report PDF not yet generated for this assessment.');
    }
  };

  const queryParams = new URLSearchParams(location.search);
  const filter = queryParams.get('filter');
  const q = queryParams.get('q');
  const defaultDate = filter === '7days' ? 'Last 7 Days' : 'Last 30 Days';
  const [scans, setScans] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [dateFilter, setDateFilter] = useState(defaultDate);
  const [advancedFilter, setAdvancedFilter] = useState('Newest First');
  const statusRef = useRef(null);
  const dateRef = useRef(null);
  const advancedRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (statusRef.current && !statusRef.current.contains(event.target)) setStatusOpen(false);
      if (dateRef.current && !dateRef.current.contains(event.target)) setDateOpen(false);
      if (advancedRef.current && !advancedRef.current.contains(event.target)) setAdvancedOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTerminateScan = async (scanId) => {
    if (!window.confirm("Terminate this running scan?")) return;
    try {
      await axios.post(`/scans/${scanId}/terminate`);
      const res = await axios.get('/scans');
      setScans(res.data);
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { title: 'Scan Aborted', message: `Assessment ${scanId} was stopped` }
      }));
    } catch (err) {
      console.error("Failed to terminate scan", err);
    }
  };

  useEffect(() => {
    axios.get('/scans')
      .then(res => {
        setScans(res.data);
      })
      .catch(err => {
        console.error("Error fetching scans:", err);
      });
  }, []);

  const getIcon = (target) => {
    if (!target) return <Globe size={18} />;
    if (target.includes("api") || target.includes("prod")) return <Server size={18} />;
    if (target.includes("edge") || target.includes("router")) return <Router size={18} />;
    if (target.includes("staging")) return <ShieldOff size={18} />;
    if (target.includes("gateway")) return <Clock size={18} />;
    return <Globe size={18} />;
  };

  const filteredScans = scans.filter(scan => {
    let matchesSearch = true;
    if (q) {
      const lowerQ = q.toLowerCase();
      matchesSearch = (
        (scan.target && scan.target.toLowerCase().includes(lowerQ)) ||
        (scan.id && scan.id.toLowerCase().includes(lowerQ)) ||
        (scan.status && scan.status.toLowerCase().includes(lowerQ))
      );
    }
    
    if (!matchesSearch) return false;
    
    if (statusFilter !== 'All Statuses') {
      const isRunning = ['RUNNING', 'PENDING', 'VALIDATING', 'RECON', 'PLANNING', 'DISCOVERY', 'AI_PROCESSING', 'VALIDATION'].includes(scan.status);
      if (statusFilter === 'Running' && !isRunning) return false;
      if (statusFilter === 'Completed' && scan.status !== 'COMPLETED') return false;
    }
    
    return true;
  }).sort((a, b) => {
    if (advancedFilter === 'Highest Critical First') {
      const critA = a.critical_count ?? a.critical ?? 0;
      const critB = b.critical_count ?? b.critical ?? 0;
      if (critB !== critA) return critB - critA;
    } else if (advancedFilter === 'Highest High First') {
      const highA = a.high_count ?? a.high ?? 0;
      const highB = b.high_count ?? b.high ?? 0;
      if (highB !== highA) return highB - highA;
    } else if (advancedFilter === 'Oldest First') {
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    }
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [q, statusFilter, dateFilter, advancedFilter]);

  const currentData = filteredScans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const activeScansCount = scans.filter(s => !['COMPLETED', 'FAILED', 'TERMINATED'].includes(s.status)).length;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-header-title">
            <Radio size={26} color="var(--accent-secondary)" />
            <h1>Assessment Registry</h1>
            {activeScansCount > 0 && (
              <span className="engine-status-pill" style={{ color: 'var(--accent-secondary)', borderColor: 'var(--accent-secondary)' }}>
                <span className="status-dot-pulse"></span> {activeScansCount} Active Operation{activeScansCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p>Comprehensive audit log and telemetry history of all penetration testing sessions.</p>
        </div>

        {/* Action Controls & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Status Filter Dropdown */}
          <div className="filter-group" ref={statusRef} style={{ position: 'relative' }}>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.825rem', padding: '0.5rem 0.9rem' }}
              onClick={() => setStatusOpen(!statusOpen)}
            >
              <Filter size={14} />
              <span>Status: <strong style={{ color: 'var(--text-primary)' }}>{statusFilter}</strong></span>
              <ChevronDown size={14} />
            </button>
            
            {statusOpen && (
              <div className="profile-menu" style={{ top: '100%', left: 0, right: 'auto', width: '180px' }}>
                {['All Statuses', 'Running', 'Completed'].map(opt => (
                  <div key={opt} className="profile-menu-item" onClick={() => {
                    setStatusFilter(opt);
                    setStatusOpen(false);
                  }}>
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Date Filter Dropdown */}
          <div className="filter-group" ref={dateRef} style={{ position: 'relative' }}>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.825rem', padding: '0.5rem 0.9rem' }}
              onClick={() => setDateOpen(!dateOpen)}
            >
              <Clock size={14} />
              <span>{dateFilter}</span>
              <ChevronDown size={14} />
            </button>
            
            {dateOpen && (
              <div className="profile-menu" style={{ top: '100%', left: 0, right: 'auto', width: '180px' }}>
                {['Last 30 Days', 'Last 7 Days'].map(opt => (
                  <div key={opt} className="profile-menu-item" onClick={() => {
                    setDateFilter(opt);
                    setDateOpen(false);
                  }}>
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sort Menu */}
          <div className="filter-group" ref={advancedRef} style={{ position: 'relative' }}>
            <button 
              className="btn-secondary"
              style={{ fontSize: '0.825rem', padding: '0.5rem 0.9rem' }}
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <ArrowUpDown size={14} />
              <span>Sort</span>
            </button>
            
            {advancedOpen && (
              <div className="profile-menu" style={{ top: '100%', right: 0, width: '210px' }}>
                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                  SORT CRITERIA
                </div>
                {['Newest First', 'Oldest First', 'Highest Critical First', 'Highest High First'].map(opt => (
                  <div key={opt} className="profile-menu-item" onClick={() => {
                    setAdvancedFilter(opt);
                    setAdvancedOpen(false);
                  }}>
                    <span>{opt}</span>
                    {advancedFilter === opt && <span style={{ color: 'var(--accent-secondary)' }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link to="/scan/new">
            <button className="btn-primary" style={{ fontSize: '0.85rem' }}>
              <Rocket size={15} /> Launch Scan
            </button>
          </Link>
        </div>
      </div>

      {/* Scans Data Grid */}
      <div className="scans-card">
        <table className="scans-table">
          <thead>
            <tr>
              <th>Target Asset</th>
              <th>Status</th>
              <th>Findings (Crit / High)</th>
              <th>Date & Profile</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredScans.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3.5rem' }}>
                  {q ? `No assessments match query "${q}"` : 'No scans found in this registry view.'}
                </td>
              </tr>
            ) : currentData.map((scan, i) => {
              const isRunning = !['COMPLETED', 'FAILED', 'TERMINATED'].includes(scan.status);
              const crit = scan.critical_count ?? scan.critical ?? 0;
              const high = scan.high_count ?? scan.high ?? 0;

              return (
                <tr key={scan.id || i}>
                  <td>
                    <div className="target-info">
                      <div className="target-icon">
                        {getIcon(scan.target)}
                      </div>
                      <div>
                        <div className="target-name">{scan.target}</div>
                        <div className="target-id font-mono">ID: {scan.id?.slice(0, 12)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${scan.status ? scan.status.toLowerCase() : 'completed'}`}>
                      {isRunning && <span className="status-dot-pulse"></span>}
                      {scan.status || 'COMPLETED'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {crit > 0 && <span className="severity-pill critical">{crit} Critical</span>}
                      {high > 0 && <span className="severity-pill high">{high} High</span>}
                      {crit === 0 && high === 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {scan.status === 'COMPLETED' ? '0 High / Crit' : '-'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{scan.date || 'Recent'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{scan.profile || 'Full Audit'}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        title="View Live Telemetry / Report"
                        onClick={() => navigate('/report/active', { state: { scanId: scan.id, target: scan.target } })}
                      >
                        <Eye size={14} /> Report
                      </button>
                      <button
                        className="action-btn"
                        title="Download PDF"
                        onClick={() => handleDownloadPDF(scan.id)}
                      >
                        <Download size={16} />
                      </button>
                      {isRunning && (
                        <button
                          className="action-btn danger"
                          title="Abort Scan"
                          onClick={() => handleTerminateScan(scan.id)}
                        >
                          <StopCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Table Pagination Footer */}
        <div className="table-footer">
          <div>
            Showing {filteredScans.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredScans.length)} of {filteredScans.length} assessments
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredScans.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
