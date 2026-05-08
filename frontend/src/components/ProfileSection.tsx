import { useRef, useState } from 'react';
import { Camera, Save } from 'lucide-react';
import { api } from '../api/client';
import type { Profile } from '../pages/Dashboard';

export function ProfileSection({ me, onSave, flash }: { me: Profile | null; onSave: () => void; flash: (m: string, t?: 'success'|'error') => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!me) return <div className="loading">Loading profile...</div>;

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', f);
      await api('/api/profiles/me/avatar', { method: 'POST', body: fd });
      flash('Profile picture updated!');
      onSave();
    } catch (err: any) { flash(err.message, 'error'); }
    finally { setUploading(false); }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, any> = {};
    fd.forEach((v, k) => {
      if (k.endsWith('Year') || k.endsWith('year')) {
        const n = Number(v);
        data[k] = n > 0 ? n : null;
      } else {
        data[k] = v || null;
      }
    });
    try {
      await api('/api/profiles/me', { method: 'PATCH', body: JSON.stringify(data) });
      flash('Profile saved!');
      onSave();
    } catch (err: any) { flash(err.message, 'error'); }
  }

  return (
    <div className="panel">
      <h2 className="panel-title" style={{marginBottom:18}}>Your Profile</h2>
      <div className="avatar-section" style={{marginBottom:20}}>
        <img className="avatar-preview" src={me.media.profilePictureUrl} alt="" />
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Camera size={14}/> {uploading ? 'Uploading...' : 'Change Photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />
          <p style={{fontSize:12,color:'var(--text-muted)',marginTop:6}}>JPG, PNG or GIF. Max 25MB.</p>
        </div>
      </div>
      <form className="profile-grid" onSubmit={save}>
        <div className="field-group">
          <label className="field-label">Full Name</label>
          <input name="fullName" defaultValue={me.fullName} required />
        </div>
        <div className="field-group">
          <label className="field-label">Phone Number</label>
          <input name="phoneNumber" defaultValue={me.phoneNumber ?? ''} placeholder="+254..." />
        </div>
        <div className="field-group">
          <label className="field-label">Bio <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:400}}>(max 50 chars)</span></label>
          <input name="bio" defaultValue={me.bio ?? ''} placeholder="Tell us about yourself..." maxLength={50} />
        </div>
        <div className="field-group">
          <label className="field-label">Email Visibility</label>
          <select name="emailVisibility" defaultValue={me.privacy?.emailVisibility ?? 'PRIVATE'}>
            <option value="PRIVATE">Private</option><option value="PUBLIC">Public</option>
          </select>
        </div>

        <div className="full-width"><hr className="divider" /><h3 style={{fontSize:14,fontWeight:700,marginBottom:8}}>🎓 Education</h3></div>

        <div className="field-group">
          <label className="field-label">Primary School</label>
          <input name="primarySchool" defaultValue={me.education.primarySchool ?? ''} />
        </div>
        <div className="field-group">
          <label className="field-label">Primary Years</label>
          <div style={{display:'flex',gap:6}}>
            <input name="primarySchoolStartYear" type="number" placeholder="Start" defaultValue={me.education.primarySchoolStartYear ?? ''} />
            <input name="primarySchoolEndYear" type="number" placeholder="End" defaultValue={me.education.primarySchoolEndYear ?? ''} />
          </div>
        </div>
        <div className="field-group">
          <label className="field-label">High School</label>
          <input name="highSchool" defaultValue={me.education.highSchool ?? ''} />
        </div>
        <div className="field-group">
          <label className="field-label">High School Years</label>
          <div style={{display:'flex',gap:6}}>
            <input name="highSchoolStartYear" type="number" placeholder="Start" defaultValue={me.education.highSchoolStartYear ?? ''} />
            <input name="highSchoolEndYear" type="number" placeholder="End" defaultValue={me.education.highSchoolEndYear ?? ''} />
          </div>
        </div>
        <div className="field-group">
          <label className="field-label">University / College</label>
          <input name="university" defaultValue={me.education.university ?? ''} />
        </div>
        <div className="field-group">
          <label className="field-label">University Years</label>
          <div style={{display:'flex',gap:6}}>
            <input name="universityStartYear" type="number" placeholder="Start" defaultValue={me.education.universityStartYear ?? ''} />
            <input name="universityEndYear" type="number" placeholder="End" defaultValue={me.education.universityEndYear ?? ''} />
          </div>
        </div>

        <div className="full-width"><hr className="divider" /><h3 style={{fontSize:14,fontWeight:700,marginBottom:8}}>💼 Professional</h3></div>

        <div className="field-group">
          <label className="field-label">Current Job Title</label>
          <input name="currentJob" defaultValue={me.professional.currentJob ?? ''} />
        </div>
        <div className="field-group">
          <label className="field-label">Current Workplace</label>
          <input name="currentWorkplace" defaultValue={me.professional.currentWorkplace ?? ''} />
        </div>
        <div className="field-group full-width">
          <label className="field-label">Work Experience</label>
          <textarea name="workExperience" defaultValue={me.professional.workExperience ?? ''} placeholder="Describe your work experience..." style={{minHeight:70}} />
        </div>

        <div className="full-width"><hr className="divider" /></div>

        <div className="field-group">
          <label className="field-label">Phone Visibility</label>
          <select name="phoneVisibility" defaultValue={me.privacy?.phoneVisibility ?? 'PRIVATE'}>
            <option value="PRIVATE">Private</option><option value="PUBLIC">Public</option>
          </select>
        </div>
        <div className="field-group" />

        <button className="btn btn-primary full-width" style={{marginTop:8}}><Save size={16}/> Save Profile</button>
      </form>
    </div>
  );
}
