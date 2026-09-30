import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Server, Shield, Trash2, Ban, CheckCircle, Plus, ShieldAlert, Radio, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import './AdminPanel.css';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [scans, setScans] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', is_admin: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await axios.get('/admin/users', getAuthHeader());
        setUsers(res.data);
      } else {
        const res = await axios.get('/admin/scans', getAuthHeader());
        setScans(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin data', err);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/admin/users', newUser, getAuthHeader());
      setNewUser({ username: '', email: '', password: '', is_admin: false });
      fetchData();
      window.dispatchEvent(new CustomEvent('showToast', { detail: { title: 'User Enrolled', message: 'New security operator account created successfully' } }));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.patch(`/admin/users/${userId}/status`, { is_active: !currentStatus }, getAuthHeader());
      fetchData();
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      await axios.delete(`/admin/users/${userId}`, getAuthHeader());
      fetchData();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleTerminateScan = async (scanId) => {
    if (!window.confirm("Are you sure you want to terminate this running scan?")) return;
    try {
      await axios.post(`/admin/scans/${scanId}/terminate`, {}, getAuthHeader());
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to terminate scan');
    }
  };

  const handleDeleteScan = async (scanId) => {
    if (!window.confirm("Are you sure you want to delete this scan?")) return;
    try {
      await axios.delete(`/admin/scans/${scanId}`, getAuthHeader());
      fetchData();
    } catch (err) {
      alert('Failed to delete scan');
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-header-title">
            <ShieldAlert size={26} color="var(--accent-primary)" />
            <h1>Administration Console</h1>
          </div>
          <p>Manage analyst identities, role authorizations, and global assessment pipelines.</p>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={16} /> Operator Management
        </button>
        <button className={`admin-tab ${activeTab === 'scans' ? 'active' : ''}`} onClick={() => setActiveTab('scans')}>
          <Radio size={16} /> Global Pipeline Telemetry
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="admin-section">
          {/* New User Creation Card */}
          <div className="widget-card">
            <div className="widget-header">
              <div className="widget-title">
                <Plus size={18} color="var(--accent-secondary)" />
                <span>Enroll New Operator</span>
              </div>
            </div>
            <form onSubmit={handleCreateUser} className="new-user-form">
              <input
                type="text"
                placeholder="Username"
                className="form-input"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                className="form-input"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Initial Password"
                className="form-input"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newUser.is_admin}
                  onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                />
                <span>Administrator Role</span>
              </label>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
                <Plus size={16} /> Add User
              </button>
            </form>
          </div>

          {/* User List Table */}
          <div className="scans-card">
            <table className="scans-table">
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="target-info">
                        <div className="target-icon">
                          <Users size={16} />
                        </div>
                        <div>
                          <div className="target-name">{u.username}</div>
                          <div className="target-id font-mono">ID: {u.id?.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ color: 'var(--text-secondary)' }}>{u.email}</span></td>
                    <td>
                      {u.is_admin ? (
                        <span className="severity-pill critical" style={{ fontSize: '0.7rem' }}>ADMIN</span>
                      ) : (
                        <span className="severity-pill info" style={{ fontSize: '0.7rem' }}>OPERATOR</span>
                      )}
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="status-badge completed">ACTIVE</span>
                      ) : (
                        <span className="status-badge failed">SUSPENDED</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          className="action-btn"
                          title={u.is_active ? "Suspend Account" : "Activate Account"}
                          onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                        >
                          {u.is_active ? <Ban size={16} color="var(--severity-high)" /> : <CheckCircle size={16} color="var(--severity-low)" />}
                        </button>
                        <button
                          className="action-btn danger"
                          title="Delete User"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'scans' && (
        <div className="admin-section">
          <div className="scans-card">
            <table className="scans-table">
              <thead>
                <tr>
                  <th>Target Scope</th>
                  <th>Status</th>
                  <th>Profile</th>
                  <th>Initiator</th>
                  <th style={{ textAlign: 'right' }}>Management</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="target-info">
                        <div className="target-icon">
                          <Radio size={16} />
                        </div>
                        <div>
                          <div className="target-name">{s.target}</div>
                          <div className="target-id font-mono">ID: {s.id?.slice(0, 10)}...</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${s.status ? s.status.toLowerCase() : 'completed'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td><span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.profile || 'Full'}</span></td>
                    <td><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.username || 'admin'}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        {s.status === 'RUNNING' && (
                          <button
                            className="btn-danger"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={() => handleTerminateScan(s.id)}
                          >
                            Abort
                          </button>
                        )}
                        <button
                          className="action-btn danger"
                          title="Delete Record"
                          onClick={() => handleDeleteScan(s.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
