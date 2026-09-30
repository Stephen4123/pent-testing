import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff, Mail } from 'lucide-react';
import axios from 'axios';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot_password' | 'reset_password'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('password', password);

      const response = await axios.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      onLoginSuccess(response.data.username, response.data.access_token, response.data.is_admin);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/^[A-Z]/.test(password)) {
      setError('Password must start with an uppercase letter.');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one digit.');
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('Password must contain at least one special character (e.g. !, @, #, $, etc.).');
      return;
    }

    // Instead of registering directly, open the disclaimer modal
    setShowDisclaimer(true);
  };

  const confirmRegistration = async () => {
    setShowDisclaimer(false);

    try {
      await axios.post('/auth/register', {
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password: password
      });

      setSuccessMsg('Account created successfully! Please sign in.');
      setAuthMode('login');

      // Clear all fields for security and clean state
      setFullName('');
      setEmail('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Registration failed. Please try again later.');
      }
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const response = await axios.post('/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });
      setResetToken(response.data.token);
      setSuccessMsg(`Token: ${response.data.token} (Mock email)`);
      setAuthMode('reset_password');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process request.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await axios.post('/auth/reset-password', {
        token: resetToken,
        new_password: password
      });
      setSuccessMsg('Password successfully reset! Please sign in.');
      setAuthMode('login');
      setPassword('');
      setConfirmPassword('');
      setResetToken('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    }
  };

  const handleToggleAuthMode = (mode) => {
    setAuthMode(mode);
    setFullName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setResetToken('');
    setError('');
    setSuccessMsg('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <Shield className="login-logo" size={40} />
            <div className="login-logo-glow"></div>
          </div>
          <h1>Welcome to AutoSec</h1>
          <p className="login-subtitle">
            {authMode === 'register' ? 'Create a new analyst account' :
              authMode === 'forgot_password' ? 'Recover your account' :
                authMode === 'reset_password' ? 'Set new password' :
                  'Autonomous Security Assessment Platform'}
          </p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="login-success">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {authMode === 'login' && (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-10px', marginBottom: '15px' }}>
              <button
                type="button"
                className="forgot-password-link"
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                onClick={() => handleToggleAuthMode('forgot_password')}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-btn">
              Sign In
            </button>

            <div className="toggle-auth-mode">
              <span>Don't have an account? </span>
              <button
                type="button"
                className="toggle-auth-btn"
                onClick={() => handleToggleAuthMode('register')}
              >
                Register
              </button>
            </div>
          </form>
        )}

        {authMode === 'register' && (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} className="login-form">
            <div className="input-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose username"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Uppercase, numbers, special char, min 8 chars"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn">
              Create Account
            </button>

            <div className="toggle-auth-mode">
              <span>Already have an account? </span>
              <button
                type="button"
                className="toggle-auth-btn"
                onClick={() => handleToggleAuthMode('login')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {authMode === 'forgot_password' && (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleForgotPassword} className="login-form">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-btn">
              Send Reset Token
            </button>

            <div className="toggle-auth-mode">
              <span>Remember your password? </span>
              <button
                type="button"
                className="toggle-auth-btn"
                onClick={() => handleToggleAuthMode('login')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {authMode === 'reset_password' && (
          /* RESET PASSWORD FORM */
          <form onSubmit={handleResetPassword} className="login-form">
            <div className="input-group">
              <label htmlFor="resetToken">Reset Token</label>
              <div className="input-wrapper">
                <Shield size={18} className="input-icon" />
                <input
                  id="resetToken"
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Enter reset token"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">New Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Uppercase, numbers, special char, min 8 chars"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn">
              Reset Password
            </button>

            <div className="toggle-auth-mode">
              <span>Back to login? </span>
              <button
                type="button"
                className="toggle-auth-btn"
                onClick={() => handleToggleAuthMode('login')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>

      {showDisclaimer && (
        <div className="modal-backdrop">
          <div className="disclaimer-modal">
            <div className="disclaimer-header">
              <Shield className="disclaimer-icon" size={28} style={{ color: 'var(--severity-high)' }} />
              <h2>Security Authorization & Disclaimer</h2>
            </div>
            <div className="disclaimer-content">
              <div className="disclaimer-warning">
                <strong>Warning:</strong> Unauthorized security scanning is illegal and constitutes a computer crime in many jurisdictions.
              </div>
              <div className="disclaimer-rules">
                <ol>
                  <li>You must only target hosts/networks you are explicitly authorized to pentest.</li>
                  <li>You assume full liability for any scans, traffic, or service disruptions caused by the automated tools.</li>
                  <li>The AutoSec platform and its developers assume no responsibility for any misuse or legal actions resulting from scans initiated by this account.</li>
                </ol>
              </div>
              <p className="disclaimer-agreement">
                By clicking <strong>"I Understand & Accept"</strong>, you confirm that you have read and agree to these terms.
              </p>
            </div>
            <div className="disclaimer-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowDisclaimer(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-accept"
                onClick={confirmRegistration}
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
