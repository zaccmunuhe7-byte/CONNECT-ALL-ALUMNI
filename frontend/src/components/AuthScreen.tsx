import React, { useState, useRef, useEffect } from 'react';
import { GraduationCap, Network, ShieldCheck, Sparkles, Camera, ArrowRight, ArrowLeft, School, User, KeyRound, Mail, Phone, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadFile, api } from '../api/client';

type ForgotStep = 'input' | 'otp' | 'newpass' | 'done';

export function AuthScreen() {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [step, setStep] = useState(1); // 1=account, 2=schools, 3=profile pic & bio
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primarySchool, setPrimarySchool] = useState('');
  const [highSchool, setHighSchool] = useState('');
  const [university, setUniversity] = useState('');
  const [currentWorkplace, setCurrentWorkplace] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Forgot password fields
  const [forgotStep, setForgotStep] = useState<ForgotStep>('input');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotMethod, setForgotMethod] = useState('');
  const [forgotDestination, setForgotDestination] = useState('');

  // Account status alert
  const [accountAlert, setAccountAlert] = useState<{ type: string; message: string; email?: string; password?: string } | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  // Google Sign-In
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'login') return;

    // Load Google Identity Services script
    const existingScript = document.getElementById('google-gsi');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    } else {
      initializeGoogle();
    }

    function initializeGoogle() {
      const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
      if (!clientId || !(window as any).google?.accounts?.id) return;

      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCallback,
        auto_select: false,
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          width: googleBtnRef.current.offsetWidth || 320,
          text: 'signin_with',
          shape: 'pill',
        });
      }
    }
  }, [mode]);

  async function handleGoogleCallback(response: { credential: string }) {
    setGoogleLoading(true);
    setError('');
    setAccountAlert(null);
    try {
      await loginWithGoogle(response.credential);
    } catch (err: any) {
      const msg = err.message || 'Google login failed';
      if (msg.includes('suspended')) {
        setAccountAlert({ type: 'suspended', message: msg });
      } else if (msg.includes('deleted')) {
        setAccountAlert({ type: 'deleted', message: msg });
      } else {
        setError(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setAvatarFile(f);
      setAvatarPreview(URL.createObjectURL(f));
    }
  }

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setAccountAlert(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get('email')), String(form.get('password')));
    } catch (err: any) {
      const msg = err.message || 'Something went wrong';
      // Check for specific error codes from our backend
      if (msg.includes('suspended') || msg.includes('Suspended')) {
        setAccountAlert({ type: 'suspended', message: msg, email: String(form.get('email')), password: String(form.get('password')) });
      } else if (msg.includes('deleted') || msg.includes('Deleted') || msg.includes('permanently deleted')) {
        setAccountAlert({ type: 'deleted', message: msg, email: String(form.get('email')), password: String(form.get('password')) });
      } else if (msg.includes('Wrong password')) {
        setError(msg);
      } else if (msg.includes('No account found')) {
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    setError('');
    if (step === 1) {
      if (!fullName || fullName.length < 2) { setError('Full name is required (min 2 chars)'); return; }
      if (!email) { setError('Email is required'); return; }
      if (!password || password.length < 8) { setError('Password must be at least 8 characters'); return; }
      setStep(2);
    } else if (step === 2) {
      if (!primarySchool || primarySchool.length < 2) { setError('Primary school is required'); return; }
      if (!highSchool || highSchool.length < 2) { setError('High school is required'); return; }
      setStep(3);
    }
  }

  function prevStep() {
    setError('');
    setStep(s => Math.max(1, s - 1));
  }

  async function submitRegister(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        fullName,
        email,
        password,
        primarySchool,
        highSchool,
        university: university || undefined,
        currentWorkplace: currentWorkplace || undefined,
        bio: bio || undefined
      }, avatarFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // ─── Forgot Password Handlers ─────────────────────
  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api<{ method: string; destination: string; message: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ identifier: forgotIdentifier }) }
      );
      setForgotMethod(result.method);
      setForgotDestination(result.destination);
      setForgotMessage(result.message);
      setForgotStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api<{ resetToken: string; message: string }>(
        '/api/auth/verify-otp',
        { method: 'POST', body: JSON.stringify({ identifier: forgotIdentifier, otp: forgotOtp }) }
      );
      setResetToken(result.resetToken);
      setForgotMessage(result.message);
      setForgotStep('newpass');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (forgotNewPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (forgotNewPassword !== forgotConfirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const result = await api<{ message: string }>(
        '/api/auth/reset-password',
        { method: 'POST', body: JSON.stringify({ resetToken, newPassword: forgotNewPassword }) }
      );
      setForgotMessage(result.message);
      setForgotStep('done');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  async function submitAppeal() {
    if (!accountAlert?.email || !accountAlert?.password || appealReason.length < 10) {
      setError('Please enter a valid reason (min 10 characters)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api('/api/auth/appeal', {
        method: 'POST',
        body: JSON.stringify({ email: accountAlert.email, password: accountAlert.password, reason: appealReason })
      });
      setAppealSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit appeal');
    } finally {
      setLoading(false);
    }
  }

  function resetToLogin() {
    setMode('login');
    setStep(1);
    setError('');
    setAccountAlert(null);
  }

  function resetToRegister() {
    setMode('register');
    setStep(1);
    setError('');
    setAccountAlert(null);
  }

  function startForgotPassword() {
    setMode('forgot');
    setForgotStep('input');
    setForgotIdentifier('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setResetToken('');
    setForgotMessage('');
    setError('');
    setAccountAlert(null);
  }

  const stepLabels = ['Account', 'School Info', 'Profile'];

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand">
          <img src="/connect-logo.svg" alt="" />
          <div>
            <h1>CONNECT ALUMNI</h1>
            <p>Find classmates, mentors, and career doors in one trusted alumni space.</p>
          </div>
        </div>
        <div className="auth-highlights">
          <span><Network size={14} /> Smart Matching</span>
          <span><ShieldCheck size={14} /> Private by Design</span>
          <span><Sparkles size={14} /> Real Community</span>
        </div>

        {mode !== 'forgot' && (
          <div className="segmented">
            <button className={mode === 'login' ? 'active' : ''} onClick={resetToLogin}>Login</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={resetToRegister}>Register</button>
          </div>
        )}

        {/* ─── Account Suspension/Deletion Alert ─── */}
        {accountAlert && (
          <div className={`account-alert ${accountAlert.type}`}>
            <div className="account-alert-icon">
              {accountAlert.type === 'suspended' ? '⚠️' : '🚫'}
            </div>
            <div className="account-alert-content">
              <h3>{accountAlert.type === 'suspended' ? 'Account Suspended' : 'Account Deleted'}</h3>
              <p>{accountAlert.message}</p>
              
              {!appealSubmitted ? (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 13, marginBottom: 8 }}>You can submit an appeal to the admin to request reactivation:</p>
                  <textarea 
                    value={appealReason} 
                    onChange={e => setAppealReason(e.target.value)} 
                    placeholder="Why should your account be reactivated?"
                    style={{ width: '100%', minHeight: 60, marginBottom: 8, padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                  <button className="btn btn-sm btn-primary" onClick={submitAppeal} disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Appeal'}
                  </button>
                  {error && <p className="error-msg" style={{ marginTop: 4 }}>{error}</p>}
                </div>
              ) : (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', borderRadius: 6 }}>
                  ✅ Your appeal has been submitted successfully and is pending admin review.
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAccountAlert(null); setAppealSubmitted(false); setAppealReason(''); }}>✕</button>
          </div>
        )}

        {/* ─── Login Form ─── */}
        {mode === 'login' && (
          <form onSubmit={submitLogin} className="stack">
            <input name="email" placeholder="Email address" type="email" required />
            <input name="password" placeholder="Password" type="password" required />
            {error && (
              <div className="login-error-box">
                <p className="error-msg">{error}</p>
                {(error.includes('Wrong password') || error.includes('try again')) && (
                  <button type="button" className="forgot-link" onClick={startForgotPassword}>
                    <KeyRound size={13} /> Forgotten password?
                  </button>
                )}
              </div>
            )}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              <GraduationCap size={17} />
              {loading ? 'Please wait...' : 'Login'}
            </button>
            <button type="button" className="forgot-link" onClick={startForgotPassword} style={{ marginTop: 4 }}>
              <KeyRound size={13} /> Forgotten password?
            </button>

            {/* Google Sign-In */}
            <div className="auth-divider">
              <span>or</span>
            </div>
            <div ref={googleBtnRef} className="google-btn-container" />
            {googleLoading && (
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Signing in with Google...</p>
            )}
          </form>
        )}

        {/* ─── Forgot Password Flow ─── */}
        {mode === 'forgot' && (
          <div className="forgot-password-flow fade-in">
            <div className="forgot-header">
              <button className="btn btn-ghost btn-sm" onClick={resetToLogin}>
                <ArrowLeft size={14} /> Back to Login
              </button>
              <h2>Reset Password</h2>
            </div>

            {/* Step 1: Enter email or phone */}
            {forgotStep === 'input' && (
              <form onSubmit={requestOtp} className="stack">
                <div className="forgot-icon-wrap">
                  <KeyRound size={28} />
                </div>
                <p className="forgot-desc">
                  Enter the email address or phone number you used to register. We'll send you a 6-digit OTP code to verify your identity.
                </p>
                <input
                  placeholder="Email address or phone number"
                  value={forgotIdentifier}
                  onChange={e => setForgotIdentifier(e.target.value)}
                  required
                />
                {error && <p className="error-msg">{error}</p>}
                <button className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Sending...' : 'Send OTP Code'}
                </button>
              </form>
            )}

            {/* Step 2: Enter OTP */}
            {forgotStep === 'otp' && (
              <form onSubmit={verifyOtp} className="stack">
                <div className="forgot-icon-wrap">
                  {forgotMethod === 'email' ? <Mail size={28} /> : <Phone size={28} />}
                </div>
                <div className="otp-sent-info">
                  <p>OTP sent via <strong>{forgotMethod}</strong> to:</p>
                  <span className="otp-destination">{forgotDestination}</span>
                </div>
                <p className="forgot-desc">{forgotMessage}</p>
                <input
                  className="otp-input"
                  placeholder="Enter 6-digit OTP"
                  value={forgotOtp}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setForgotOtp(val);
                  }}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  style={{ textAlign: 'center', fontSize: 24, letterSpacing: 12, fontWeight: 800 }}
                />
                {error && <p className="error-msg">{error}</p>}
                <button className="btn btn-primary" disabled={loading || forgotOtp.length < 6} style={{ width: '100%' }}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setForgotStep('input'); setError(''); }}>
                  Didn't receive it? Send again
                </button>
              </form>
            )}

            {/* Step 3: New password */}
            {forgotStep === 'newpass' && (
              <form onSubmit={submitNewPassword} className="stack">
                <div className="forgot-icon-wrap">
                  <Lock size={28} />
                </div>
                <p className="forgot-desc">Create a new strong password for your account.</p>
                <input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={forgotNewPassword}
                  onChange={e => setForgotNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={forgotConfirmPassword}
                  onChange={e => setForgotConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
                {error && <p className="error-msg">{error}</p>}
                <button className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            {/* Step 4: Done */}
            {forgotStep === 'done' && (
              <div className="stack forgot-done">
                <div className="forgot-icon-wrap success">
                  <CheckCircle2 size={36} />
                </div>
                <h3>Password Reset Successful!</h3>
                <p>{forgotMessage}</p>
                <button className="btn btn-primary" onClick={resetToLogin} style={{ width: '100%' }}>
                  <GraduationCap size={17} /> Back to Login
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Register Form ─── */}
        {mode === 'register' && (
          <>
            {/* Step Indicator */}
            <div className="reg-steps">
              {stepLabels.map((label, i) => (
                <div key={i} className={`reg-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`}>
                  <div className="reg-step-dot">{step > i + 1 ? '✓' : i + 1}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <form onSubmit={submitRegister} className="stack">
              {/* Step 1: Account Info */}
              {step === 1 && (
                <div className="stack fade-in">
                  <div className="step-icon"><User size={22} /></div>
                  <input placeholder="Full name *" value={fullName} onChange={e => setFullName(e.target.value)} minLength={2} />
                  <input placeholder="Email address *" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  <input placeholder="Password (min 8 chars) *" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              )}

              {/* Step 2: School Info */}
              {step === 2 && (
                <div className="stack fade-in">
                  <div className="step-icon"><School size={22} /></div>
                  <div className="field-group-auth">
                    <label>Primary School <span className="required">*</span></label>
                    <input placeholder="e.g. St. Mary's Primary School" value={primarySchool} onChange={e => setPrimarySchool(e.target.value)} />
                  </div>
                  <div className="field-group-auth">
                    <label>High School <span className="required">*</span></label>
                    <input placeholder="e.g. Alliance High School" value={highSchool} onChange={e => setHighSchool(e.target.value)} />
                  </div>
                  <div className="field-group-auth">
                    <label>College / University <span className="optional">(optional)</span></label>
                    <input placeholder="e.g. University of Nairobi" value={university} onChange={e => setUniversity(e.target.value)} />
                  </div>
                  <div className="field-group-auth">
                    <label>Current Workplace <span className="optional">(optional)</span></label>
                    <input placeholder="e.g. Safaricom PLC" value={currentWorkplace} onChange={e => setCurrentWorkplace(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Step 3: Profile Photo & Bio */}
              {step === 3 && (
                <div className="stack fade-in">
                  <div className="step-icon"><Camera size={22} /></div>
                  <div className="avatar-upload-section">
                    <div className="avatar-upload-circle" onClick={() => fileRef.current?.click()}>
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" />
                      ) : (
                        <div className="avatar-placeholder">
                          <Camera size={28} />
                          <span>Add Photo</span>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                    <p className="avatar-hint">Tap to set your display picture</p>
                  </div>
                  <div className="field-group-auth">
                    <label>Bio <span className="char-count">{bio.length}/50</span></label>
                    <input
                      placeholder="Tell us about yourself..."
                      value={bio}
                      onChange={e => { if (e.target.value.length <= 50) setBio(e.target.value); }}
                      maxLength={50}
                    />
                  </div>
                </div>
              )}

              {error && <p className="error-msg">{error}</p>}

              <div className="reg-nav-buttons">
                {step > 1 && (
                  <button type="button" className="btn btn-secondary" onClick={prevStep}>
                    <ArrowLeft size={15} /> Back
                  </button>
                )}
                {step < 3 && (
                  <button type="button" className="btn btn-primary" onClick={nextStep} style={{ marginLeft: 'auto' }}>
                    Next <ArrowRight size={15} />
                  </button>
                )}
                {step === 3 && (
                  <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginLeft: 'auto' }}>
                    <GraduationCap size={17} />
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                )}
              </div>
            </form>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'login' ? "Don't have an account? " : mode === 'register' ? 'Already have an account? ' : ''}
          {mode !== 'forgot' && (
            <button onClick={() => mode === 'login' ? resetToRegister() : resetToLogin()}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700 }}>
              {mode === 'login' ? 'Register' : 'Login'}
            </button>
          )}
        </p>
      </section>
    </main>
  );
}
