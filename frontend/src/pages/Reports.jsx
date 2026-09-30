import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Share2, FileJson, CheckCircle, AlertCircle, FileCheck, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Pagination from '../components/Pagination';

export default function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    axios.get('/scans')
      .then(res => {
        const completed = res.data.filter(s => s.status === 'COMPLETED').map(s => ({
          id: s.id,
          target: s.target,
          type: s.target.includes("api") ? 'API Security Audit' : 'Full Penetration Assessment',
          date: s.date || 'Recent',
          size: '~1.8 MB',
          status: 'Ready'
        }));
        setReports(completed);
      })
      .catch(err => console.error("Error fetching completed scans:", err));
  }, []);

  const handleDownloadPDF = async (report) => {
    try {
      const response = await axios.get(`/scans/${report.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `security_assessment_report_${report.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('PDF report downloaded successfully');
    } catch {
      showToast('PDF report not yet available for this scan', 'error');
    }
  };

  const handleDownloadJSON = async (report) => {
    try {
      const response = await axios.get(`/scans/${report.id}/json`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `security_assessment_report_${report.id}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('JSON export downloaded successfully');
    } catch {
      showToast('JSON export not yet available for this scan', 'error');
    }
  };

  const handleShare = (report) => {
    const shareUrl = `${window.location.origin}/report/active?scanId=${report.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => showToast('Direct report telemetry link copied to clipboard!'))
      .catch(() => showToast('Could not copy link', 'error'));
  };

  const currentData = reports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="dashboard">
      {/* Inline Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          background: toast.type === 'error' ? 'var(--severity-critical-bg)' : 'rgba(0, 210, 255, 0.15)',
          border: `1px solid ${toast.type === 'error' ? 'var(--severity-critical-border)' : 'var(--accent-secondary)'}`,
          color: toast.type === 'error' ? 'var(--severity-critical)' : 'var(--accent-secondary)',
          padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.875rem', fontWeight: 600,
          backdropFilter: 'blur(12px)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <div className="dashboard-header-title">
            <FileText size={26} color="var(--accent-primary)" />
            <h1>Assessment Reports</h1>
          </div>
          <p>Export executive summaries, CVSS compliance breakdowns, and developer remediation artifacts.</p>
        </div>
      </div>

      <div className="scans-card">
        <table className="scans-table">
          <thead>
            <tr>
              <th>Target Scope</th>
              <th>Report Classification</th>
              <th>Generation Date</th>
              <th>Artifact Payload</th>
              <th style={{ textAlign: 'right' }}>Export Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3.5rem' }}>
                  No completed assessment reports available yet. Run a scan to generate one.
                </td>
              </tr>
            ) : (
              currentData.map((report, i) => (
                <tr key={report.id || i}>
                  <td>
                    <div className="target-info">
                      <div className="target-icon">
                        <FileCheck size={18} />
                      </div>
                      <div>
                        <div className="target-name">{report.target}</div>
                        <div className="target-id font-mono">ID: {report.id?.slice(0, 10)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      {report.type}
                    </span>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{report.date}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: '600' }}>
                      PDF & JSON ({report.size})
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', alignItems: 'center' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        title="View Interactive Report"
                        onClick={() => navigate('/report/active', { state: { scanId: report.id, target: report.target } })}
                      >
                        <Eye size={14} /> View
                      </button>
                      <button
                        className="action-btn"
                        title="Download PDF Document"
                        onClick={() => handleDownloadPDF(report)}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="action-btn"
                        title="Export Raw JSON"
                        onClick={() => handleDownloadJSON(report)}
                      >
                        <FileJson size={16} />
                      </button>
                      <button
                        className="action-btn"
                        title="Copy Share Link"
                        onClick={() => handleShare(report)}
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="table-footer">
          <div>
            Showing {reports.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, reports.length)} of {reports.length} report{reports.length !== 1 ? 's' : ''}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={reports.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
