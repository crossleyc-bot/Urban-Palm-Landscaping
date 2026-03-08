import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api';
import Spinner from '../components/ui/Spinner';
import './Login.css';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [addressValidation, setAddressValidation] = useState(null); // { valid, formatted, error }
  const [addressValidating, setAddressValidating] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const validateAddress = useCallback(async (value) => {
    if (!value || value.trim().length < 5) {
      setAddressValidation(null);
      return;
    }
    setAddressValidating(true);
    try {
      const result = await apiPost('/validate-address', { street: value });
      if (result.skipped) {
        setAddressValidation(null);
      } else if (result.valid) {
        setAddressValidation({ valid: true, formatted: result.formatted });
      } else {
        setAddressValidation({ valid: false, error: result.error || 'Address not found. Please check and try again.' });
      }
    } catch {
      setAddressValidation(null);
    } finally {
      setAddressValidating(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/portal');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        setError('Please enter a valid 10-digit phone number');
        return;
      }
    }

    if (address && address.trim().length < 5) {
      setError('Please enter a valid street address');
      return;
    }

    if (addressValidation && !addressValidation.valid) {
      setError('Please correct your street address before continuing');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, password, phone, address, sms_opt_in: smsOptIn, email_opt_in: emailOptIn });
      navigate('/portal');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c-1.2 5-4 8-8 10 3.5.5 6.5 0 8-2v12" />
              <path d="M12 3c1.2 5 4 8 8 10-3.5.5-6.5 0-8-2" />
            </svg>
          </span>
          <h1>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
          <p>{mode === 'login' ? 'Sign in to your Urban Palm account' : 'Join Urban Palm to request quotes and track your projects'}</p>
        </div>

        {/* Tabs */}
        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <><Spinner size={16} /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="login-form">
            <div className="form-group">
              <label htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Phone</label>
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(321) 231-2094"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-address">Street Address</label>
              <input
                id="reg-address"
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setAddressValidation(null); }}
                onBlur={(e) => validateAddress(e.target.value)}
                placeholder="123 Main St, Orlando, FL 32801"
              />
              {addressValidating && (
                <span className="address-validating">Validating address...</span>
              )}
              {addressValidation && addressValidation.valid && addressValidation.formatted && addressValidation.formatted !== address && (
                <div className="address-suggestion">
                  <span>USPS suggests: <strong>{addressValidation.formatted}</strong></span>
                  <button type="button" className="address-suggestion-btn" onClick={() => { setAddress(addressValidation.formatted); setAddressValidation({ valid: true }); }}>
                    Use this address
                  </button>
                </div>
              )}
              {addressValidation && addressValidation.valid && (addressValidation.formatted === address || !addressValidation.formatted) && (
                <span className="address-valid">Address verified</span>
              )}
              {addressValidation && !addressValidation.valid && (
                <span className="address-invalid">{addressValidation.error}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
              />
            </div>

            <fieldset className="login-opt-in-group">
              <legend>Communication Preferences</legend>
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                />
                <span>Send me emails about promotions, tips, and updates</span>
              </label>
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={(e) => setSmsOptIn(e.target.checked)}
                />
                <span>Send me text messages about appointments and updates</span>
              </label>
            </fieldset>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <><Spinner size={16} /> Creating account...</> : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
