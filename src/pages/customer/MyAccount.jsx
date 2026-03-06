import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiPut } from '../../api';
import { useToast } from '../../components/ui/Toast';

export default function MyAccount() {
  const { user, setUser } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleProfileSave = async () => {
    if (!name.trim() || !email.trim()) {
      addToast('Name and email are required', 'error');
      return;
    }
    setProfileSaving(true);
    try {
      const updated = await apiPut('/account/profile', { user_id: user.id, name: name.trim(), email: email.trim() });
      setUser(prev => ({ ...prev, name: updated.name, email: updated.email }));
      addToast('Profile updated', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      addToast('Please fill in all password fields', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    setPasswordSaving(true);
    try {
      await apiPut('/account/password', { user_id: user.id, current_password: currentPassword, new_password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Password changed successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to change password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' };
  const fieldGap = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };

  return (
    <div>
      <div className="page-header">
        <h1>My Account</h1>
        <p>Manage your profile and security settings.</p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Profile Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 400 }}>
          <div style={fieldGap}>
            <label style={labelStyle}>Full Name</label>
            <input className="table-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div style={fieldGap}>
            <label style={labelStyle}>Email Address</label>
            <input className="table-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div style={fieldGap}>
            <label style={labelStyle}>Role</label>
            <input className="table-input" value={user.role} disabled style={{ opacity: 0.6 }} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleProfileSave} disabled={profileSaving}>
          {profileSaving ? 'Saving...' : 'Update Profile'}
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Change Password</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 400 }}>
          <div style={fieldGap}>
            <label style={labelStyle}>Current Password</label>
            <input className="table-input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div style={fieldGap}>
            <label style={labelStyle}>New Password</label>
            <input className="table-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
          </div>
          <div style={fieldGap}>
            <label style={labelStyle}>Confirm New Password</label>
            <input className="table-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handlePasswordChange} disabled={passwordSaving}>
          {passwordSaving ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </div>
  );
}
