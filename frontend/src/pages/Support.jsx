import React from 'react';
import { Mail, MessageCircle, FileText, ExternalLink, HelpCircle, Phone, Globe } from 'lucide-react';
import './Support.css';

export default function Support() {
  return (
    <div className="support-container">
      <div className="support-header">
        <h1><HelpCircle size={28} style={{ marginRight: '0.75rem', color: 'var(--accent-primary)' }} /> Support Center</h1>
        <p>Need help with AutoSec? We're here for you.</p>
      </div>

      <div className="support-grid">
        <div className="support-card">
          <div className="support-card-icon">
            <FileText size={24} />
          </div>
          <h3>Documentation</h3>
          <p>Read our comprehensive guides on how to use AutoSec, configure scans, and interpret reports.</p>
          <button className="support-btn outline">
            View Docs <ExternalLink size={14} style={{ marginLeft: '0.5rem' }} />
          </button>
        </div>

        <div className="support-card primary">
          <div className="support-card-icon">
            <Mail size={24} />
          </div>
          <h3>Email Support</h3>
          <p>Get direct help from our technical support team for billing, accounts, or complex issues.</p>
          <a href="mailto:support@autosec.local" className="support-btn primary-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            Contact Support
          </a>
        </div>
      </div>

      <div className="support-contact-info">
        <h3>Alternative Contact Methods</h3>
        <div className="contact-methods">
          <div className="contact-method">
            <Phone size={18} />
            <span>+1 (800) 555-0199</span>
          </div>
          <div className="contact-method">
            <Globe size={18} />
            <span>autosec.local/help</span>
          </div>
        </div>
      </div>
    </div>
  );
}
