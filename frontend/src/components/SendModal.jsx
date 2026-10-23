import React, { useState, useEffect } from 'react';
import { parseVcfClient, downloadSampleVcf, SAMPLE_VCF_TEXT } from '../utils/vcfUtils';
import { api } from '../services/api';

export default function SendModal({
  isOpen,
  onClose,
  targetPersonaTitle = 'Audience',
  transformedText = '',
  selectedPersona = 'executive'
}) {
  const [activeTab, setActiveTab] = useState('email'); // default to 'email' per user request

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

  // Gmail Account Link state
  const [isGmailLinked, setIsGmailLinked] = useState(false);
  const [linkedEmail, setLinkedEmail] = useState('');
  const [linkedPassword, setLinkedPassword] = useState('');
  const [oauthToken, setOauthToken] = useState('');
  const [showLinkDrawer, setShowLinkDrawer] = useState(false);
  const [showAdvancedSmtp, setShowAdvancedSmtp] = useState(false);

  // Link drawer form fields
  const [inputGmail, setInputGmail] = useState('');
  const [inputAppPassword, setInputAppPassword] = useState('');
  const [inputOauthToken, setInputOauthToken] = useState('');
  const [customServer, setCustomServer] = useState('smtp.gmail.com');
  const [customPort, setCustomPort] = useState(587);

  // Status & spinners
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // { success: bool, message: string }

  // Load saved Gmail link on startup
  useEffect(() => {
    try {
      const savedLink = localStorage.getItem('persona_linked_gmail');
      if (savedLink) {
        const parsed = JSON.parse(savedLink);
        if (parsed.email && parsed.password) {
          setIsGmailLinked(true);
          setLinkedEmail(parsed.email);
          setLinkedPassword(parsed.password);
          setInputGmail(parsed.email);
          setInputAppPassword(parsed.password);
          if (parsed.server) setCustomServer(parsed.server);
          if (parsed.port) setCustomPort(parsed.port);
        } else if (parsed.token) {
          setIsGmailLinked(true);
          setOauthToken(parsed.token);
          setLinkedEmail(parsed.email || 'OAuth Account');
        }
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

  // Fallback: Gmail direct compose link
  const handleOpenGmailDirect = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  // Fallback: Default mail client link
  const handleOpenMailto = () => {
    window.location.href = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  };

  // Verify and Link Gmail Account (Using App Password or Token)
  const handleVerifyAndLinkGmail = async (e) => {
    e?.preventDefault();
    setLinkError(null);

    // Option A: Token provided
    if (inputOauthToken.trim()) {
      setIsGmailLinked(true);
      setOauthToken(inputOauthToken.trim());
      setLinkedEmail(inputGmail.trim() || 'Google Account');
      localStorage.setItem('persona_linked_gmail', JSON.stringify({
        email: inputGmail.trim(),
        token: inputOauthToken.trim(),
        linkedAt: new Date().toISOString()
      }));
      setShowLinkDrawer(false);
      return;
    }

    // Option B: Gmail + App Password
    const emailToTest = inputGmail.trim();
    const cleanPassword = inputAppPassword.replace(/\s+/g, '');

    if (!emailToTest || !cleanPassword) {
      setLinkError('Please enter both your Gmail address and 16-character App Password.');
      return;
    }

    setIsVerifyingLink(true);
    try {
      await api.testSmtp({
        server: customServer.trim() || 'smtp.gmail.com',
        port: parseInt(customPort, 10) || 587,
        username: emailToTest,
        password: cleanPassword,
        use_tls: true,
        use_ssl: false,
      });

      // Verification succeeded!
      setIsGmailLinked(true);
      setLinkedEmail(emailToTest);
      setLinkedPassword(cleanPassword);
      localStorage.setItem('persona_linked_gmail', JSON.stringify({
        email: emailToTest,
        password: cleanPassword,
        server: customServer.trim() || 'smtp.gmail.com',
        port: parseInt(customPort, 10) || 587,
        linkedAt: new Date().toISOString()
      }));
      setShowLinkDrawer(false);
      setEmailStatus({ success: true, message: `Gmail connected as ${emailToTest}! Ready to send emails directly without opening Gmail.` });
    } catch (err) {
      setLinkError(err.message || 'Verification failed. Please verify your 16-character Google App Password.');
    } finally {
      setIsVerifyingLink(false);
    }
  };

  // Disconnect / Unlink Gmail
  const handleDisconnectGmail = () => {
    setIsGmailLinked(false);
    setLinkedEmail('');
    setLinkedPassword('');
    setOauthToken('');
    localStorage.removeItem('persona_linked_gmail');
    setEmailStatus(null);
  };

  // Direct Send: Sends email immediately without opening Gmail!
  const handleSendDirectEmail = async () => {
    if (!toEmail.trim()) {
      setEmailStatus({ success: false, message: 'Please enter at least one recipient email address in the "To:" field.' });
      return;
    }
    if (!isGmailLinked) {
      setShowLinkDrawer(true);
      setEmailStatus({ success: false, message: 'Please link your Gmail account first to send directly without opening Gmail.' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    const recipients = toEmail.split(',').map((e) => e.trim()).filter(Boolean);

    try {
      let res;
      if (oauthToken) {
        // Send via Gmail REST API
        res = await api.sendEmail({
          to_email: recipients,
          subject: emailSubject,
          body: emailBody,
          access_token: oauthToken,
        });
      } else {
        // Send via Flask SMTP with linked Gmail credentials
        res = await api.sendEmail({
          to_email: recipients,
          subject: emailSubject,
          body: emailBody,
          smtp_config: {
            server: customServer.trim() || 'smtp.gmail.com',
            port: parseInt(customPort, 10) || 587,
            username: linkedEmail,
            password: linkedPassword,
            use_tls: true,
            use_ssl: false,
          },
        });
      }

      setEmailStatus({
        success: true,
        message: `✓ Sent! Delivered directly to ${recipients.join(', ')} from ${linkedEmail} without opening Gmail.`,
      });
    } catch (err) {
      setEmailStatus({
        success: false,
        message: `Send error: ${err.message || 'Failed to dispatch email'}. Check connection or re-link Gmail.`,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 780 }}>
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
              Send your validated communication directly via linked Gmail or WhatsApp
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {/* Contacts VCF Section */}
        <div style={{ padding: '0.65rem 1.25rem', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
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
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '0 1rem' }}>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
            style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>✉️</span> Email (Direct Send & Gmail)
            {isGmailLinked && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} title="Gmail Linked" />
            )}
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
            style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>💬</span> WhatsApp (WP)
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: 'calc(80vh - 160px)', overflowY: 'auto', padding: '1.25rem' }}>
          {/* ======================================================== */}
          {/* TAB 1: EMAIL (DIRECT GMAIL SEND & COMPOSE) */}
          {/* ======================================================== */}
          {activeTab === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Linked Gmail Status Header */}
              {isGmailLinked ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.95rem',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🟢</span>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Linked Gmail: <strong>{linkedEmail}</strong>
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#10b981' }}>
                        Ready to send emails directly with 1 click — no need to open Gmail!
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setShowLinkDrawer(!showLinkDrawer)}
                    >
                      Settings
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      onClick={handleDisconnectGmail}
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.95rem',
                    background: 'rgba(234, 67, 53, 0.08)',
                    border: '1px solid rgba(234, 67, 53, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🔗</span>
                    <div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Link Gmail to send emails directly (without opening Gmail)
                      </span>
                      <span style={{ display: 'block', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        Connect once with a 16-character Google App Password for instant 1-click delivery.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    style={{ background: '#EA4335', borderColor: '#EA4335', color: '#fff', fontWeight: 600 }}
                    onClick={() => setShowLinkDrawer(!showLinkDrawer)}
                  >
                    {showLinkDrawer ? 'Close Setup' : '⚡ Link Gmail Now'}
                  </button>
                </div>
              )}

              {/* Collapsible "Link Gmail" Setup Card */}
              {showLinkDrawer && (
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid #EA4335',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: 'var(--shadow-md)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ⚡ Link Your Gmail Account
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Sends emails directly from this app
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Google requires an <strong>App Password</strong> so apps can send emails directly without opening the Gmail website:
                    <ol style={{ margin: '0.4rem 0 0.4rem 1.25rem', padding: 0 }}>
                      <li>
                        Go to your{' '}
                        <a
                          href="https://myaccount.google.com/apppasswords"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#38bdf8', textDecoration: 'underline' }}
                        >
                          Google Account Security → App Passwords ↗
                        </a>
                      </li>
                      <li>Type app name <strong>"Persona Transformer"</strong> and click <strong>Create</strong>.</li>
                      <li>Copy the generated <strong>16-character password</strong> and paste it below.</li>
                    </ol>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                        Your Gmail Address:
                      </label>
                      <input
                        type="email"
                        className="preset-select"
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.6rem' }}
                        placeholder="e.g. sarah.connor@gmail.com"
                        value={inputGmail}
                        onChange={(e) => setInputGmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                        16-Character Google App Password:
                      </label>
                      <input
                        type="password"
                        className="preset-select"
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.6rem' }}
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={inputAppPassword}
                        onChange={(e) => setInputAppPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Advanced / OAuth Option Toggle */}
                  <div>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                      onClick={() => setShowAdvancedSmtp(!showAdvancedSmtp)}
                    >
                      {showAdvancedSmtp ? '− Hide Advanced Options' : '+ Or Connect with Google OAuth2 Token / Custom Server'}
                    </button>
                    {showAdvancedSmtp && (
                      <div style={{ marginTop: '0.5rem', padding: '0.6rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Google OAuth2 Access Token (Optional):</label>
                          <input
                            type="text"
                            className="preset-select"
                            style={{ width: '100%', fontSize: '0.78rem' }}
                            placeholder="ya29.a0AfH6SM..."
                            value={inputOauthToken}
                            onChange={(e) => setInputOauthToken(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>SMTP Server:</label>
                            <input
                              type="text"
                              className="preset-select"
                              style={{ width: '100%', fontSize: '0.78rem' }}
                              value={customServer}
                              onChange={(e) => setCustomServer(e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Port:</label>
                            <input
                              type="number"
                              className="preset-select"
                              style={{ width: '100%', fontSize: '0.78rem' }}
                              value={customPort}
                              onChange={(e) => setCustomPort(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {linkError && (
                    <div style={{ padding: '0.45rem 0.75rem', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: '0.75rem', borderRadius: '4px' }}>
                      ✕ {linkError}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setShowLinkDrawer(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      style={{ background: '#EA4335', borderColor: '#EA4335', color: '#fff', fontWeight: 600 }}
                      onClick={handleVerifyAndLinkGmail}
                      disabled={isVerifyingLink}
                    >
                      {isVerifyingLink ? 'Verifying with Google...' : '✓ Verify & Link Gmail'}
                    </button>
                  </div>
                </div>
              )}

              {/* Gmail-style Compose Container */}
              <div
                style={{
                  border: '1px solid var(--border)',
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
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f9fafb' }}>
                    New Message — {targetPersonaTitle}
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: isGmailLinked ? '#10b981' : '#9ca3af' }}>
                      {isGmailLinked ? `Sending as ${linkedEmail}` : 'Gmail Not Linked'}
                    </span>
                  </div>
                </div>

                {/* To Field */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0.45rem 0.85rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', width: '60px' }}>To:</span>
                  <input
                    type="email"
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                    placeholder="Recipient email address(es) (e.g. sarah@cyberdyne.com)"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                  />
                </div>

                {/* Subject Field */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0.45rem 0.85rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', width: '60px' }}>Subject:</span>
                  <input
                    type="text"
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem', fontWeight: 500 }}
                    placeholder="Subject line"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                {/* Body Area */}
                <div style={{ padding: '0.65rem 0.85rem' }}>
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
                      padding: '0.55rem 0.85rem',
                      fontSize: '0.82rem',
                      background: emailStatus.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: emailStatus.success ? '#10b981' : '#ef4444',
                      borderTop: '1px solid var(--border)'
                    }}
                  >
                    {emailStatus.success ? '✓ ' : '⚠ '} {emailStatus.message}
                  </div>
                )}

                {/* Bottom Action Toolbar */}
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-input)',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.6rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {/* PRIMARY ACTION: Direct Send (No opening Gmail!) */}
                    {isGmailLinked ? (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          borderColor: '#059669',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          padding: '0.5rem 1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                        }}
                        onClick={handleSendDirectEmail}
                        disabled={isSendingEmail || !emailBody.trim()}
                      >
                        {isSendingEmail ? (
                          <>
                            <span className="spinner" style={{ width: 14, height: 14 }} />
                            <span>Sending directly from Gmail...</span>
                          </>
                        ) : (
                          <>
                            <span>🚀</span>
                            <span>Send Email Directly</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{
                          background: '#EA4335',
                          borderColor: '#EA4335',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          padding: '0.5rem 1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem'
                        }}
                        onClick={() => setShowLinkDrawer(true)}
                      >
                        <span>⚡</span>
                        <span>Link Gmail to Send Directly</span>
                      </button>
                    )}

                    {/* Secondary Fallback Buttons */}
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={handleOpenGmailDirect}
                      disabled={!emailBody.trim()}
                      title="Fallback: opens Gmail web tab"
                    >
                      <span>Open in Gmail Tab</span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={handleOpenMailto}
                      disabled={!emailBody.trim()}
                      title="Opens your system default email client"
                    >
                      <span>Default Mail</span>
                    </button>
                  </div>

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {isGmailLinked
                      ? '✓ Direct dispatch enabled (no browser tabs opened)'
                      : 'Connect Gmail to send directly'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: WHATSAPP */}
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
                <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                    Multiple Recipients Detected ({recipientNumbers.length}):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {recipientNumbers.map((phone, idx) => (
                      <div
                        key={idx}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.6rem', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border)' }}
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
        </div>
      </div>
    </div>
  );
}
