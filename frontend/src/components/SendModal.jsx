import React, { useState, useEffect } from 'react';
import { parseVcfClient, downloadSampleVcf, SAMPLE_VCF_TEXT } from '../utils/vcfUtils';
import { api } from '../services/api';

const DEFAULT_SMTP = {
  server: 'smtp.gmail.com',
  port: 587,
  username: '',
  password: '',
  use_tls: true,
  use_ssl: false,
};

export default function SendModal({
  isOpen,
  onClose,
  targetPersonaTitle = 'Audience',
  transformedText = '',
  selectedPersona = 'executive'
}) {
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp' | 'email'

  // Contacts from VCF
  const [contacts, setContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [vcfFileName, setVcfFileName] = useState('');

  // WhatsApp form
  const [phoneInput, setPhoneInput] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // Email form (Gmail style)
  const [toEmail, setToEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // SMTP Settings
  const [showSmtpSetup, setShowSmtpSetup] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState(DEFAULT_SMTP);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null); // { success: bool, message: string }
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // { success: bool, message: string }

  // Load stored SMTP settings if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('persona_smtp_settings');
      if (saved) {
        setSmtpConfig(JSON.parse(saved));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Update text when transformedText or persona changes
  useEffect(() => {
    if (transformedText) {
      setWhatsappMessage(transformedText);
      setEmailBody(transformedText);

      // Generate context-aware default subject
      const cleanSnippet = transformedText.replace(/\n+/g, ' ').trim().slice(0, 45);
      const personaPrefix =
        selectedPersona === 'executive'
          ? 'Executive Brief'
          : selectedPersona === 'legal'
          ? 'Compliance Notice'
          : selectedPersona === 'peer'
          ? 'Team Update'
          : 'Quick Note';
      setEmailSubject(`${personaPrefix}: ${cleanSnippet}${cleanSnippet.length >= 45 ? '...' : ''}`);
    }
  }, [transformedText, selectedPersona, isOpen]);

  // Clean phone number helper
  const cleanPhone = (num) => (num ? num.replace(/[^\d+]/g, '') : '');

  // Handle Contact selection (auto-populates WP phone and Email)
  const handleSelectContact = (contactId) => {
    setSelectedContactId(contactId);
    if (!contactId) return;

    const contact = contacts.find((c) => c.id === contactId);
    if (contact) {
      if (contact.phone) {
        setPhoneInput(contact.phone);
      }
      if (contact.email) {
        setToEmail(contact.email);
      }
    }
  };

  // Upload and parse .vcf file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVcfFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const parsed = parseVcfClient(text);
        setContacts(parsed);
        if (parsed.length > 0) {
          handleSelectContact(parsed[0].id);
        }
      }
    };
    reader.readAsText(file);
  };

  // Load sample contacts
  const handleLoadSampleContacts = () => {
    const parsed = parseVcfClient(SAMPLE_VCF_TEXT);
    setContacts(parsed);
    setVcfFileName('Sample (4 contacts loaded)');
    if (parsed.length > 0) {
      handleSelectContact(parsed[0].id);
    }
  };

  // Parse comma-separated phone numbers
  const recipientNumbers = phoneInput
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  // Generate WhatsApp links
  const getWhatsAppWebUrl = (phone) => {
    const clean = cleanPhone(phone);
    return `https://web.whatsapp.com/send?phone=${encodeURIComponent(clean)}&text=${encodeURIComponent(whatsappMessage)}`;
  };

  const getWhatsAppApiUrl = (phone) => {
    const clean = cleanPhone(phone);
    return `https://api.whatsapp.com/send?phone=${encodeURIComponent(clean)}&text=${encodeURIComponent(whatsappMessage)}`;
  };

  const handleOpenWhatsApp = (phone, useWeb = true) => {
    const url = useWeb ? getWhatsAppWebUrl(phone) : getWhatsAppApiUrl(phone);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Gmail direct compose link
  const handleOpenGmailDirect = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  // Default mail client link
  const handleOpenMailto = () => {
    window.location.href = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  };

  // Test SMTP connection
  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await api.testSmtp(smtpConfig);
      setSmtpTestResult({ success: true, message: res.message || 'SMTP Connection & Auth Successful!' });
      // Save valid settings
      localStorage.setItem('persona_smtp_settings', JSON.stringify(smtpConfig));
    } catch (err) {
      setSmtpTestResult({ success: false, message: err.message || 'SMTP Test Failed' });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Send Email via Flask SMTP
  const handleSendFlaskMail = async () => {
    if (!toEmail.trim()) {
      setEmailStatus({ success: false, message: 'Please enter at least one recipient email address.' });
      return;
    }
    if (!smtpConfig.username || !smtpConfig.password) {
      setShowSmtpSetup(true);
      setEmailStatus({ success: false, message: 'SMTP Username and App Password are required. Please configure SMTP settings below.' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await api.sendEmail({
        to_email: toEmail.split(',').map((e) => e.trim()).filter(Boolean),
        subject: emailSubject,
        body: emailBody,
        smtp_config: smtpConfig,
      });
      setEmailStatus({ success: true, message: res.message || 'Email sent successfully via Flask SMTP!' });
      localStorage.setItem('persona_smtp_settings', JSON.stringify(smtpConfig));
    } catch (err) {
      setEmailStatus({ success: false, message: err.message || 'Failed to dispatch email.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="modal-title">Send to {targetPersonaTitle}</span>
              <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                {selectedPersona}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Dispatch your validated communication directly via WhatsApp or Email
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {/* Contacts VCF Section */}
        <div style={{ padding: '0.75rem 1.25rem', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              📇 Contacts (.vcf):
            </span>
            <label className="btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
              <span>📁 {vcfFileName ? 'Change .vcf' : 'Upload contacts.vcf'}</span>
              <input type="file" accept=".vcf,text/vcard" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
            {contacts.length === 0 && (
              <button type="button" className="btn-secondary btn-sm" onClick={handleLoadSampleContacts}>
                Load Sample Contacts
              </button>
            )}
            <button type="button" className="btn-secondary btn-sm" onClick={downloadSampleVcf} title="Download a template contacts.vcf file">
              Download Template
            </button>
          </div>

          {contacts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {contacts.length} contact{contacts.length > 1 ? 's' : ''}:
              </span>
              <select
                className="preset-select"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', minWidth: '180px' }}
                value={selectedContactId}
                onChange={(e) => handleSelectContact(e.target.value)}
              >
                <option value="">-- Choose Contact --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.org ? `(${c.org})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Channel Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: '0 1rem' }}>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
            style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>💬</span> WhatsApp (WP)
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
            style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>✉️</span> Email (Gmail Compose)
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: 'calc(80vh - 160px)', overflowY: 'auto', padding: '1.25rem' }}>
          {/* ======================================================== */}
          {/* TAB 1: WHATSAPP */}
          {/* ======================================================== */}
          {activeTab === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Recipient Phone Number(s):
                </label>
                <input
                  type="text"
                  className="preset-select"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.9rem', borderRadius: 'var(--radius-sm)' }}
                  placeholder="e.g. +1 555-0199 or 919876543210 (comma-separated for multiple)"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Include country code (e.g. +1... or 91...). Selecting a contact above auto-fills their number.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Message to Send:
                </label>
                <textarea
                  className="editor-textarea"
                  style={{ minHeight: '130px', fontSize: '0.88rem', lineHeight: '1.5' }}
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                />
              </div>

              {/* Single Recipient Direct Send Buttons */}
              {recipientNumbers.length <= 1 && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: '#25D366', borderColor: '#22c55e', color: '#fff', flex: 1, minWidth: '220px' }}
                    onClick={() => handleOpenWhatsApp(phoneInput || '', true)}
                    disabled={!whatsappMessage.trim()}
                  >
                    <span>🟢 Open WhatsApp Web</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1, minWidth: '180px' }}
                    onClick={() => handleOpenWhatsApp(phoneInput || '', false)}
                    disabled={!whatsappMessage.trim()}
                  >
                    <span>📱 Open WhatsApp App</span>
                  </button>
                </div>
              )}

              {/* Multiple Recipients Quick Dispatch List */}
              {recipientNumbers.length > 1 && (
                <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                    Multiple Recipients Detected ({recipientNumbers.length}):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {recipientNumbers.map((phone, idx) => (
                      <div
                        key={idx}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.6rem', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      >
                        <span style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                          👤 {phone}
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            style={{ color: '#25D366', borderColor: '#25D366' }}
                            onClick={() => handleOpenWhatsApp(phone, true)}
                          >
                            Open Chat (Web)
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => handleOpenWhatsApp(phone, false)}
                          >
                            App
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(37, 211, 102, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(37, 211, 102, 0.2)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                ℹ️ <strong>How WhatsApp Sending Works:</strong> Clicking opens WhatsApp directly with the chat and transformed message pre-filled. You just need to press the green "Send" arrow in WhatsApp.
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: EMAIL (GMAIL COMPOSE STYLE) */}
          {/* ======================================================== */}
          {activeTab === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Gmail-style Compose Container */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                {/* Gmail Compose Title Header */}
                <div
                  style={{
                    background: '#1f2937',
                    padding: '0.5rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f9fafb' }}>
                    New Message — {targetPersonaTitle}
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Gmail Compose Mode</span>
                  </div>
                </div>

                {/* To Field */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: '0.4rem 0.85rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '60px' }}>To:</span>
                  <input
                    type="email"
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                    placeholder="Recipient email address(es) (e.g. sarah@enterprise.com)"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                  />
                </div>

                {/* Subject Field */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: '0.4rem 0.85rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '60px' }}>Subject:</span>
                  <input
                    type="text"
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem', fontWeight: 500 }}
                    placeholder="Subject line"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                {/* Body Area */}
                <div style={{ padding: '0.6rem 0.85rem' }}>
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: '140px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      resize: 'vertical'
                    }}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                  />
                </div>

                {/* Status Banners */}
                {emailStatus && (
                  <div
                    style={{
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.8rem',
                      background: emailStatus.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: emailStatus.success ? '#10b981' : '#ef4444',
                      borderTop: '1px solid var(--border-color)'
                    }}
                  >
                    {emailStatus.success ? '✓ ' : '⚠ '} {emailStatus.message}
                  </div>
                )}

                {/* Bottom Action Toolbar */}
                <div
                  style={{
                    padding: '0.6rem 0.85rem',
                    background: 'var(--bg-input)',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.6rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Method 1: Link Gmail Directly */}
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      style={{ background: '#EA4335', borderColor: '#EA4335', color: '#fff' }}
                      onClick={handleOpenGmailDirect}
                      disabled={!emailBody.trim()}
                      title="Opens Gmail web compose in a new tab with recipient, subject & body ready"
                    >
                      <span>🔴 Open in Gmail (Web)</span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={handleOpenMailto}
                      disabled={!emailBody.trim()}
                      title="Opens your system default email client"
                    >
                      <span>✉️ Open Default Mail</span>
                    </button>

                    {/* Method 2: Flask SMTP Send */}
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={handleSendFlaskMail}
                      disabled={isSendingEmail || !emailBody.trim()}
                    >
                      {isSendingEmail ? (
                        <>
                          <span className="spinner" style={{ width: 12, height: 12 }} />
                          <span>Sending SMTP...</span>
                        </>
                      ) : (
                        <span>📤 Send via Flask SMTP</span>
                      )}
                    </button>
                  </div>

                  {/* Toggle SMTP Settings */}
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setShowSmtpSetup(!showSmtpSetup)}
                  >
                    ⚙️ {showSmtpSetup ? 'Hide SMTP Setup' : 'SMTP Setup'}
                  </button>
                </div>
              </div>

              {/* Collapsible SMTP Configuration Box */}
              {showSmtpSetup && (
                <div
                  style={{
                    padding: '0.85rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Flask-Mail / SMTP Configuration:
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Supports Gmail, Outlook, AWS SES, or any SMTP provider
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>SMTP Server:</label>
                      <input
                        type="text"
                        className="preset-select"
                        style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                        value={smtpConfig.server}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, server: e.target.value })}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Port:</label>
                      <input
                        type="number"
                        className="preset-select"
                        style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                        value={smtpConfig.port}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value, 10) || 587 })}
                        placeholder="587"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Email / Username:</label>
                      <input
                        type="email"
                        className="preset-select"
                        style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                        value={smtpConfig.username}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                        placeholder="your.email@gmail.com"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>App Password:</label>
                      <input
                        type="password"
                        className="preset-select"
                        style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                        value={smtpConfig.password}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                        placeholder="16-character App Password"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={smtpConfig.use_tls}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, use_tls: e.target.checked })}
                        />
                        Use TLS (Port 587)
                      </label>
                      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={smtpConfig.use_ssl}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, use_ssl: e.target.checked })}
                        />
                        Use SSL (Port 465)
                      </label>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={handleTestSmtp}
                      disabled={isTestingSmtp || !smtpConfig.username || !smtpConfig.password}
                    >
                      {isTestingSmtp ? 'Testing Connection...' : '🔌 Test Connection'}
                    </button>
                  </div>

                  {smtpTestResult && (
                    <div
                      style={{
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        background: smtpTestResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: smtpTestResult.success ? '#10b981' : '#ef4444'
                      }}
                    >
                      {smtpTestResult.success ? '✓ ' : '✕ '} {smtpTestResult.message}
                    </div>
                  )}

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    💡 <strong>Gmail Note:</strong> Use a 16-character Google App Password (generated at <em>myaccount.google.com/apppasswords</em>) rather than your standard Gmail account password. Alternatively, simply use the <strong>"Open in Gmail"</strong> button to avoid any SMTP configuration.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
