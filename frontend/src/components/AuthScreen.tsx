import { useState, useRef } from 'react';
import { GraduationCap, Network, ShieldCheck, Sparkles, Camera, ArrowRight, ArrowLeft, School, Building2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadFile } from '../api/client';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
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
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get('email')), String(form.get('password')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
      let profilePictureUrl: string | undefined;
      if (avatarFile) {
        const uploaded = await uploadFile(avatarFile, '/api/upload');
        profilePictureUrl = uploaded.url;
      }
      await register({
        fullName,
        email,
        password,
        primarySchool,
        highSchool,
        university: university || undefined,
        currentWorkplace: currentWorkplace || undefined,
        bio: bio || undefined,
        profilePictureUrl
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function resetToLogin() {
    setMode('login');
    setStep(1);
    setError('');
  }

  function resetToRegister() {
    setMode('register');
    setStep(1);
    setError('');
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
        <div className="segmented">
          <button className={mode === 'login' ? 'active' : ''} onClick={resetToLogin}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={resetToRegister}>Register</button>
        </div>

        {mode === 'login' && (
          <form onSubmit={submitLogin} className="stack">
            <input name="email" placeholder="Email address" type="email" required />
            <input name="password" placeholder="Password" type="password" required />
            {error && <p className="error-msg">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              <GraduationCap size={17} />
              {loading ? 'Please wait...' : 'Login'}
            </button>
          </form>
        )}

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
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => mode === 'login' ? resetToRegister() : resetToLogin()}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700 }}>
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </p>
      </section>
    </main>
  );
}
